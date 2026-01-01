const foodPartnerModel = require("../models/foodpartner.model")
const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;


async function authFoodPartnerMiddleware(req, res, next) {
    const token = req.cookies.accessToken;
    if (!token) {
        return next(new AppError("Please login first", 401));
    }
    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        const foodPartner = await foodPartnerModel.findById(decoded.id);
        if (!foodPartner) return next(new AppError("Food partner not found", 401));
        req.foodPartner = foodPartner;
        next();
    } catch (err) {
        return next(new AppError("Invalid token", 401));
    }
}

async function authUserMiddleware(req, res, next) {
    const token = req.cookies.accessToken;
    if (!token) {
        return next(new AppError("Please login first", 401));
    }
    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        const user = await userModel.findById(decoded.id);
        if (!user) return next(new AppError("User not found", 401));
        req.user = user;
        next();
    } catch (err) {
        return next(new AppError("Invalid token", 401));
    }
}

async function authAnyMiddleware(req, res, next) {
    const token = req.cookies.accessToken;
    if (!token) {
        return next(new AppError("Please login first", 401));
    }
    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        const foodPartner = await foodPartnerModel.findById(decoded.id);
        if (foodPartner) {
            req.foodPartner = foodPartner;
            return next();
        }
        const user = await userModel.findById(decoded.id);
        if (user) {
            req.user = user;
            return next();
        }
        return next(new AppError("User not found", 401));
    } catch (err) {
        return next(new AppError("Invalid token", 401));
    }
}


module.exports = {
    authFoodPartnerMiddleware,
    authUserMiddleware,
    authAnyMiddleware
}