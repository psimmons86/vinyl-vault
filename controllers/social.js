const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Activity = require('../models/activity');
const asyncHandler = require('../middleware/async-handler');

// Search users
router.get('/search', asyncHandler(async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.render('social/search', {
            title: 'Find Users',
            users: [],
            query: ''
        });
    }

    const users = await User.find({
        $or: [
            { username: { $regex: query, $options: 'i' } },
            { 'profile.name': { $regex: query, $options: 'i' } },
            { 'profile.location': { $regex: query, $options: 'i' } }
        ],
        _id: { $ne: req.user._id }, // Exclude current user
        isPublic: true // Only show public profiles
    })
    .select('username profile.name profile.avatarUrl profile.location')
    .limit(20);

    res.render('social/search', {
        title: 'Search Results',
        users,
        query
    });
}));

// Follow a user
router.post('/follow/:userId', asyncHandler(async (req, res) => {
    const userToFollow = await User.findById(req.params.userId);
    if (!userToFollow || !userToFollow.isPublic) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Add to following
    await User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { following: userToFollow._id } }
    );

    // Add to followers
    await User.findByIdAndUpdate(
        userToFollow._id,
        { $addToSet: { followers: req.user._id } }
    );

    res.json({ success: true });
}));

// Unfollow a user
router.post('/unfollow/:userId', asyncHandler(async (req, res) => {
    // Remove from following
    await User.findByIdAndUpdate(
        req.user._id,
        { $pull: { following: req.params.userId } }
    );

    // Remove from followers
    await User.findByIdAndUpdate(
        req.params.userId,
        { $pull: { followers: req.user._id } }
    );

    res.json({ success: true });
}));

// Create a post
router.post('/post', asyncHandler(async (req, res) => {
    const post = {
        content: req.body.content,
        imageUrl: req.body.imageUrl,
        recordRef: req.body.recordId
    };

    await User.findByIdAndUpdate(
        req.user._id,
        { $push: { posts: post } }
    );

    res.json({ success: true });
}));

// Like a post
router.post('/like/:userId/:postId', asyncHandler(async (req, res) => {
    await User.findOneAndUpdate(
        { 
            _id: req.params.userId,
            'posts._id': req.params.postId
        },
        { $addToSet: { 'posts.$.likes': req.user._id } }
    );

    res.json({ success: true });
}));

// Unlike a post
router.post('/unlike/:userId/:postId', asyncHandler(async (req, res) => {
    await User.findOneAndUpdate(
        { 
            _id: req.params.userId,
            'posts._id': req.params.postId
        },
        { $pull: { 'posts.$.likes': req.user._id } }
    );

    res.json({ success: true });
}));

// Comment on a post
router.post('/comment/:userId/:postId', asyncHandler(async (req, res) => {
    const comment = {
        user: req.user._id,
        content: req.body.content
    };

    await User.findOneAndUpdate(
        { 
            _id: req.params.userId,
            'posts._id': req.params.postId
        },
        { $push: { 'posts.$.comments': comment } }
    );

    res.json({ success: true });
}));

// Get social feed
router.get('/feed', asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .populate('following');

    const followedUsers = user.following.map(u => u._id);
    followedUsers.push(req.user._id); // Include user's own posts

    const feed = await User.aggregate([
        // Match users we're following
        { $match: { _id: { $in: followedUsers } } },
        // Unwind posts array
        { $unwind: { path: '$posts', preserveNullAndEmptyArrays: false } },
        // Add user info to each post
        {
            $addFields: {
                'posts.user': {
                    _id: '$_id',
                    username: '$username',
                    profile: '$profile'
                }
            }
        },
        // Sort by post date
        { $sort: { 'posts.createdAt': -1 } },
        // Limit to recent posts
        { $limit: 50 },
        // Project just the posts
        {
            $project: {
                _id: '$posts._id',
                content: '$posts.content',
                imageUrl: '$posts.imageUrl',
                recordRef: '$posts.recordRef',
                likes: '$posts.likes',
                comments: '$posts.comments',
                createdAt: '$posts.createdAt',
                user: '$posts.user'
            }
        }
    ]);

    // Populate references
    await User.populate(feed, [
        { path: 'recordRef' },
        { path: 'likes', select: 'username profile.name profile.avatarUrl' },
        { path: 'comments.user', select: 'username profile.name profile.avatarUrl' }
    ]);

    res.json(feed);
}));

// Get recent activities
router.get('/activities', asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .populate('following');

    const followedUsers = user.following.map(u => u._id);
    followedUsers.push(req.user._id); // Include user's own activities

    const activities = await Activity.find({
        user: { $in: followedUsers },
        activityType: {
            $in: ['signup', 'update_profile_picture', 'update_location', 'add_record']
        }
    })
    .sort('-createdAt')
    .limit(50)
    .populate('user', 'username profile')
    .populate('record', 'title artist imageUrl');

    res.json(activities);
}));

module.exports = router;
