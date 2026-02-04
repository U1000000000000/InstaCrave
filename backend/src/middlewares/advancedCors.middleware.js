// CORS middleware with origin whitelist validation
// Logs rejected origins and supports preflight requests

const AppError = require('../utils/AppError');
const { sendErrorResponse } = require('../utils/response');
const logger = require('../services/logger.service');

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_LOCAL,
    // Add more trusted origins as needed
];

function isOriginAllowed(origin) {
    if (!origin) return false;
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
    corsLogger(req, origin, isAllowed);

    if (isAllowed) {
        res.header('Access-Control-Allow-Origin', origin);
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
