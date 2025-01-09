const express = require('express');
const router = express.Router();
const Record = require('../models/record');
const User = require('../models/user');
const Activity = require('../models/activity');
const discogs = require('../services/discogs');

// All routes start with '/records'
// GET /records (index functionality)
router.get('/', async (req, res) => {
    try {
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
        
        res.render('records/index.ejs', {
            records: sortedRecords,
            title: 'My Records',
            currentSort: req.query.sort,
            currentTag: req.query.tag,
            tags
        });
    } catch (e) {
        console.log(e);
        res.redirect('/');
    }
});

// GET /records/stats (stats functionality)
router.get('/stats', async (req, res) => {
    try {
        const [totalRecords, mostPlayed, recentlyPlayed] = await Promise.all([
            Record.countDocuments({ owner: req.user._id }),
            Record.findOne({ owner: req.user._id }).sort('-plays').limit(1),
            Record.findOne({ 
                owner: req.user._id,
                lastPlayed: { $exists: true }
            }).sort('-lastPlayed').limit(1)
        ]);

        res.render('records/stats', {
            title: 'Collection Stats',
            totalRecords,
            mostPlayed,
            recentlyPlayed
        });
    } catch (e) {
        console.log(e);
        res.redirect('/records');
    }
});

// GET /records/search (search functionality)
router.get('/search', async (req, res) => {
    try {
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
        
        res.render('records/search', {
            title: 'Search Results',
            results,
            query,
            error: null
        });
    } catch (e) {
        console.log(e);
        res.render('records/search', {
            title: 'Search Results',
            results: [],
            query: req.query.q || '',
            error: 'Error searching records'
        });
    }
});

// GET /records/new (new functionality)
router.get('/new', (req, res) => {
    const formats = Record.schema.path('format').enumValues;
    res.render('records/new.ejs', {
        title: 'Add Record',
        formats,
        prefilledData: null
    });
});

// GET /records/profile (profile functionality)
router.get('/profile', async (req, res) => {
    try {
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
        
        res.render('records/profile', {
            title: 'My Profile',
            recentlyAdded,
            recentlyPlayed
        });
    } catch (e) {
        console.log(e);
        res.redirect('/records');
    }
});

// GET /records/settings (settings functionality)
router.get('/settings', (req, res) => {
    res.render('records/settings', { 
        title: 'Profile Settings'
    });
});

// GET /records/feed (feed functionality)
router.get('/feed', async (req, res) => {
    try {
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
        
        res.render('records/feed', {
            title: 'Activity Feed',
            activities: publicActivities
        });
    } catch (e) {
        console.log(e);
        res.redirect('/records');
    }
});

// POST /records (create functionality)
router.post('/', async (req, res) => {
    try {
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

        res.redirect('/records');
    } catch (e) {
        console.log(e);
        res.redirect('/records/new');
    }
});

// POST /records/settings (update settings functionality)
router.post('/settings', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.isPublic = !!req.body.isPublic;
        await user.save();
        res.redirect('/records/profile');
    } catch (e) {
        console.log(e);
        res.redirect('/records/settings');
    }
});

// GET /records/add-from-discogs/:id (add from discogs functionality)
router.get('/add-from-discogs/:id', async (req, res) => {
    try {
        const recordDetails = await discogs.getRecordDetails(req.params.id);
        
        if (!recordDetails) {
            throw new Error('Could not fetch record details from Discogs');
        }
        
        res.render('records/new', {
            title: 'Add Record',
            formats: Record.schema.path('format').enumValues,
            prefilledData: recordDetails
        });
    } catch (e) {
        console.log(e);
        res.redirect('/records/search');
    }
});

// GET /records/:id (show functionality)
router.get('/:id', async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record) {
            return res.redirect('/records');
        }
        
        res.render('records/show.ejs', {
            title: `${record.title} by ${record.artist}`,
            record
        });
    } catch (e) {
        console.log(e);
        res.redirect('/records');
    }
});

// GET /records/:id/edit (edit functionality)
router.get('/:id/edit', async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record) {
            return res.redirect('/records');
        }
        
        const formats = Record.schema.path('format').enumValues;
        res.render('records/edit.ejs', {
            title: 'Edit Record',
            record,
            formats
        });
    } catch (e) {
        console.log(e);
        res.redirect('/records');
    }
});

// POST /records/:id/play (play functionality)
router.post('/:id/play', async (req, res) => {
    try {
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

        res.redirect(`/records/${record._id}`);
    } catch (e) {
        console.log(e);
        res.redirect('/records');
    }
});

// PUT /records/:id (update functionality)
router.put('/:id', async (req, res) => {
    try {
        if (req.body.tags) {
            req.body.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        }

        await Record.findByIdAndUpdate(req.params.id, req.body);
        res.redirect(`/records/${req.params.id}`);
    } catch (e) {
        console.log(e);
        res.redirect('/records');
    }
});

// DELETE /records/:id (delete functionality)
router.delete('/:id', async (req, res) => {
    try {
        await Record.findByIdAndDelete(req.params.id);
        res.redirect('/records');
    } catch (e) {
        console.log(e);
        res.redirect('/records');
    }
});

module.exports = router;