const User = require('../models/user');
const asyncHandler = require('./async-handler');

/**
 * Middleware to add user data to request and locals
 * Performs security checks and optimizes database queries
 */
module.exports = asyncHandler(async (req, res, next) => {
    try {
        if (!req.session.user || !req.session.user._id) {
            req.user = null;
            res.locals.user = null;
            return next();
        }

        // Validate session user ID format
        if (!/^[0-9a-fA-F]{24}$/.test(req.session.user._id)) {
            console.error('Invalid session user ID format');
            req.session.destroy();
            return next();
        }

        // Get user document with only necessary fields
        const user = await User.findById(req.session.user._id)
            .select('username isAdmin profile.name profile.avatarUrl profile.theme notifications lastLoginAt')
            .lean();

        if (!user) {
            console.error(`User not found for session ID: ${req.session.user._id}`);
            req.session.destroy();
            req.user = null;
            res.locals.user = null;
            return next();
        }

        // Check if session needs to be renewed
        const SESSION_RENEW_THRESHOLD = 15 * 60 * 1000; // 15 minutes
        if (req.session.cookie.maxAge < SESSION_RENEW_THRESHOLD) {
            req.session.touch(); // Reset maxAge
        }

        // Add user data to request and locals
        req.user = user;
        res.locals.user = user;
        next();
    } catch (error) {
        console.error('Error in user middleware:', error);
        req.user = null;
        res.locals.user = null;
        next(error);
    }
});
