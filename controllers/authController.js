// authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userDal = require('../DAL/userDal');
const addressDal = require('../DAL/addressDal');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const upload = require('../middlewares/upload');
const path = require('path');
// authController.js - Register function
const register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      contactNumber,
      userType,
      createdBy,
      securityQuestions, // This might be undefined
      address,
    } = req.body;

    // Check if the email is already in use
    if (email) {
      const existingUser = await userDal.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }
    }

    if (contactNumber) {
      const existingUserContactNumber = await userDal.getUserBycontactNumber(
        contactNumber,
      );
      if (existingUserContactNumber) {
        return res
          .status(400)
          .json({ message: 'Contact number already registered' });
      }
    }

    // Process picture if provided
    const picture = req.file ? req.file.path : null;
    const picturePath = req.file ? req.file.path.replace(/\\/g, '/') : null;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Ensure securityQuestions is an array (default to empty array if undefined)
    const securityQuestionsArray = Array.isArray(securityQuestions)
      ? securityQuestions
      : [];

    // Hash the security question answers
    const hashedSecurityQuestions = await Promise.all(
      securityQuestionsArray.map(async (question) => ({
        question: question.question,
        answerHash: await bcrypt.hash(question.answerHash, 10),
      })),
    );

    // Create the address if provided
    let addressId = null;
    if (address) {
      const createdAddress = await addressDal.createAddress(address);
      addressId = createdAddress._id;
    }

    const newUser = {
      username,
      email,
      password: hashedPassword,
      contactNumber,
      userType,
      createdBy,
      securityQuestions: hashedSecurityQuestions,
      picture: picturePath,
      address: addressId,
    };

    const user = await userDal.createUser(newUser);
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      message: 'Error registering user',
      error: error.message || error,
    });
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
      { expiresIn: '168h' },
    );

    // Store the token in the user's document (if needed)
    await userDal.updateUser(user._id, { authToken: token, status: 'Online' });

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
    res
      .status(500)
      .json({
        message: 'Error updating status',
        error: error.message || error,
      });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const user = await userDal.getUserById(req.user.id);

    if (user.authToken === token) {
      // Invalidate the token by setting it to null and update status to "Offline"
      await userDal.updateUser(user._id, {
        authToken: null,
        status: 'Offline',
      });
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
    return res
      .status(403)
      .json({ message: 'Invalid token', error: err.message });
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
      return res
        .status(429)
        .json({ message: 'Too many requests. Please try again later.' });
    }

    // Limit the number of OTP resend attempts
    if (user.otpResendCount >= MAX_OTP_RESENDS) {
      user.lockUntil = Date.now() + LOCK_TIME;
      await user.save();
      return res
        .status(429)
        .json({
          message:
            'You have exceeded the maximum number of OTP resend attempts. Please try again in 15 minutes.',
        });
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
        pass: process.env.EMAIL_PASS,
      },
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
The Ride Delicious Team`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res
          .status(500)
          .json({ message: 'Error sending OTP email', error: error.message });
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
      return res
        .status(429)
        .json({ message: 'Too many failed attempts. Please try again later.' });
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
        return res
          .status(429)
          .json({
            message:
              'Too many failed attempts. You are temporarily locked out.',
          });
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
    res
      .status(500)
      .json({ message: 'Error setting security questions', error });
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
      const isValid = await userDal.verifySecurityAnswer(
        user._id,
        i,
        securityAnswers[i],
      );
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
    // Use the userId from the token or the body
    const userId = req.user?.id || req.body.userId;

    // Ensure a file is provided
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Compute the picture path (if your client needs the full URL, adjust accordingly)
    const rawPath = req.file.path.replace(/\\/g, '/');
    const picturePath = rawPath.startsWith('http') ? rawPath : rawPath; // If you need to prepend a base URL, do it here.

    console.log('Updating picture for user', userId, 'with path:', picturePath);

    // Update the user record with the new picture path.
    const updatedUser = await userDal.updateUser(userId, {
      picture: picturePath,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Picture updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating picture:', error);
    res.status(500).json({ message: 'Error updating picture', error });
  }
};



const updateUserInformation = async (req, res) => {
  try {
    const { userId, updateData } = req.body;
    const loggedInUser = req.user;

    if (!loggedInUser || !loggedInUser.id) {
      return res
        .status(401)
        .json({ message: 'Unauthorized: User not authenticated' });
    }

    const userToUpdate = await userDal.getUserById(userId);
    if (!userToUpdate) {
      return res
        .status(404)
        .json({ message: 'User not found with the provided ID' });
    }

    // Only allow updates if the target user is a Rider
    if (userToUpdate.userType !== 'Rider') {
      return res.status(403).json({
        message: 'Only rider accounts can be edited via this endpoint.',
      });
    }

    // If updateData includes a password, hash it first (using the same salt rounds as registration)
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Check permissions (if admin or updating own account)
    if (
      loggedInUser.userType === 'Admin' ||
      loggedInUser.id.toString() === userId
    ) {
      const updatedUser = await userDal.updateUser(userId, updateData);
      return res
        .status(200)
        .json({ message: 'User updated successfully', user: updatedUser });
    }
    return res.status(403).json({ message: 'Permission denied' });
  } catch (error) {
    console.error('Error updating user information:', error);
    return res.status(500).json({ message: 'Internal server error', error });
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

    res
      .status(200)
      .json({
        message: 'Customer profile retrieved successfully',
        user: customer,
      });
  } catch (error) {
    console.error('Error retrieving customer profile:', error);
    res
      .status(500)
      .json({ message: 'Error retrieving customer profile', error });
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

    res
      .status(200)
      .json({ message: 'Rider profile retrieved successfully', user: rider });
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

    res
      .status(200)
      .json({ message: 'Customers retrieved successfully', users: customers });
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

    res
      .status(200)
      .json({ message: 'Riders retrieved successfully', users: riders });
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
    const updatedUser = await userDal.associateAddressToUser(
      userId,
      address._id,
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res
      .status(200)
      .json({ message: 'Address added successfully', user: updatedUser });
  } catch (error) {
    console.error('Error adding address to user:', error);
    res.status(500).json({ message: 'Error adding address to user', error });
  }
};

const validateToken = async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userDal.getUserById(decoded.id);

    if (!user || user.authToken !== token) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    res.status(200).json({ user });
  } catch (error) {
    res
      .status(403)
      .json({ message: 'Token validation failed', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params; // Get user ID from URL parameter

    // Check if the user exists
    const user = await userDal.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Soft delete the user (archive instead of deleting permanently)
    await userDal.deleteUser(userId);

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
  }
};

// Add permanent deletion function if needed
const permanentlyDeleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await userDal.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await userDal.permanentlyDeleteUser(userId);

    res.status(200).json({ message: 'User permanently deleted' });
  } catch (error) {
    console.error('Error permanently deleting user:', error);
    res
      .status(500)
      .json({ message: 'Internal server error', error: error.message });
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
  validateToken,
  deleteUser,
  permanentlyDeleteUser,
};
