// CORS middleware for InstaCrave
// Validates origin against whitelist, handles preflight requests

const AppError = require('../utils/AppError');
const { sendErrorResponse } = require('../utils/response');
const logger = require('../services/logger.service');

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_LOCAL,
    // Add more trusted origins as needed
].filter(Boolean).map(origin => origin.trim()); // Remove undefined/null and trim whitespace

// Log allowed origins on startup
console.log('🔒 CORS Configuration:', {
    allowedOrigins,
    FRONTEND_URL: process.env.FRONTEND_URL,
    FRONTEND_URL_LOCAL: process.env.FRONTEND_URL_LOCAL,
    NODE_ENV: process.env.NODE_ENV
});
logger.info('CORS allowed origins:', { allowedOrigins });

function isOriginAllowed(origin) {
    if (!origin) return true; // Allow requests without origin (e.g., same-origin, curl, postman)
    return allowedOrigins.some((allowed) => {
        if (!allowed) return false;
        // Support wildcards (e.g., https://*.trusted.com)
        if (allowed.includes('*')) {
            const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
            return regex.test(origin);
        }
        return allowed === origin;
    });
}

function corsLogger(req, origin, result) {
    // Log CORS decisions for auditing (could be extended to use Winston, Sentry, etc.)
    if (process.env.NODE_ENV !== 'test') {
        // Only log in non-test environments
        logger.debug('CORS request', {
            method: req.method,
            url: req.originalUrl,
            origin,
            allowed: result,
        });
    }
}

const advancedCors = (req, res, next) => {
    const origin = req.headers.origin;
    const isAllowed = isOriginAllowed(origin);
    
    // Log every CORS check in production
    if (process.env.NODE_ENV === 'production') {
        console.log('🌐 CORS Check:', {
            method: req.method,
            url: req.url,
            origin,
            isAllowed,
            allowedOrigins
        });
    }
    
    corsLogger(req, origin, isAllowed);

    if (isAllowed) {
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Vary', 'Origin');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-csrf-token');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        if (isAllowed) {
            return res.sendStatus(204); // No Content
        } else {
            // Use centralized error/response for forbidden preflight
            return sendErrorResponse(res, {
                message: 'CORS Forbidden: Origin not allowed.',
                status: 403,
                details: [new AppError('CORS Forbidden: Origin not allowed.', 403, 'CORS_FORBIDDEN')]
            });
        }
    }

    if (!isAllowed && origin) {
        // Use centralized error/response for forbidden non-preflight
        return sendErrorResponse(res, {
            message: 'CORS Forbidden: Origin not allowed.',
            status: 403,
            details: [new AppError('CORS Forbidden: Origin not allowed.', 403, 'CORS_FORBIDDEN')]
        });
    }

    next();
};

module.exports = advancedCors;
