const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/async-handler');
const ensureAdmin = require('../middleware/ensure-admin');
const Record = require('../models/record');
const User = require('../models/user');
const Activity = require('../models/activity');

// Apply admin middleware to all routes
router.use(ensureAdmin);

// Root route - redirect to analytics
router.get('/', (req, res) => {
    res.redirect('/admin/analytics');
});

router.get('/analytics', asyncHandler(async (req, res) => {
    const [
        totalUsers,
        totalRecords,
        totalPlays,
        userGrowth,
        recordGrowth,
        topGenres,
        userActivity,
        popularRecords,
        activeUsers,
        recentRecords,
        genreDistribution,
        userStats
    ] = await Promise.all([
        User.countDocuments(),
        Record.countDocuments(),
        Record.aggregate([
            { $group: { _id: null, total: { $sum: '$plays' } } }
        ]),
        // User growth over last 6 months
        User.aggregate([
            {
                $match: {
                    createdAt: { 
                        $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) 
                    }
                }
            },
            {
                $group: {
                    _id: { 
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]),
        // Record growth over last 6 months
        Record.aggregate([
            {
                $match: {
                    createdAt: { 
                        $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) 
                    }
                }
            },
            {
                $group: {
                    _id: { 
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]),
        // Top genres across all users
        Record.aggregate([
            { $unwind: '$tags' },
            { $group: { _id: '$tags', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]),
        // Recent user activity
        Activity.find()
            .populate('user', 'username')
            .sort('-createdAt')
            .limit(20),
        // Most popular records
        Record.aggregate([
            { $sort: { plays: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'owner',
                    foreignField: '_id',
                    as: 'owner'
                }
            },
            { $unwind: '$owner' }
        ]),
        // Most active users (by record count and plays)
        User.aggregate([
            {
                $lookup: {
                    from: 'records',
                    localField: '_id',
                    foreignField: 'owner',
                    as: 'records'
                }
            },
            {
                $project: {
                    username: 1,
                    recordCount: { $size: '$records' },
                    totalPlays: { $sum: '$records.plays' }
                }
            },
            { $sort: { totalPlays: -1 } },
            { $limit: 10 }
        ]),
        // Recently added records
        Record.find()
            .populate('owner', 'username')
            .sort('-createdAt')
            .limit(10),
        // Genre distribution over time (last 6 months)
        Record.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
                    }
                }
            },
            { $unwind: '$tags' },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        genre: '$tags'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]),
        // User engagement stats
        User.aggregate([
            {
                $lookup: {
                    from: 'records',
                    localField: '_id',
                    foreignField: 'owner',
                    as: 'records'
                }
            },
            {
                $group: {
                    _id: null,
                    avgRecordsPerUser: { $avg: { $size: '$records' } },
                    maxRecordsPerUser: { $max: { $size: '$records' } },
                    totalPublicProfiles: {
                        $sum: { $cond: ['$isPublic', 1, 0] }
                    }
                }
            }
        ])
    ]);

    res.render('admin/analytics', {
        title: 'Admin Analytics',
        stats: {
            totalUsers,
            totalRecords,
            totalPlays: totalPlays[0]?.total || 0,
            userGrowth,
            recordGrowth,
            topGenres,
            userActivity,
            popularRecords,
            activeUsers,
            recentRecords,
            genreDistribution,
            userStats: userStats[0] || {
                avgRecordsPerUser: 0,
                maxRecordsPerUser: 0,
                totalPublicProfiles: 0
            }
        }
    });
}));

module.exports = router;
