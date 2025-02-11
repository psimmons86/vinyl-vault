const asyncHandler = require('./async-handler');
const { AppError } = require('./error-handler');

/**
 * Middleware to ensure user has admin privileges
 * Includes additional security checks and logging
 */
module.exports = asyncHandler(async (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
        throw new AppError('Authentication required', 401);
    }

    // Check if user exists in database (in case of stale session)
    const User = require('../models/user');
    const user = await User.findById(req.user._id)
        .select('isAdmin accountLocked lastPasswordChange')
        .lean();

    if (!user) {
        // Clear invalid session
        req.session.destroy();
        throw new AppError('Invalid session', 401);
    }

    // Check if account is locked
    if (user.accountLocked) {
        throw new AppError('Account is locked', 403);
    }

    // Check if password was recently changed (session invalidation)
    const sessionStart = new Date(req.session.createdAt || Date.now());
    if (user.lastPasswordChange && user.lastPasswordChange > sessionStart) {
        req.session.destroy();
        throw new AppError('Session expired due to password change', 401);
    }

    // Check admin status
    if (!user.isAdmin) {
        // Log unauthorized admin access attempts
        console.warn('Unauthorized admin access attempt:', {
            userId: req.user._id,
            username: req.user.username,
            path: req.originalUrl,
            method: req.method,
            ip: req.ip
        });

        throw new AppError('Admin privileges required', 403);
    }

    // Add admin check timestamp
    req.adminCheckTime = Date.now();
    next();
}, { requireAuth: true }); // Use asyncHandler options for initial auth check
