// Middleware for checking if a user is signed in
module.exports = function (req, res, next) {
  // If a user is stored in session, allow the request
  if (req.session.user) return next();
  // Otherwise redirect to sign in
  res.redirect('/auth/sign-in');
};