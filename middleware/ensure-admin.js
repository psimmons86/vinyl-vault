const asyncHandler = require('./async-handler');

module.exports = asyncHandler(async (req, res, next) => {
    if (!req.user?.isAdmin) {
        return res.status(403).render('shared/error', {
            title: 'Access Denied',
            message: 'You do not have permission to access this page.'
        });
    }
    next();
});
