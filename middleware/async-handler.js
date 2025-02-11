const { AppError } = require('./error-handler');

/**
 * Wraps an async route handler to provide error handling and debugging
 * @param {Function} fn - Async route handler function
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireAuth - Whether the route requires authentication
 * @param {boolean} options.requireAdmin - Whether the route requires admin privileges
 * @returns {Function} Wrapped route handler
 */
module.exports = function asyncHandler(fn, options = {}) {
    return async function(req, res, next) {
        try {
            // Check authentication if required
            if (options.requireAuth && !req.user) {
                throw new AppError('Authentication required', 401);
            }

            // Check admin privileges if required
            if (options.requireAdmin && !req.user?.isAdmin) {
                throw new AppError('Admin privileges required', 403);
            }

            // Track request start time for performance monitoring
            const startTime = process.hrtime();

            // Execute handler
            const result = await Promise.resolve(fn(req, res, next));

            // Calculate request duration
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const duration = seconds * 1000 + nanoseconds / 1000000;

            // Log slow requests (over 1 second)
            if (duration > 1000) {
                console.warn('Slow request:', {
                    method: req.method,
                    url: req.originalUrl,
                    duration: `${duration.toFixed(2)}ms`,
                    user: req.user?._id,
                    query: req.query,
                    body: req.body ? { ...req.body, password: undefined } : undefined
                });
            }

            return result;
        } catch (error) {
            // Convert known errors to AppError
            if (error.name === 'ValidationError') {
                next(new AppError(error.message, 400, { 
                    validationErrors: error.errors 
                }));
            } else if (error.name === 'CastError') {
                next(new AppError('Invalid ID format', 400));
            } else if (error.code === 11000) {
                next(new AppError('Duplicate key error', 400, { 
                    key: Object.keys(error.keyValue)[0] 
                }));
            } else {
                // Log unexpected errors
                console.error('Unexpected error in route handler:', {
                    error: error.message,
                    stack: error.stack,
                    method: req.method,
                    url: req.originalUrl,
                    user: req.user?._id,
                    query: req.query,
                    body: req.body ? { ...req.body, password: undefined } : undefined
                });
                next(error);
            }
        }
    };
};
