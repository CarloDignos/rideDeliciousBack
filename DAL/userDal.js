//models/userDal.js
const bcrypt = require('bcrypt');
const Address = require('../models/Address');
const User = require('../models/User');

const createAddress = async (addressData) => {
    const address = new Address(addressData);
    return await address.save();
};

const associateAddressToUser = async (userId, addressId) => {
    return await User.findByIdAndUpdate(userId, { address: addressId }, { new: true });
};

const createUser = async (userData) => {
    const user = new User(userData);
    return await user.save();
};

const getUserByUsername = async (username) => {
    return await User.findOne({ username, archived: false });
};

// Get a user by ID
const getUserById = async (id) => {
    return await User.findById(id);
};

// Get all customers
const getAllCustomers = async () => {
    return await User.find({ userType: 'Customer', archived: false });
};

// Get all riders
const getAllRiders = async () => {
    return await User.find({ userType: 'Rider', archived: false });
};

const updateUser = async (id, updateData) => {
    return await User.findByIdAndUpdate(id, updateData, { new: true });
};

const deleteUser = async (id) => {
    return await User.findByIdAndUpdate(id, { archived: true });
};

const updateUserStatus = async (id, status) => {
    return await User.findByIdAndUpdate(id, { status, modifiedAt: Date.now() }, { new: true });
};

const getUserByEmail = async (email) => {
    return await User.findOne({ email, archived: false });
};

const getUserBycontactNumber = async (contactNumber) => {
  return await User.findOne({ contactNumber, archived: false });
};

const setResetToken = async (email, token, expires) => {
    return await User.findOneAndUpdate(
        { email },
        { resetPasswordToken: token, resetPasswordExpires: expires },
        { new: true }
    );
};

const setSecurityQuestions = async (userId, securityQuestions) => {
    return await User.findByIdAndUpdate(
        userId,
        { securityQuestions },
        { new: true }
    );
};

//Verify security answer function
const verifySecurityAnswer = async (userId, questionIndex, answer) => {
    const user = await User.findById(userId);
    if (!user || !user.securityQuestions[questionIndex]) {
        return false;
    }

    // Compare the plaintext answer with the hashed answer in the database
    return await bcrypt.compare(answer, user.securityQuestions[questionIndex].answerHash);
};




module.exports = {
    createAddress,
    associateAddressToUser,
    createUser,
    getUserByUsername,
    getUserById,
    getAllCustomers,
    getAllRiders,
    updateUser,
    deleteUser,
    updateUserStatus,
    getUserByEmail,
    getUserBycontactNumber,
    setResetToken,
    setSecurityQuestions,
    verifySecurityAnswer
};
