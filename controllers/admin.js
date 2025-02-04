const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/async-handler');
const ensureAdmin = require('../middleware/ensure-admin');
const Record = require('../models/record');
const User = require('../models/user');
const Activity = require('../models/activity');

// Apply admin middleware to all routes
router.use(ensureAdmin);

router.get('/analytics', asyncHandler(async (req, res) => {
    const [
        totalUsers,
        totalRecords,
        totalPlays,
        userGrowth,
        recordGrowth,
        topGenres,
        userActivity,
        popularRecords
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
            popularRecords
        }
    });
}));

module.exports = router;
