const mongoose = require('mongoose');
const logger = require('../services/logger.service');

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        logger.info('MongoDB connected successfully', {
            database: mongoose.connection.name,
            host: mongoose.connection.host,
        });
    } catch (err) {
        const AppError = require('../utils/AppError');
        throw new AppError("MongoDB connection error: " + err.message, 500);
    }
}

module.exports = connectDB;