const User = require('../models/user');

module.exports = async function (req, res, next) {
    // Get full user document including profile if user is logged in
    req.user = req.session.user ? await User.findById(req.session.user._id) : null;
    res.locals.user = req.user;
    next();
};
