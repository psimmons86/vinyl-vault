const express = require('express');
const router = express.Router();
const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');
const Record = require('../models/record');
const User = require('../models/user');
const Activity = require('../models/activity');
const Comment = require('../models/comment');
const { getMusicNews } = require('../services/newsapi');
const discogs = require('../services/discogs');
const upload = require('../config/uploads');
const asyncHandler = require('../middleware/async-handler');
const axios = require('axios');

// Configure multer for album art uploads
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = /jpeg|jpg|png|gif/;

const albumArtStorage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const uploadDir = 'public/uploads/records';
        try {
            await fs.access(uploadDir);
        } catch {
            await fs.mkdir(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `album-${uniqueSuffix}${ext}`);
    }
});

const albumArtUpload = multer({ 
    storage: albumArtStorage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const extname = ALLOWED_TYPES.test(path.extname(file.originalname).toLowerCase());
        const mimetype = ALLOWED_TYPES.test(file.mimetype);
        
        if (!extname || !mimetype) {
            return cb(new Error('Only JPG, PNG and GIF files are allowed'));
        }

        if (file.size > MAX_FILE_SIZE) {
            return cb(new Error('File size cannot exceed 5MB'));
        }

        cb(null, true);
    }
}).single('albumArt');

// Utility function to validate record ownership
const validateOwnership = async (recordId, userId, isAdmin = false) => {
    const record = await Record.findById(recordId);
    if (!record || (!isAdmin && record.owner.toString() !== userId.toString())) {
        throw new Error('Record not found or unauthorized');
    }
    return record;
};

// File cleanup utility
async function cleanupFiles(files) {
    try {
        if (!files) return;
        for (const fileArray of Object.values(files)) {
            for (const file of fileArray) {
                await fs.unlink(file.path);
            }
        }
    } catch (err) {
        console.error('Error cleaning up files:', err);
    }
}

// Get all records for the logged-in user
// Get all records for the logged-in user
// Get all records (HTML or JSON)
router.get('/', asyncHandler(async (req, res) => {
    const query = { owner: req.user._id };
    const page = parseInt(req.query.page) || 1;
    const limit = 50; // Number of records per page
    const skip = (page - 1) * limit;
    
    // Add tag filter if provided
    if (req.query.tag) {
        query.tags = req.query.tag;
    }

    // Add search filter if provided
    if (req.query.search) {
        query.$or = [
            { title: new RegExp(req.query.search, 'i') },
            { artist: new RegExp(req.query.search, 'i') }
        ];
    }

    // Determine sort order
    const sortOptions = {
        artist: { artist: 1, title: 1 },
        title: { title: 1 },
        recent: { createdAt: -1 },
        plays: { plays: -1, artist: 1 }
    };
    const sort = sortOptions[req.query.sort] || sortOptions.recent;

    // Execute queries in parallel
    const [records, total, tags, totalPlays, genres, artists] = await Promise.all([
        Record.find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select('title artist artwork imageUrl year plays tags createdAt')
            .lean(),
        Record.countDocuments(query),
        Record.distinct('tags', { owner: req.user._id }),
        Record.aggregate([
            { $match: { owner: req.user._id } },
            { $group: { _id: null, total: { $sum: '$plays' } } }
        ]),
        Record.distinct('genre', { owner: req.user._id }),
        Record.distinct('artist', { owner: req.user._id })
    ]);

    // Return JSON if requested
    if (req.headers.accept?.includes('application/json')) {
        return res.json({
            records,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    }
    
    // Otherwise render HTML
    res.render('records/index', {
        records,
        title: 'My Records',
        currentSort: req.query.sort || 'recent',
        currentTag: req.query.tag,
        currentSearch: req.query.search,
        tags,
        view: req.query.view || 'grid',
        totalPlays: totalPlays[0]?.total || 0,
        recordCount: total,
        genreCount: genres.length,
        artistCount: artists.length,
        genres,
        pagination: {
            page,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
        }
    });
}));

router.get('/profile', asyncHandler(async (req, res) => {
    const [
        totalRecords,
        totalPlays,
        recentlyAdded,
        recentlyPlayed,
        user,
        records
    ] = await Promise.all([
        Record.countDocuments({ owner: req.user._id }),
        
        Record.aggregate([
            { $match: { owner: req.user._id } },
            { $group: { _id: null, total: { $sum: '$plays' } } }
        ]),
        
        Record.find({ owner: req.user._id })
            .sort('-createdAt')
            .limit(5),
            
        Record.find({ 
            owner: req.user._id, 
            lastPlayed: { $exists: true, $ne: null } 
        })
            .sort('-lastPlayed')
            .limit(5),
        
        // Fetch user with populated references
        User.findById(req.user._id)
            .populate('profile.top8Records')
            .populate({
                path: 'posts',
                populate: [
                    { path: 'recordRef' },
                    { path: 'likes' },
                    { path: 'comments' }
                ]
            }),

        // Fetch all records for stats
        Record.find({ owner: req.user._id })
    ]);

    // Calculate genre distribution
    const genreDistribution = records.reduce((acc, record) => {
        if (record.genre) {
            acc[record.genre] = (acc[record.genre] || 0) + 1;
        }
        return acc;
    }, {});

    // Calculate decade distribution
    const decadeDistribution = records.reduce((acc, record) => {
        if (record.year) {
            const decade = Math.floor(record.year / 10) * 10;
            acc[decade + 's'] = (acc[decade + 's'] || 0) + 1;
        }
        return acc;
    }, {});

    // Get featured post (most liked)
    const featuredPost = user.posts?.length > 0 ? 
        user.posts.reduce((prev, current) => 
            (current.likes?.length || 0) > (prev.likes?.length || 0) ? current : prev
        ) : null;

    res.render('records/profile', {
        title: 'My Profile',
        totalRecords,
        totalPlays: totalPlays[0]?.total || 0,
        recentlyAdded,
        recentlyPlayed,
        top8Records: user.profile?.top8Records || [],
        user: user,
        currentUser: req.user,
        genreDistribution,
        decadeDistribution,
        featuredPost
    });
}));

router.post('/settings', upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 }
]), asyncHandler(async (req, res) => {
    // Get current user data
    const currentUser = await User.findById(req.user._id);
    
    const updateData = {
        isPublic: !!req.body.isPublic,
        profile: {
            ...currentUser.profile,
            name: req.body.name,
            bio: req.body.bio,
            location: req.body.location,
            favoriteGenres: req.body.favoriteGenres?.split(',').map(genre => genre.trim()) || [],
            socialLinks: {
                discogs: req.body.discogsLink,
                instagram: req.body.instagramLink,
                twitter: req.body.twitterLink
            },
            theme: req.body.darkMode === 'on' ? 'dark' : 'light',
            showStats: !!req.body.showStats
        }
    };

    // Handle file uploads
    if (req.files) {
        if (req.files.profilePicture && req.files.profilePicture[0]) {
            updateData.profile.avatarUrl = '/uploads/profile/' + req.files.profilePicture[0].filename;
            // Delete old profile picture if it exists
            if (currentUser.profile?.avatarUrl && !currentUser.profile.avatarUrl.includes('default-avatar')) {
                const oldPath = 'public' + currentUser.profile.avatarUrl;
                try {
                    await fs.unlink(oldPath);
                } catch (err) {
                    console.error('Error deleting old profile picture:', err);
                }
            }
        }
        if (req.files.bannerImage && req.files.bannerImage[0]) {
            updateData.profile.bannerUrl = '/uploads/banner/' + req.files.bannerImage[0].filename;
            // Delete old banner if it exists
            if (currentUser.profile?.bannerUrl && !currentUser.profile.bannerUrl.includes('default-banner')) {
                const oldPath = 'public' + currentUser.profile.bannerUrl;
                try {
                    await fs.unlink(oldPath);
                } catch (err) {
                    console.error('Error deleting old banner:', err);
                }
            }
        }
    }

    // Preserve existing profile data that wasn't included in the form
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id, 
        { 
            $set: {
                isPublic: !!req.body.isPublic,
                'profile.name': req.body.name,
                'profile.bio': req.body.bio,
                'profile.location': req.body.location,
                'profile.favoriteGenres': req.body.favoriteGenres?.split(',').map(genre => genre.trim()) || [],
                'profile.socialLinks.discogs': req.body.discogsLink,
                'profile.socialLinks.instagram': req.body.instagramLink,
                'profile.socialLinks.twitter': req.body.twitterLink,
                'profile.theme': req.body.darkMode === 'on' ? 'dark' : 'light',
                'profile.showStats': !!req.body.showStats
            },
            ...req.files?.profilePicture ? { 'profile.avatarUrl': updateData.profile.avatarUrl } : {},
            ...req.files?.bannerImage ? { 'profile.bannerUrl': updateData.profile.bannerUrl } : {}
        },
        { new: true }
    );
    
    req.session.message = { type: 'success', text: 'Profile updated successfully!' };
    res.redirect('/records/settings');
}));

// Get feed items with pagination
router.get('/feed', asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const activities = await Activity.find()
        .populate('user', 'username profile.name profile.avatarUrl')
        .populate('record')
        .populate('targetUser', 'username profile.name')
        .populate('comment')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit);

    res.json(activities);
}));

// Get music news
router.get('/news', asyncHandler(async (req, res) => {
    const genre = req.query.genre || '';
    const news = await getMusicNews(genre);
    res.json(news || []); // Ensure we always return an array
}));

// Add comment
router.post('/comments', asyncHandler(async (req, res) => {
    const comment = await Comment.create({
        user: req.user._id,
        content: req.body.content,
        target: req.body.target,
        targetType: req.body.targetType
    });

    // Create activity for comment
    await Activity.create({
        user: req.user._id,
        activityType: 'comment',
        comment: comment._id
    });

    res.json(comment);
}));

// Get comments for a target
router.get('/comments/:target', asyncHandler(async (req, res) => {
    const comments = await Comment.find({ target: req.params.target })
        .populate('user', 'username profile.name profile.avatarUrl')
        .sort('-createdAt');
    res.json(comments);
}));

// Import Discogs collection
router.post('/import-discogs', asyncHandler(async (req, res) => {
    const { username } = req.body;
    if (!username) {
        req.session.message = { type: 'error', text: 'Discogs username is required' };
        return res.redirect('/records/settings');
    }

    try {
        // Get first page of collection
        const records = await discogs.getUserCollection(username);
        
        // Create all records
        const createdRecords = await Promise.all(
            records.map(record => Record.create({
                ...record,
                owner: req.user._id
            }))
        );

        // Create activity for import
        await Activity.create({
            user: req.user._id,
            activityType: 'add_record',
            details: { 
                action: 'import',
                source: 'Discogs',
                count: createdRecords.length
            }
        });

        req.session.message = { 
            type: 'success', 
            text: `Successfully imported ${createdRecords.length} records from your Discogs collection!` 
        };
    } catch (error) {
        console.error('Discogs import error:', error);
        req.session.message = { 
            type: 'error', 
            text: 'Failed to import collection. Please check your Discogs username and try again.' 
        };
    }
    
    res.redirect('/records/settings');
}));

// Get collection statistics
router.get('/stats', asyncHandler(async (req, res) => {
        // Get various stats about the collection
        const [
            totalRecords,
            mostPlayed,
            totalPlays,
            topArtists,
            topTags,
            recordsByYear,
            topPlayedArtists,
            collectionValue,
            mostValuableRecords,
            topPlayedRecords,
            recentlyPlayedRecords
        ] = await Promise.all([
            // Keep existing queries...
            Record.countDocuments({ owner: req.user._id }),
            Record.findOne({ owner: req.user._id }).sort('-plays').limit(1),
            Record.aggregate([
                { $match: { owner: req.user._id } },
                { $group: { _id: null, total: { $sum: '$plays' } } }
            ]),
            Record.aggregate([
                { $match: { owner: req.user._id } },
                { $group: { _id: '$artist', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            Record.aggregate([
                { $match: { owner: req.user._id, tags: { $exists: true, $ne: [] } } },
                { $unwind: '$tags' },
                { $group: { _id: '$tags', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]),
            Record.aggregate([
                { $match: { owner: req.user._id, year: { $exists: true, $ne: null } } },
                { $group: { _id: '$year', count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]),
            Record.aggregate([
                { $match: { owner: req.user._id, plays: { $gt: 0 } } },
                { $group: { 
                    _id: '$artist',
                    totalPlays: { $sum: '$plays' },
                    recordCount: { $sum: 1 }
                }},
                { $sort: { totalPlays: -1 } },
                { $limit: 10 }
            ]),
            Record.aggregate([
                { $match: { owner: req.user._id } },
                { $group: { _id: null, total: { $sum: '$value' } } }
            ]),
            Record.find({ owner: req.user._id })
                .sort('-value')
                .limit(5),
            // Get top 10 most played records with full details
            Record.find({ owner: req.user._id, plays: { $gt: 0 } })
                .sort('-plays')
                .limit(10)
                .select('title artist plays imageUrl _id'),
            // Get last 10 played records with full details
            Record.find({ 
                owner: req.user._id, 
                lastPlayed: { $exists: true, $ne: null } 
            })
                .sort('-lastPlayed')
                .limit(10)
                .select('title artist lastPlayed imageUrl _id')
        ]);

        // Process recordsByYear into decades
        const decades = recordsByYear.reduce((acc, year) => {
            const decade = Math.floor(year._id / 10) * 10;
            acc[decade] = (acc[decade] || 0) + year.count;
            return acc;
        }, {});

        // Sort decades by year descending
        const decadeStats = Object.entries(decades)
            .sort((a, b) => b[0] - a[0])
            .map(([decade, count]) => ({
                decade: `${decade}s`,
                count
            }));

        res.render('records/stats', {
            title: 'Collection Stats',
            totalRecords,
            mostPlayed,
            totalPlays: totalPlays[0]?.total || 0,
            topArtists,
            topTags,
            decadeStats,
            topPlayedArtists,
            collectionValue: collectionValue[0]?.total || 0,
            mostValuableRecords,
            topPlayedRecords,
            recentlyPlayedRecords,
            user: req.user
        });
}));

// Discogs search page
router.get('/discogs', asyncHandler(async (req, res) => {
    res.render('records/search', {
        title: 'Search Discogs',
        results: [],
        query: '',
        error: null
    });
}));

// Search Discogs database
router.get('/search', asyncHandler(async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.render('records/search', { 
                title: 'Search Records',
                results: [],
                query: '',
                error: null
            });
        }

        const results = await discogs.searchRecords(q);

        res.render('records/search', {
            title: 'Search Results',
            results,
            query: q,
            error: null
        });
    } catch (err) {
        console.error('Error searching Discogs:', err);
        res.render('records/search', {
            title: 'Search Records',
            results: [],
            query: q,
            error: 'Error connecting to Discogs'
        });
    }
}));

// Show new record form
router.get('/new', asyncHandler(async (req, res) => {
    const formats = Record.schema.path('format').enumValues;
    res.render('records/new', {
        title: 'Add Record',
        formats,
        prefilledData: null
    });
}));

router.get('/settings', asyncHandler(async (req, res) => {
    const [user, userRecords] = await Promise.all([
        User.findById(req.user._id)
            .populate('profile.top8Records'),
        Record.find({ owner: req.user._id })
            .sort('artist title')
    ]);

    res.render('records/settings', { 
        title: 'Profile Settings',
        error: null,
        user,
        userRecords
    });
}));

router.post('/settings/top8', asyncHandler(async (req, res) => {
    let recordIds = req.body.recordIds;
    
    // Handle single ID or array of IDs
    if (!Array.isArray(recordIds)) {
        recordIds = recordIds ? [recordIds] : [];
    }
    
    // Validate record IDs (max 8)
    if (recordIds.length > 8) {
        return res.status(400).json({ error: 'You can only select up to 8 records' });
    }

    // Update user's top 8
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { 'profile.top8Records': recordIds },
        { new: true }
    ).populate('profile.top8Records');

    res.json({ 
        success: true, 
        top8Records: updatedUser.profile.top8Records 
    });
}));

// Add record from Discogs
router.get('/add-from-discogs/:id', asyncHandler(async (req, res) => {
    try {
        const recordDetails = await discogs.getRecordDetails(req.params.id);
        
        // Create new record
        const record = await Record.create({
            ...recordDetails,
            owner: req.user._id,
            discogsId: req.params.id
        });

        // Create activity
        await Activity.create({
            user: req.user._id,
            activityType: 'add_record',
            record: record._id
        });

        req.session.message = { type: 'success', text: 'Record added successfully from Discogs' };
        res.redirect('/records');
    } catch (err) {
        console.error('Error adding record from Discogs:', err);
        req.session.message = { type: 'error', text: err.message };
        res.redirect('/records/search');
    }
}));

// Create new record
router.post('/', asyncHandler(async (req, res) => {
    // Add owner and process tags
    req.body.owner = req.user._id;
    req.body.tags = req.body.tags
        ? req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];

    await Record.create(req.body);
    res.redirect('/records');
}));

// Show single record
router.get('/:id', asyncHandler(async (req, res) => {
    const record = await Record.findById(req.params.id);
    if (!record) return res.redirect('/records');
    
    res.render('records/show', {
        title: `${record.title} by ${record.artist}`,
        record
    });
}));

// Show edit form
router.get('/:id/edit', asyncHandler(async (req, res) => {
    const record = await validateOwnership(req.params.id, req.user._id, req.user.isAdmin);
    
    res.render('records/edit', {
        title: 'Edit Record',
        record,
        formats: Record.schema.path('format').enumValues
    });
}));

// Track record play
router.post('/:id/play', asyncHandler(async (req, res) => {
    const record = await validateOwnership(req.params.id, req.user._id, req.user.isAdmin);
    
    // Increment plays and update last played date
    record.plays = (record.plays || 0) + 1;
    record.lastPlayed = new Date();
    await record.save();

    // Create activity for play
    await Activity.create({
        user: req.user._id,
        record: record._id,
        activityType: 'play_record'
    });

    // Return JSON response for AJAX request
    res.json({ 
        success: true, 
        plays: record.plays,
        message: 'Play tracked successfully'
    });
}));

// Update record
router.put('/:id', asyncHandler(async (req, res) => {
    const record = await validateOwnership(req.params.id, req.user._id, req.user.isAdmin);
    let oldImagePath = null;

    try {
        // Handle file upload first
        await new Promise((resolve, reject) => {
            albumArtUpload(req, res, (err) => {
                if (err instanceof multer.MulterError) {
                    reject(new Error(`Upload error: ${err.message}`));
                } else if (err) {
                    reject(err);
                }
                resolve();
            });
        });

        // Process tags
        if (req.body.tags) {
            req.body.tags = req.body.tags.split(',')
                .map(tag => tag.trim())
                .filter(tag => tag);
        }

        // Handle image paths
        if (req.file) {
            req.body.imageUrl = '/uploads/records/' + req.file.filename;
            
            // Store old image path for cleanup
            if (record.imageUrl && 
                !record.imageUrl.includes('default-album') && 
                record.imageUrl.startsWith('/uploads/')) {
                oldImagePath = 'public' + record.imageUrl;
            }
        } else if (!req.body.imageUrl) {
            req.body.imageUrl = record.imageUrl;
        }

        // Update record and create activity in parallel
        const [updatedRecord] = await Promise.all([
            Record.findByIdAndUpdate(
                req.params.id, 
                { ...req.body, owner: req.user._id },
                { new: true, runValidators: true }
            ),
            Activity.create({
                user: req.user._id,
                record: record._id,
                activityType: 'play_record',
                details: {
                    action: 'update',
                    recordTitle: record.title,
                    recordArtist: record.artist
                }
            })
        ]);

        // Clean up old image if needed
        if (oldImagePath) {
            await fs.unlink(oldImagePath).catch(console.error);
        }

        res.redirect(`/records/${updatedRecord._id}`);
    } catch (error) {
        // Clean up uploaded file if there was an error
        if (req.file) {
            await fs.unlink(req.file.path).catch(console.error);
        }
        throw error;
    }
}));

// Delete record
router.delete('/:id', asyncHandler(async (req, res) => {
    const record = await validateOwnership(req.params.id, req.user._id, req.user.isAdmin);
    
    // Create activity first
    await Activity.create({
        user: req.user._id,
        activityType: 'play_record',
        record: record._id,
        details: { 
            action: 'delete',
            recordTitle: record.title,
            recordArtist: record.artist
        }
    });

    // Then delete the record
    await Record.findByIdAndDelete(req.params.id);

    res.redirect('/records');
}));

module.exports = router;
