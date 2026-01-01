const mongoose = require('mongoose');



function connectDB() {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log("MongoDB connected");
        })
        .catch((err) => {
            // Use AppError for professional error handling
            const AppError = require('../utils/AppError');
            throw new AppError("MongoDB connection error: " + err.message, 500);
        })
}

module.exports = connectDB;