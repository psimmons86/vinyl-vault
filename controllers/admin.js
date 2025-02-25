const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/async-handler');
const ensureAdmin = require('../middleware/ensure-admin');
const Record = require('../models/record');
const User = require('../models/user');
const Activity = require('../models/activity');
const FeaturedRecord = require('../models/featured');
const discogsService = require('../services/discogs');

// Apply admin middleware to all routes
router.use(ensureAdmin);

// Root route - redirect to analytics
router.get('/', (req, res) => {
    res.redirect('/admin/analytics');
});

// Heavy rotation management
router.get('/heavy-rotation', asyncHandler(async (req, res) => {
    const records = await Record.find()
        .populate('owner', 'username')
        .sort('-plays')
        .limit(50);
    
    res.render('admin/heavy-rotation', {
        title: 'Manage Heavy Rotation',
        records,
        searchResults: null,
        searchQuery: ''
    });
}));

// Search Discogs for heavy rotation
router.get('/heavy-rotation/search', asyncHandler(async (req, res) => {
    const query = req.query.q;
    let searchResults = [];
    
    if (query && query.trim().length > 0) {
        searchResults = await discogsService.searchRecords(query);
    }
    
    const records = await Record.find()
        .populate('owner', 'username')
        .sort('-plays')
        .limit(50);
    
    res.render('admin/heavy-rotation', {
        title: 'Manage Heavy Rotation',
        records,
        searchResults,
        searchQuery: query || ''
    });
}));

// Add record from Discogs to heavy rotation
router.post('/heavy-rotation/add-from-discogs', asyncHandler(async (req, res) => {
    const { releaseId } = req.body;
    
    try {
        // Get record details from Discogs
        const recordDetails = await discogsService.getRecordDetails(releaseId);
        
        // Check if record already exists in the database
        let record = await Record.findOne({
            title: recordDetails.title,
            artist: recordDetails.artist
        });
        
        // If record doesn't exist, create it and assign to admin
        if (!record) {
            record = new Record({
                title: recordDetails.title,
                artist: recordDetails.artist,
                year: recordDetails.year,
                format: recordDetails.format,
                imageUrl: recordDetails.imageUrl,
                tags: recordDetails.tags,
                owner: req.user._id,
                plays: 0,
                inHeavyRotation: true
            });
            
            await record.save();
            
            // Create activity for the new record
            const activity = new Activity({
                user: req.user._id,
                type: 'add_record',
                data: {
                    recordId: record._id,
                    recordTitle: record.title,
                    recordArtist: record.artist
                }
            });
            
            await activity.save();
        } else {
            // If record exists, update heavy rotation status
            record.inHeavyRotation = true;
            await record.save();
        }
        
        // Sync with FeaturedRecord
        // Check if record already exists in FeaturedRecord
        let featured = await FeaturedRecord.findOne({
            title: record.title,
            artist: record.artist
        });
        
        // If not, create it
        if (!featured) {
            const count = await FeaturedRecord.countDocuments();
            if (count < 5) {
                // Create new featured record
                featured = new FeaturedRecord({
                    title: record.title,
                    artist: record.artist,
                    albumArt: record.imageUrl,
                    order: count + 1,
                    link: `/records/${record._id}`
                });
                await featured.save();
            }
        }
        
        req.flash('success', `${record.title} added to heavy rotation`);
        res.redirect('/admin/heavy-rotation');
    } catch (error) {
        req.flash('error', `Error adding record: ${error.message}`);
        res.redirect('/admin/heavy-rotation');
    }
}));

router.post('/heavy-rotation/:id', asyncHandler(async (req, res) => {
    const record = await Record.findById(req.params.id);
    if (!record) {
        req.flash('error', 'Record not found');
        return res.redirect('/admin/heavy-rotation');
    }

    record.inHeavyRotation = !record.inHeavyRotation;
    await record.save();

    // Sync with FeaturedRecord
    if (record.inHeavyRotation) {
        // Check if record already exists in FeaturedRecord
        let featured = await FeaturedRecord.findOne({
            title: record.title,
            artist: record.artist
        });
        
        // If not, create it
        if (!featured) {
            // Get current count of featured records
            const count = await FeaturedRecord.countDocuments();
            if (count < 5) {
                // Create new featured record
                featured = new FeaturedRecord({
                    title: record.title,
                    artist: record.artist,
                    albumArt: record.imageUrl,
                    order: count + 1,
                    link: `/records/${record._id}`
                });
                await featured.save();
            }
        }
    } else {
        // Remove from featured records
        await FeaturedRecord.findOneAndDelete({
            title: record.title,
            artist: record.artist
        });
        
        // Reorder remaining featured records
        const remaining = await FeaturedRecord.find().sort('order');
        for (let i = 0; i < remaining.length; i++) {
            remaining[i].order = i + 1;
            await remaining[i].save();
        }
    }

    req.flash('success', `${record.title} ${record.inHeavyRotation ? 'added to' : 'removed from'} heavy rotation`);
    res.redirect('/admin/heavy-rotation');
}));

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
