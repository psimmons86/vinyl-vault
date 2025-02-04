const express = require('express');
const router = express.Router();
const User = require('../models/user');
const asyncHandler = require('../middleware/async-handler');
const ensureSignedIn = require('../middleware/ensure-signed-in');

// Apply ensureSignedIn middleware to all routes
router.use(ensureSignedIn);

// Toggle profile privacy
router.post('/privacy', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.isPublic = !user.isPublic;
  await user.save();
  res.json({ isPublic: user.isPublic });
}));

// Toggle stats visibility
router.post('/stats', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user.profile) user.profile = {};
  user.profile.showStats = !user.profile.showStats;
  await user.save();
  res.json({ showStats: user.profile.showStats });
}));

// Update theme preference
router.post('/theme', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.profile.theme = req.body.theme;
  await user.save();
  res.json({ theme: user.profile.theme });
}));

module.exports = router;
