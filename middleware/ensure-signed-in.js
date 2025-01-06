// Middleware for checking if a user is signed in
module.exports = async function (req, res, next) {
  // Check if user exists in req (set by add-user-to-locals-and-req middleware)
  if (req.user) return next();
  // Otherwise redirect to sign in
  res.redirect('/auth/sign-in');
};