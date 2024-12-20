module.exports = function (req, res, next) {
  if (req.session.user_id) return next();
  res.redirect('/auth/sign-in');
};