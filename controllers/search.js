const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Record = require('../models/record');
const asyncHandler = require('../middleware/async-handler');

// Search page
router.get('/', (req, res) => {
    res.render('search/index', {
        title: 'Search Users',
        query: req.query.q || '',
        filter: req.query.filter || 'all'
    });
});

// Search API endpoint
router.get('/api/users', asyncHandler(async (req, res) => {
    const { q, filter = 'all' } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    if (!q) {
        return res.json({
            users: [],
            total: 0,
            page,
            totalPages: 0
        });
    }

    // Build search query
    const searchQuery = {
        $and: [
            // Only show public profiles unless searching user is admin
            { isPublic: req.user.isAdmin ? { $in: [true, false] } : true },
            {
                $or: [
                    // Search by username
                    { username: { $regex: q, $options: 'i' } },
                    // Search by name if provided
                    { name: { $regex: q, $options: 'i' } },
                    // Search by bio if provided
                    { bio: { $regex: q, $options: 'i' } }
                ]
            }
        ]
    };

    // Add filter conditions
    if (filter === 'collectors') {
        searchQuery.recordCount = { $gt: 50 };
    } else if (filter === 'new') {
        searchQuery.createdAt = { 
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
        };
    } else if (filter === 'active') {
        searchQuery.lastActive = { 
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
        };
    }

    // Execute search query with pagination
    const [users, total] = await Promise.all([
        User.find(searchQuery)
            .select('username name avatar bio recordCount isAdmin lastActive createdAt')
            .sort('-recordCount lastActive')
            .skip(skip)
            .limit(limit)
            .lean(),
        User.countDocuments(searchQuery)
    ]);

    // Get recent records for each user
    const usersWithRecords = await Promise.all(users.map(async user => {
        const recentRecords = await Record.find({ owner: user._id })
            .select('title artist imageUrl')
            .sort('-createdAt')
            .limit(3)
            .lean();

        return {
            ...user,
            recentRecords
        };
    }));

    res.json({
        users: usersWithRecords,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    });
}));

// Get user suggestions (for autocomplete)
router.get('/api/users/suggest', asyncHandler(async (req, res) => {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
        return res.json([]);
    }

    const users = await User.find({
        isPublic: true,
        username: { $regex: `^${q}`, $options: 'i' }
    })
    .select('username avatar')
    .limit(5)
    .lean();

    res.json(users);
}));

module.exports = router;
