const express = require('express');
const router = express.Router();
const Record = require('../models/record');
const Activity = require('../models/activity');
const discogs = require('../services/discogs');

// All routes start with '/records'

// GET /records (index functionality)
router.get('/', async (req, res) => {
    try {
        const query = { owner: req.user._id };
        if (req.query.tag) query.tags = req.query.tag;

        const [records, tags] = await Promise.all([
            Record.find(query),
            Record.distinct('tags', { owner: req.user._id })
        ]);

        const sortedRecords = req.query.sort === 'artist'
            ? records.sort((a, b) => a.artist.toLowerCase().localeCompare(b.artist.toLowerCase()))
            : records.sort((a, b) => b.createdAt - a.createdAt);

        res.render('records/index', {
            title: 'My Collection',
            records: sortedRecords,
            currentSort: req.query.sort,
            currentTag: req.query.tag,
            tags
        });
    } catch (e) {
        console.log(e);
        res.redirect('/');
    }
});

// GET /records/new (new functionality)
router.get('/new', (req, res) => {
    const formats = Record.schema.path('format').enumValues;
    res.render('records/new', {
        title: 'Add Record',
        formats,
        prefilledData: null
    });
});

// GET /records/search (search functionality)
router.get('/search', async (req, res) => {
    try {
        if (!req.query.q) {
            return res.render('records/search', {
                title: 'Search Records',
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
    } catch (e) {
        console.log(e);
        res.render('records/search', {
            title: 'Search Error',
            results: [],
            query: req.query.q,
            error: 'Error searching Discogs'
        });
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

// GET /records/:id (show functionality)
router.get('/:id', async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record || record.owner.toString() !== req.user._id.toString()) {
            return res.redirect('/records');
        }
        res.render('records/show', {
            title: `${record.title} by ${record.artist}`,
            record
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

// GET /records/:id/edit (edit functionality)
router.get('/:id/edit', async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record || record.owner.toString() !== req.user._id.toString()) {
            return res.redirect('/records');
        }

        const formats = Record.schema.path('format').enumValues;
        res.render('records/edit', {
            title: 'Edit Record',
            record,
            formats
        });
    } catch (e) {
        console.log(e);
        res.redirect('/records');
    }
});

// PUT /records/:id (update functionality)
router.put('/:id', async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record || record.owner.toString() !== req.user._id.toString()) {
            return res.redirect('/records');
        }

        if (req.body.tags) {
            req.body.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        }

        await Record.findByIdAndUpdate(req.params.id, req.body);
        res.redirect(`/records/${req.params.id}`);
    } catch (e) {
        console.log(e);
        res.redirect(`/records/${req.params.id}`);
    }
});

// POST /records/:id/play (play functionality)
router.post('/:id/play', async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record || record.owner.toString() !== req.user._id.toString()) {
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

// DELETE /records/:id (delete functionality)
router.delete('/:id', async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record || record.owner.toString() !== req.user._id.toString()) {
            return res.redirect('/records');
        }

        await Record.findByIdAndDelete(req.params.id);
        res.redirect('/records');
    } catch (e) {
        console.log(e);
        res.redirect('/records');
    }
});

module.exports = router;