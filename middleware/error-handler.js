/**
 * Custom error class for application errors
 */
class AppError extends Error {
    constructor(message, statusCode = 500, details = {}) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Log error details to console with additional context
 */
function logError(err, req) {
    const errorLog = {
        message: err.message,
        stack: err.stack,
        timestamp: err.timestamp || new Date().toISOString(),
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userId: req.user?._id,
        statusCode: err.statusCode || 500,
        details: err.details || {},
        headers: req.headers,
        query: req.query,
        body: req.body ? { ...req.body, password: undefined } : undefined // Exclude sensitive data
    };

    console.error('Application Error:', JSON.stringify(errorLog, null, 2));
}

module.exports = {
    AppError,

    notFound: (req, res) => {
        const error = new AppError('Page not found', 404, {
            path: req.originalUrl,
            method: req.method
        });
        logError(error, req);
        
        res.status(404).render('shared/404', {
            title: 'Page Not Found',
            message: "The page you're looking for doesn't exist.",
            path: req.originalUrl
        });
    },

    serverError: (err, req, res, next) => {
        // Log error with context
        logError(err, req);

        // Set default status code if not set
        const statusCode = err.statusCode || 500;
        
        // Prepare error response
        const errorResponse = {
            title: 'Error',
            message: process.env.NODE_ENV === 'production' 
                ? 'Something went wrong!'
                : err.message,
            statusCode
        };

        // Add additional details in development
        if (process.env.NODE_ENV === 'development') {
            errorResponse.stack = err.stack;
            errorResponse.details = err.details;
        }

        // Handle API requests differently
        if (req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(statusCode).json(errorResponse);
        }

        // Render error page for regular requests
        res.status(statusCode).render('shared/error', errorResponse);
    },

    // Helper to wrap async route handlers
    asyncHandler: (fn) => (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    }
};
