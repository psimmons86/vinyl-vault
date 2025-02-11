const express = require('express');
const router = express.Router();
const Record = require('../models/record');
const User = require('../models/user');
const asyncHandler = require('../middleware/async-handler');

// Home page route
router.get('/', asyncHandler(async (req, res) => {
    // If user is logged in, redirect to their records
    if (req.user) {
        return res.redirect('/records');
    }

    // Get recent public records for homepage carousel
    const recentRecords = await Record.find()
        .populate({
            path: 'owner',               // Get owner details
            match: { isPublic: true },   // Only public profiles
            select: 'username'           // Just get username
        })
        .sort({ createdAt: -1 })        // Newest first
        .limit(12)                       // Get 12 records
        .select('title artist imageUrl createdAt');  // Only needed fields

    // Filter out records where owner is private
    const publicRecords = recentRecords.filter(record => record.owner);

    res.render('home', {
        title: 'Welcome to Vinyl Vault',
        recentRecords: publicRecords
    });
}));

// Public user profile route
router.get('/users/:username', asyncHandler(async (req, res) => {
    // Find public user profile
    const user = await User.findOne({
        username: req.params.username,
        isPublic: true
    })
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

    if (!user) return res.redirect('/');

    // Get collection stats
    const records = await Record.find({ owner: user._id })
        .select('tags year plays');  // Only select fields we need for stats
    
    const totalRecords = records.length;
    const totalPlays = records.reduce((sum, record) => sum + (record.plays || 0), 0);
    
    // Calculate genre distribution from tags
    const genreDistribution = records.reduce((acc, record) => {
        if (record.tags && record.tags.length > 0) {
            record.tags.forEach(tag => {
                acc[tag] = (acc[tag] || 0) + 1;
            });
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

    // Get recently added and played records
    const [recentlyAdded, recentlyPlayed] = await Promise.all([
        Record.find({ owner: user._id })
            .select('title artist imageUrl createdAt')
            .sort({ createdAt: -1 })
            .limit(5),
        Record.find({
            owner: user._id,
            lastPlayed: { $exists: true, $ne: null }
        })
            .select('title artist imageUrl lastPlayed')
            .sort({ lastPlayed: -1 })
            .limit(5)
    ]);

    // Get featured post (most liked)
    const featuredPost = user.posts.length > 0 ? 
        user.posts.reduce((prev, current) => 
            (current.likes?.length || 0) > (prev.likes?.length || 0) ? current : prev
        ) : null;

    res.render('users/profile', {
        title: `${user.username}'s Profile`,
        user: user,
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

module.exports = router;
