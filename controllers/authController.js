// authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userDal = require('../DAL/userDal');
const addressDal = require('../DAL/addressDal');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// authController.js - Register function
const register = async (req, res) => {
    try {
        const { username, email, password, userType, createdBy, securityQuestions, picture, address } = req.body;

        // Check if the email is already in use
        if (email) {
            const existingUser = await userDal.getUserByEmail(email);
            if (existingUser) {
                return res.status(400).json({ message: 'Email already registered' });
            }
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Hash the security question answers
        const hashedSecurityQuestions = await Promise.all(
            securityQuestions.map(async (question) => ({
                question: question.question,
                answerHash: await bcrypt.hash(question.answerHash, 10), // Hash the answer here
            }))
        );

        // Create the address if provided
        let addressId = null;
        if (address) {
            const createdAddress = await addressDal.createAddress(address); // Save address to DB
            addressId = createdAddress._id; // Get the ID of the created address
        }

        const newUser = {
            username,
            email,
            password: hashedPassword,
            userType,
            createdBy,
            securityQuestions: hashedSecurityQuestions,
            picture, // Add the picture field if provided
            address: addressId, // Associate the user with the address
        };

        const user = await userDal.createUser(newUser);
        res.status(201).json({ message: 'User registered successfully', user });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Error registering user', error: error.message || error });
    }
};


const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userDal.getUserByEmail(email);

        if (!user || user.archived) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        // Fetch the address object if the user has an associated address
        let address = null;
        if (user.address) {
            address = await addressDal.getAddressById(user.address);
        }

        // Generate the token
        const token = jwt.sign(
            { id: user._id, userType: user.userType },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );        

        // Store the token in the user's document (if needed)
        await userDal.updateUser(user._id, { authToken: token });

        // Return user details and token in the response
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                userType: user.userType,
                username: user.username, // Include other user details as needed
                picture: user.picture, // Include the user's profile picture
                address: address || {}, // Include the full address object if available
                status: 'Online',
            },
        });
        console.log(user);
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Error logging in', error });
    }
};


// Function to update user status
const updateStatus = async (req, res) => {
    try {
        const { userId, status } = req.body;

        if (!['Online', 'Offline'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const user = await userDal.updateUserStatus(userId, status);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Status updated successfully', user });
    } catch (error) {
        console.error('Error updating status:', error.message); // Improved error logging
        res.status(500).json({ message: 'Error updating status', error: error.message || error });
    }
};

const logout = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const user = await userDal.getUserById(req.user.id);

        if (user.authToken === token) {
            // Invalidate the token by setting it to null
            await userDal.updateUser(user._id, { authToken: null });
            res.status(200).json({ message: 'Logout successful' });
        } else {
            res.status(401).json({ message: 'Invalid token or already logged out' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error logging out', error });
    }
};

// Middleware to check if the token is blacklisted
const isTokenBlacklisted = (token) => {
    return blacklistedTokens.includes(token);
};

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401); // No token provided
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userDal.getUserById(decoded.id);

        if (!user || user.authToken !== token) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid token', error: err.message });
    }
};


const MAX_OTP_RESENDS = 3; // Limit OTP resend to 3 attempts
const LOCK_TIME = 15 * 60 * 1000; // Lock the user for 15 minutes on exceeding the limit

const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await userDal.getUserByEmail(email);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the user is currently locked
        if (user.lockUntil && user.lockUntil > Date.now()) {
            return res.status(429).json({ message: 'Too many requests. Please try again later.' });
        }

        // Limit the number of OTP resend attempts
        if (user.otpResendCount >= MAX_OTP_RESENDS) {
            user.lockUntil = Date.now() + LOCK_TIME;
            await user.save();
            return res.status(429).json({ message: 'You have exceeded the maximum number of OTP resend attempts. Please try again in 15 minutes.' });
        }

        // Generate a random 6-digit numeric token (OTP)
        const token = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit number
        const expires = Date.now() + 180000; // 3 minutes from now

        // Save the token, expiration, and increment resend count
        user.resetPasswordToken = token;
        user.resetPasswordExpires = expires;
        user.otpResendCount += 1; // Increment OTP resend count
        await user.save();

        // Send the token via email (using Nodemailer)
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Ride Delicious: Your Password Reset Code',
            text: `Hello,

We received a request to reset your password for your Ride Delicious account. To proceed with the password reset, please use the following One-Time Password (OTP):

OTP: ${token}

This code is valid for 3 minutes. If you did not request a password reset, please ignore this email or contact our support team immediately for assistance.

Thank you for choosing Ride Delicious. We’re here to help you enjoy a smooth and delicious experience!

Best regards,
The Ride Delicious Team`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ message: 'Error sending OTP email', error: error.message });
            }
            console.log('Email sent:', info.response);
            res.status(200).json({ message: 'OTP sent successfully' });
        });

    } catch (error) {
        console.error('Error requesting password reset:', error);
        res.status(500).json({ message: 'Error requesting password reset', error });
    }
};

const MAX_FAILED_ATTEMPTS = 5; // Maximum failed attempts allowed

const resetPassword = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        const user = await userDal.getUserByEmail(email);

        if (!user || user.archived) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the user is currently locked
        if (user.lockUntil && user.lockUntil > Date.now()) {
            return res.status(429).json({ message: 'Too many failed attempts. Please try again later.' });
        }

        // Check if the OTP is expired
        if (user.resetPasswordExpires < Date.now()) {
            return res.status(410).json({ message: 'OTP has expired' });
        }

        // Check if the token matches
        if (user.resetPasswordToken !== token) {
            user.failedAttempts += 1;
            await user.save();

            // Lock the user if they exceed the maximum failed attempts
            if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
                user.lockUntil = Date.now() + LOCK_TIME;
                await user.save();
                return res.status(429).json({ message: 'Too many failed attempts. You are temporarily locked out.' });
            }

            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Hash the new password and update it
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined; // Clear the reset token
        user.resetPasswordExpires = undefined;
        user.otpResendCount = 0; // Reset OTP resend count
        user.failedAttempts = 0; // Reset failed attempts
        user.lockUntil = undefined; // Clear the lock time

        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Error resetting password', error });
    }
};


// Set security questions
const setSecurityQuestions = async (req, res) => {
    try {
        const { userId, securityQuestions } = req.body;
        const user = await userDal.setSecurityQuestions(userId, securityQuestions);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Security questions set successfully' });
    } catch (error) {
        console.error('Error setting security questions:', error);
        res.status(500).json({ message: 'Error setting security questions', error });
    }
};

// Account recovery using security questions
const recoverAccountUsingSecurityQuestions = async (req, res) => {
    try {
        const { username, securityAnswers } = req.body;
        const user = await userDal.getUserByUsername(username);

        if (!user || user.archived) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify each security answer
        for (let i = 0; i < securityAnswers.length; i++) {
            const isValid = await userDal.verifySecurityAnswer(user._id, i, securityAnswers[i]);
            if (!isValid) {
                return res.status(401).json({ message: 'Invalid security answer' });
            }
        }

        // If all answers are correct, generate a reset token
        const token = crypto.randomBytes(20).toString('hex');
        const expires = Date.now() + 3600000; // 1 hour

        user.resetPasswordToken = token;
        user.resetPasswordExpires = expires;
        await user.save();

        res.status(200).json({ message: 'Account recovery successful', token });
    } catch (error) {
        console.error('Error recovering account:', error);
        res.status(500).json({ message: 'Error recovering account', error });
    }
};

const updateUserPicture = async (req, res) => {
    try {
        const { userId, picture } = req.body;
        
        const updatedUser = await userDal.updateUser(userId, { picture });
        
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Picture updated successfully', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Error updating picture', error });
    }
};

const updateUserInformation = async (req, res) => {
    try {
        const { userId, updateData } = req.body;
        const loggedInUser = req.user; // User who is making the request

        // Fetch the user to be updated
        const userToUpdate = await userDal.getUserById(userId);

        if (!userToUpdate) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the logged-in user is an Admin
        if (loggedInUser.userType === 'Admin') {
            // Admin can update any user's information
            const updatedUser = await userDal.updateUser(userId, updateData);
            return res.status(200).json({ message: 'User updated successfully', user: updatedUser });
        }

        // Check if the logged-in user is the same as the user being updated
        if (loggedInUser._id.toString() === userId) {
            // Customers and Riders can update their own information
            const updatedUser = await userDal.updateUser(userId, updateData);
            return res.status(200).json({ message: 'User updated successfully', user: updatedUser });
        }

        // If not Admin and not updating their own info, deny the request
        return res.status(403).json({ message: 'Permission denied: You can only update your own information.' });

    } catch (error) {
        console.error('Error updating user information:', error);
        res.status(500).json({ message: 'Error updating user information', error });
    }
};

// Get profile by customer ID
const getProfileByCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        const customer = await userDal.getUserById(customerId);

        if (!customer || customer.userType !== 'Customer') {
            return res.status(404).json({ message: 'Customer not found' });
        }

        res.status(200).json({ message: 'Customer profile retrieved successfully', user: customer });
    } catch (error) {
        console.error('Error retrieving customer profile:', error);
        res.status(500).json({ message: 'Error retrieving customer profile', error });
    }
};

// Get profile by rider ID
const getProfileRider = async (req, res) => {
    try {
        const { riderId } = req.params;
        const rider = await userDal.getUserById(riderId);

        if (!rider || rider.userType !== 'Rider') {
            return res.status(404).json({ message: 'Rider not found' });
        }

        res.status(200).json({ message: 'Rider profile retrieved successfully', user: rider });
    } catch (error) {
        console.error('Error retrieving rider profile:', error);
        res.status(500).json({ message: 'Error retrieving rider profile', error });
    }
};

// Get all customers
const getAllCustomers = async (req, res) => {
    try {
        const customers = await userDal.getAllCustomers(); // Use the DAL method

        if (!customers || customers.length === 0) {
            return res.status(404).json({ message: 'No customers found' });
        }

        res.status(200).json({ message: 'Customers retrieved successfully', users: customers });
    } catch (error) {
        console.error('Error retrieving customers:', error);
        res.status(500).json({ message: 'Error retrieving customers', error });
    }
};

// Get all riders
const getAllRiders = async (req, res) => {
    try {
        const riders = await userDal.getAllRiders(); // Use the DAL method

        if (!riders || riders.length === 0) {
            return res.status(404).json({ message: 'No riders found' });
        }

        res.status(200).json({ message: 'Riders retrieved successfully', users: riders });
    } catch (error) {
        console.error('Error retrieving riders:', error);
        res.status(500).json({ message: 'Error retrieving riders', error });
    }
};

const addAddressToUser = async (req, res) => {
    try {
        const { userId, addressData } = req.body;

        // Create the address
        const address = await addressDal.createAddress(addressData);

        // Link the address to the user
        const updatedUser = await userDal.associateAddressToUser(userId, address._id);

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Address added successfully', user: updatedUser });
    } catch (error) {
        console.error('Error adding address to user:', error);
        res.status(500).json({ message: 'Error adding address to user', error });
    }
};

const validateToken = async (req, res) => {
    const token = req.headers.authorization.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await userDal.getUserById(decoded.id);
  
      if (!user || user.authToken !== token) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
  
      res.status(200).json({ user });
    } catch (error) {
      res.status(403).json({ message: "Token validation failed", error: error.message });
    }
  };

  
module.exports = {
    addAddressToUser,
    register,
    login,
    updateStatus,
    logout,
    authenticateToken,
    requestPasswordReset,
    resetPassword,
    setSecurityQuestions,
    recoverAccountUsingSecurityQuestions,
    updateUserPicture,
    updateUserInformation,
    getProfileByCustomer,
    getProfileRider,
    getAllCustomers,
    getAllRiders,
    validateToken
};
