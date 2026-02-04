const foodPartnerModel = require("../models/foodpartner.model")
const userModel = require("../models/user.model")
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

/**
 * Authentication Middleware
 * 
 * IMPORTANT: All auth middlewares normalize the authenticated entity to req.user
 * for unified access across the application. This prevents undefined access errors
 * in downstream middleware (e.g., cache key generators).
 * 
 * - authFoodPartnerMiddleware: Sets both req.foodPartner and req.user
 * - authUserMiddleware: Sets req.user
 * - authAnyMiddleware: Sets both req.user and req.foodPartner (if applicable)
 * 
 * This normalization ensures all cache key generators can safely access req.user._id
 * without checking which specific property was set.
 */

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
        // Normalize: Also set req.user to foodPartner for unified access
        req.user = foodPartner;
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
        // FIXME: JWT verify runs on every request - should cache decoded tokens for ~30s
        // Currently hitting DB on every auth'd request which is wasteful
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
        const role = decoded?.role;

        // Prefer role-aware lookup (more correct + faster)
        if (role === 'foodPartner') {
            const foodPartner = await foodPartnerModel.findById(decoded.id);
            if (!foodPartner) return next(new AppError("Food partner not found", 401));
            req.foodPartner = foodPartner;
            req.user = foodPartner;
            return next();
        }

        if (role === 'user') {
            const user = await userModel.findById(decoded.id);
            if (!user) return next(new AppError("User not found", 401));
            req.user = user;
            return next();
        }

        // Fallback for legacy tokens without role
        const foodPartner = await foodPartnerModel.findById(decoded.id);
        if (foodPartner) {
            req.foodPartner = foodPartner;
            req.user = foodPartner;
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

/**
 * Optional authentication middleware
 * Populates req.user if token exists, but doesn't fail if missing
 * Used for endpoints that work for both authenticated and anonymous users
 */
async function isOptional(req, res, next) {
    const token = req.cookies.accessToken;
    
    // No token, continue as anonymous
    if (!token) {
        return next();
    }
    
    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        
        // Try food partner first
        const foodPartner = await foodPartnerModel.findById(decoded.id);
        if (foodPartner) {
            req.foodPartner = foodPartner;
            req.user = foodPartner;
            return next();
        }
        
        // Try regular user
        const user = await userModel.findById(decoded.id);
        if (user) {
            req.user = user;
            return next();
        }
        
        // Invalid user ID in token, continue as anonymous
        next();
    } catch (err) {
        // Invalid token, continue as anonymous (fail open for optional auth)
        next();
    }
}

/**
 * Required authentication middleware (alias for authAnyMiddleware)
 * Ensures user is authenticated, fails if not
 */
const isAuthenticated = authAnyMiddleware;

/**
 * Optional authentication middleware (alias for isOptional)
 * Allows both authenticated and anonymous users
 */
const isOptionalAuth = isOptional;

module.exports = {
    authFoodPartnerMiddleware,
    authUserMiddleware,
    authAnyMiddleware,
    isAuthenticated,
    isOptional,
    isOptionalAuth,
}