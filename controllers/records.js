const express = require('express');
const router = express.Router();
const Record = require('../models/record');
// Middleware to protect selected routes
const ensureSignedIn = require('../middleware/ensure-signed-in');

// All routes start with '/records'
// GET /records (index functionality)
router.get('/', (req, res) => {
    Record.find({ owner: req.user._id })
        .then(records => {
            // Sort based on query parameter
            if (req.query.sort === 'az') {
                records.sort((a, b) => a.title.localeCompare(b.title));
            } else if (req.query.sort === 'date') {
                records.sort((a, b) => b.createdAt - a.createdAt);
            }
            
            // Calculate collection stats
            const totalRecords = records.length;
            const mostPlayed = records.length > 0 
                ? records.sort((a, b) => b.plays - a.plays)[0] 
                : null;
            const recentlyPlayed = records.length > 0
                ? records.filter(r => r.lastPlayed)
                    .sort((a, b) => b.lastPlayed - a.lastPlayed)[0]
                : null;
            
            res.render('records/index.ejs', {
                records,
                title: 'My Records',
                totalRecords,
                mostPlayed,
                recentlyPlayed,
                currentSort: req.query.sort
            });
        });
});

// GET /records/new (new functionality)
router.get('/new', (req, res) => {
    const formats = Record.schema.path('format').enumValues;
    res.render('records/new.ejs', {
        title: 'Add Record',
        formats
    });
});

// GET /records/:id (show functionality)
router.get('/:id', async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        res.render('records/show.ejs', {
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
        await Record.create(req.body);
        res.redirect('/records');
    } catch (e) {
        console.log(e);
        res.redirect('/records/new');
    }
});

// POST /records/:id/play (play tracking functionality)
router.post('/:id/play', async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        record.plays += 1;
        record.lastPlayed = new Date();
        await record.save();
        res.redirect(`/records/${record._id}`);
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

// GET /records/:id/edit (edit functionality)
router.get('/:id/edit', async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
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

// PUT /records/:id (update functionality)
router.put('/:id', async (req, res) => {
    try {
        await Record.findByIdAndUpdate(req.params.id, req.body);
        res.redirect(`/records/${req.params.id}`);
    } catch (e) {
        console.log(e);
        res.redirect('/records');
    }
});

module.exports = router;