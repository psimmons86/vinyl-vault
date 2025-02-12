const asyncHandler = require('./async-handler');

/**
 * Middleware to expose session messages to views
 * Handles both flash messages and session messages
 */
module.exports = asyncHandler(async (req, res, next) => {
    // Add session message to locals if it exists
    if (req.session.message) {
        res.locals.message = req.session.message;
        delete req.session.message;
    }

    // Add flash messages to locals if they exist
    if (req.flash) {
        res.locals.messages = {
            error: req.flash('error'),
            success: req.flash('success')
        };
    }

    next();
});
