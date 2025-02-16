const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Record = require('../models/record');
const Activity = require('../models/activity');
const asyncHandler = require('../middleware/async-handler');
const ensureSignedIn = require('../middleware/ensure-signed-in');

// Apply ensureSignedIn middleware to all routes
router.use(ensureSignedIn);

// Get profile data
router.get('/:username', asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username })
    .populate('following')
    .populate('followers')
    .populate('profile.top8Records')
    .populate({
      path: 'posts',
      populate: [
        { path: 'recordRef' },
        { path: 'likes' },
        { 
          path: 'comments',
          populate: { path: 'user' }
        }
      ],
      options: { sort: { createdAt: -1 } }
    });

  if (!user) {
    return res.status(404).render('shared/404');
  }

  // If profile is private and viewer is not the owner
  if (!user.isPublic && (!req.user || req.user._id.toString() !== user._id.toString())) {
    return res.status(403).render('shared/error', {
      message: 'This profile is private'
    });
  }

  // Get collection stats
  const records = await Record.find({ user: user._id });
  const totalRecords = records.length;
  const totalPlays = records.reduce((sum, record) => sum + (record.plays || 0), 0);
  
  // Calculate genre distribution
  const genreDistribution = records.reduce((acc, record) => {
    if (record.genre) {
      acc[record.genre] = (acc[record.genre] || 0) + 1;
    }
    return acc;
  }, {});

  // Get decade distribution
  const decadeDistribution = records.reduce((acc, record) => {
    if (record.year) {
      const decade = Math.floor(record.year / 10) * 10;
      acc[decade + 's'] = (acc[decade + 's'] || 0) + 1;
    }
    return acc;
  }, {});

  // Get recently added records
  const recentlyAdded = await Record.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(5);

  // Get recently played records
  const recentlyPlayed = await Record.find({ 
    user: user._id,
    lastPlayed: { $exists: true }
  })
    .sort({ lastPlayed: -1 })
    .limit(5);

  // Get featured post (most liked)
  const featuredPost = user.posts.length > 0 ? 
    user.posts.reduce((prev, current) => 
      (current.likes?.length || 0) > (prev.likes?.length || 0) ? current : prev
    ) : null;

  res.render('records/profile', {
    user,
    currentUser: req.user,
    totalRecords,
    totalPlays,
    genreDistribution,
    decadeDistribution,
    recentlyAdded,
    recentlyPlayed,
    featuredPost
  });
}));

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

// Update profile picture
router.post('/avatar', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user.profile) user.profile = {};
  user.profile.avatarUrl = req.body.avatarUrl;
  await user.save();

  // Create activity
  await Activity.create({
    user: user._id,
    activityType: 'update_profile_picture',
    details: {
      imageUrl: req.body.avatarUrl
    }
  });

  res.json({ avatarUrl: user.profile.avatarUrl });
}));

// Update location
router.post('/location', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user.profile) user.profile = {};
  user.profile.location = req.body.location;
  await user.save();

  // Create activity
  await Activity.create({
    user: user._id,
    activityType: 'update_location',
    details: {
      location: req.body.location
    }
  });

  res.json({ location: user.profile.location });
}));

module.exports = router;
