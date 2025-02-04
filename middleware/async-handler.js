/**
 * Wraps an async route handler to automatically catch errors
 * and pass them to the error middleware
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler
 */
module.exports = function asyncHandler(fn) {
    return function(req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
