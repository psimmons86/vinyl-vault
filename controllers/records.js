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

// Configure multer for album art uploads
const albumArtStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/records')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const albumArtUpload = multer({ 
    storage: albumArtStorage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

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
    // Filter by tag if provided
    const query = { owner: req.user._id };
    if (req.query.tag) {
        query.tags = req.query.tag;
    }
    
    // Get records and available tags
    const [records, tags] = await Promise.all([
        Record.find(query),
        Record.distinct('tags', { owner: req.user._id })
    ]);
    
    // Sort by artist name or date added
    const sortedRecords = [...records].sort((a, b) => 
        req.query.sort === 'artist' 
            ? a.artist.toLowerCase().localeCompare(b.artist.toLowerCase())
            : b.createdAt - a.createdAt
    );

    // Return JSON if requested
    if (req.headers.accept?.includes('application/json')) {
        return res.json(sortedRecords);
    }
    
    // Otherwise render HTML
    res.render('records/index', {
        records: sortedRecords,
        title: 'My Records',
        currentSort: req.query.sort,
        currentTag: req.query.tag,
        tags
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
            theme: req.body.darkMode ? 'dark' : 'light',
            showStats: !!req.body.showStats
        }
    };

    // Handle file uploads
    if (req.files) {
        if (req.files.profilePicture && req.files.profilePicture[0]) {
            updateData.profile.avatarUrl = '/uploads/' + req.files.profilePicture[0].filename;
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
            updateData.profile.bannerUrl = '/uploads/' + req.files.bannerImage[0].filename;
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

    await User.findByIdAndUpdate(req.user._id, updateData, { new: true });
    
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
            // Add these new queries
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

        res.render('records/stats', {
            title: 'Collection Stats',
            totalRecords,
            mostPlayed,
            totalPlays: totalPlays[0]?.total || 0,
            topArtists,
            topTags,
            recordsByYear,
            topPlayedArtists,
            collectionValue: collectionValue[0]?.total || 0,
            mostValuableRecords,
            // Add new data to template
            topPlayedRecords,
            recentlyPlayedRecords
        });
}));

// Search Discogs database
router.get('/search', asyncHandler(async (req, res) => {
    if (!req.query.q) {
        return res.render('records/search', {
            title: 'Search Discogs',
            results: [],
            query: '',
            error: null
        });
    }

    const results = await discogs.searchRecords(req.query.q);
    
    res.render('records/search', {
        title: 'Search Results',
        results,
        query: req.query.q,
        error: null
    });
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

// Add record from Discogs
router.get('/add-from-discogs/:id', asyncHandler(async (req, res) => {
    const recordDetails = await discogs.getRecordDetails(req.params.id);
    if (!recordDetails) {
        return res.redirect('/records/search');
    }
    
    res.render('records/new', {
        title: 'Add Record',
        formats: Record.schema.path('format').enumValues,
        prefilledData: recordDetails
    });
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
    record.plays += 1;
    record.lastPlayed = new Date();
    await record.save();

    // Create activity for play
    await Activity.create({
        user: req.user._id,
        record: record._id,
        activityType: 'play_record'
    });

    res.redirect(`/records/${record._id}`);
}));

// Update record
router.put('/:id', albumArtUpload.single('albumArt'), asyncHandler(async (req, res) => {
    const record = await validateOwnership(req.params.id, req.user._id, req.user.isAdmin);

    // Process tags if provided
    if (req.body.tags) {
        req.body.tags = req.body.tags.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag);
    }

    // Handle image upload or URL
    if (req.file) {
        // If there's an uploaded file, use that
        req.body.imageUrl = '/uploads/records/' + req.file.filename;
        
        // Delete old image if it exists and isn't the default
        if (record.imageUrl && 
            !record.imageUrl.includes('default-album') && 
            record.imageUrl.startsWith('/uploads/')) {
            try {
                await fs.unlink('public' + record.imageUrl);
            } catch (err) {
                console.error('Error deleting old album art:', err);
            }
        }
    } else if (!req.body.imageUrl) {
        // If no file uploaded and no URL provided, keep existing image
        req.body.imageUrl = record.imageUrl;
    }

    const updatedRecord = await Record.findByIdAndUpdate(
        req.params.id, 
        { ...req.body, owner: req.user._id },
        { new: true, runValidators: true }
    );

    // Create activity for update
    await Activity.create({
        user: req.user._id,
        record: updatedRecord._id,
        activityType: 'update'
    });

    res.redirect(`/records/${req.params.id}`);
}));

// Delete record
router.delete('/:id', asyncHandler(async (req, res) => {
    const record = await validateOwnership(req.params.id, req.user._id, req.user.isAdmin);
    
    // Delete record and create activity
    await Promise.all([
        Record.findByIdAndDelete(req.params.id),
        Activity.create({
            user: req.user._id,
            activityType: 'delete',
            metadata: { 
                recordTitle: record.title,
                recordArtist: record.artist
            }
        })
    ]);

    res.redirect('/records');
}));

module.exports = router;
