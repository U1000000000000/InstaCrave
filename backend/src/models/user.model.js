
const mongoose = require('mongoose');

const argon2 = require('argon2');
const audit = require('../services/audit.service');



const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.']
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
},
    {
        timestamps: true
    }
);



/**
 * Hash password before saving (only if modified)
 * Uses env vars: ARGON2_MEMORY_COST, ARGON2_TIME_COST, ARGON2_PARALLELISM
 * Secure defaults: memoryCost=65536, timeCost=4, parallelism=2
 * Tune these in .env for security/performance tradeoff.
 */
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const memoryCost = parseInt(process.env.ARGON2_MEMORY_COST, 10) || 65536;
        const timeCost = parseInt(process.env.ARGON2_TIME_COST, 10) || 4;
        const parallelism = parseInt(process.env.ARGON2_PARALLELISM, 10) || 2;
        this.password = await argon2.hash(this.password, {
            type: argon2.argon2id,
            memoryCost,
            timeCost,
            parallelism,
        });
        // Audit log for password change (only if not new)
        if (!this.isNew && this._id) {
            await audit.logEvent('passwordChange', {
                userId: this._id,
                userType: 'User',
                // IP and userAgent should be passed in context (see controller for details)
            });
        }
        next();
    } catch (err) {
        next(err);
    }
});

// Method to verify password
userSchema.methods.verifyPassword = async function (plainPassword) {
    return await argon2.verify(this.password, plainPassword);
};

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;