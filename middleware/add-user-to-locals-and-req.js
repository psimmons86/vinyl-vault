const User = require('../models/user');

module.exports = async function (req, res, next) {
    // Get full user document including profile if user is logged in
    if (req.session.user) {
        const user = await User.findById(req.session.user._id);
        if (user) {
            // Preserve the session's isAdmin flag
            user.isAdmin = req.session.user.isAdmin;
            req.user = user;
            res.locals.user = user;
        } else {
            req.user = null;
            res.locals.user = null;
        }
    } else {
        req.user = null;
        res.locals.user = null;
    }
    next();
};
