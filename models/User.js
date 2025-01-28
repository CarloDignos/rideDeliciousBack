const mongoose = require('mongoose'); // Add this line
const bcrypt = require('bcrypt'); // Make sure bcrypt is also imported
const Address = require('./Address'); // Import Address model

const UserSchema = new mongoose.Schema({
    googleId: { type: String, unique: true, sparse: true },
    username: { type: String, unique: true, sparse: true },
    email: { 
        type: String, 
        unique: true, 
        sparse: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    password: { type: String }, 
    contactNumber: { type: String, unique: true, sparse: true },
    userType: { type: String, enum: ['Admin', 'Rider', 'Customer'], required: true },
    status: { type: String, enum: ['Online', 'Offline'], default: 'Offline' },
    createdBy: { type: String },
    createdAt: { type: Date, default: Date.now },
    modifiedBy: { type: String },
    modifiedAt: { type: Date },
    archived: { type: Boolean, default: false },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    otpResendCount: { type: Number, default: 0 }, 
    failedAttempts: { type: Number, default: 0 }, 
    lockUntil: { type: Date },
    securityQuestions: [
        {
            question: { type: String, required: true },
            answerHash: { type: String, required: true }
        }
    ],
    authToken: { type: String }, 
    picture: { type: String, default: null },
    address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' } // Reference to Address schema
});

// Encrypt the security question answers before saving
UserSchema.pre('save', async function(next) {
    if (this.isModified('securityQuestions')) {
        for (let i = 0; i < this.securityQuestions.length; i++) {
            if (this.securityQuestions[i].answerHash && !this.securityQuestions[i].answerHash.startsWith('$2b$')) {
                this.securityQuestions[i].answerHash = await bcrypt.hash(this.securityQuestions[i].answerHash, 10);
            }
        }
    }
    next();
});

module.exports = mongoose.model('User', UserSchema);
