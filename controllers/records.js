const express = require('express');
const router = express.Router();
const Record = require('../models/record');
const User = require('../models/user');
const Activity = require('../models/activity');
const discogs = require('../services/discogs');

// Utility function to handle async routes
const asyncHandler = fn => (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
};

// Discogs Integration Routes
router.get('/search', asyncHandler(async (req, res) => {
    const query = req.query.q;
    
    if (!query) {
        return res.render('records/search', {
            title: 'Search Discogs',
            results: [],
            query: '',
            error: null
        });
    }

    const results = await discogs.searchRecords(query);
    
    return res.render('records/search', {
        title: 'Search Results',
        results,
        query,
        error: null
    });
}));

router.get('/add-from-discogs/:id', asyncHandler(async (req, res) => {
    const recordDetails = await discogs.getRecordDetails(req.params.id);
    
    if (!recordDetails) {
        throw new Error('Could not fetch record details from Discogs');
    }
    
    return res.render('records/new', {
        title: 'Add Record',
        formats: Record.schema.path('format').enumValues,
        prefilledData: recordDetails
    });
}));

// Profile and Settings Routes
router.get('/profile', asyncHandler(async (req, res) => {
    const [recentlyAdded, recentlyPlayed] = await Promise.all([
        Record.find({ owner: req.user._id })
            .sort({ createdAt: -1 })
            .limit(10),
        Record.find({ 
            owner: req.user._id,
            lastPlayed: { $exists: true, $ne: null }
        })
            .sort({ lastPlayed: -1 })
            .limit(10)
    ]);
    
    return res.render('records/profile', {
        title: 'My Profile',
        recentlyAdded,
        recentlyPlayed
    });
}));

router.get('/settings', (req, res) => {
    return res.render('records/settings', { 
        title: 'Profile Settings'
    });
});

router.post('/settings', asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    user.isPublic = !!req.body.isPublic;
    await user.save();
    return res.redirect('/records/profile');
}));

// Activity Feed Route
router.get('/feed', asyncHandler(async (req, res) => {
    const activities = await Activity.find()
        .populate({
            path: 'user',
            match: { isPublic: true },
            select: 'username'
        })
        .populate('record', 'title artist')
        .sort({ createdAt: -1 })
        .limit(50);

    const publicActivities = activities.filter(activity => activity.user);
    
    return res.render('records/feed', {
        title: 'Activity Feed',
        activities: publicActivities
    });
}));

// Record Creation Routes
router.get('/new', (req, res) => {
    const formats = Record.schema.path('format').enumValues;
    return res.render('records/new.ejs', {
        title: 'Add Record',
        formats,
        prefilledData: null
    });
});

// Collection Index Route
router.get('/', asyncHandler(async (req, res) => {
    const query = { owner: req.user._id };
    if (req.query.tag) {
        query.tags = req.query.tag;
    }
    
    const [records, tags] = await Promise.all([
        Record.find(query),
        Record.distinct('tags', { owner: req.user._id })
    ]);
    
    const sortedRecords = [...records];
    if (req.query.sort === 'artist') {
        sortedRecords.sort((a, b) => a.artist.toLowerCase().localeCompare(b.artist.toLowerCase()));
    } else {
        sortedRecords.sort((a, b) => b.createdAt - a.createdAt);
    }
    
    return res.render('records/index.ejs', {
        records: sortedRecords,
        title: 'My Records',
        currentSort: req.query.sort,
        currentTag: req.query.tag,
        tags
    });
}));

// Record Creation POST Route
router.post('/', asyncHandler(async (req, res) => {
    req.body.owner = req.user._id;
    req.body.tags = req.body.tags
        ? req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];

    const newRecord = await Record.create(req.body);
    
    await Activity.create({
        user: req.user._id,
        activityType: 'add_record',
        record: newRecord._id
    });

    return res.redirect('/records');
}));

// Individual Record Routes
router.get('/:id', asyncHandler(async (req, res) => {
    const record = await Record.findById(req.params.id);
    if (!record) {
        return res.redirect('/records');
    }
    
    return res.render('records/show.ejs', {
        title: `${record.title} by ${record.artist}`,
        record
    });
}));

router.get('/:id/edit', asyncHandler(async (req, res) => {
    const record = await Record.findById(req.params.id);
    if (!record) {
        return res.redirect('/records');
    }
    
    const formats = Record.schema.path('format').enumValues;
    return res.render('records/edit.ejs', {
        title: 'Edit Record',
        record,
        formats
    });
}));

router.post('/:id/play', asyncHandler(async (req, res) => {
    const record = await Record.findById(req.params.id);
    if (!record) {
        return res.redirect('/records');
    }
    
    record.plays += 1;
    record.lastPlayed = new Date();
    await record.save();

    await Activity.create({
        user: req.user._id,
        activityType: 'play_record',
        record: record._id
    });

    return res.redirect(`/records/${record._id}`);
}));

router.put('/:id', asyncHandler(async (req, res) => {
    if (req.body.tags) {
        req.body.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    await Record.findByIdAndUpdate(req.params.id, req.body);
    return res.redirect(`/records/${req.params.id}`);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
    await Record.findByIdAndDelete(req.params.id);
    return res.redirect('/records');
}));

module.exports = router;