const express = require('express');
const router = express.Router();
const Record = require('../models/record');
const User = require('../models/user');

// GET /records/profile (profile functionality)
router.get('/profile', async (req, res) => {
    try {
        // Get last 10 added records
        const recentlyAdded = await Record.find({ owner: req.user._id })
            .sort({ createdAt: -1 })
            .limit(10);
            
        // Get last 10 played records
        const recentlyPlayed = await Record.find({ 
            owner: req.user._id,
            lastPlayed: { $exists: true, $ne: null }
        })
            .sort({ lastPlayed: -1 })
            .limit(10);
        
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

// GET /records/settings
router.get('/settings', (req, res) => {
    res.render('records/settings', { 
        title: 'Profile Settings'
    });
});

// POST /records/settings
router.post('/settings', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.isPublic = !!req.body.isPublic; // Convert checkbox value to boolean
        await user.save();
        res.redirect('/records/profile');
    } catch (e) {
        console.log(e);
        res.redirect('/records/settings');
    }
});

// GET /records/stats (stats functionality)
router.get('/stats', async (req, res) => {
    try {
        const records = await Record.find({ owner: req.user._id });
        const totalRecords = records.length;
        const mostPlayed = records.length > 0 
            ? records.sort((a, b) => b.plays - a.plays)[0] 
            : null;
        const recentlyPlayed = records.length > 0
            ? records.filter(r => r.lastPlayed)
                .sort((a, b) => b.lastPlayed - a.lastPlayed)[0] 
            : null;

        res.render('records/stats.ejs', {
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

// GET /records (index functionality)
router.get('/', async (req, res) => {
    try {
        const records = await Record.find({ owner: req.user._id });
        
        // Create a copy of records array before sorting
        let sortedRecords = [...records];
        
        // Sort by date added by default
        if (req.query.sort === 'artist') {
            sortedRecords.sort((a, b) => a.artist.toLowerCase().localeCompare(b.artist.toLowerCase()));
        } else {
            // Default sort: date added (newest first)
            sortedRecords.sort((a, b) => b.createdAt - a.createdAt);
        }
        
        res.render('records/index.ejs', {
            records: sortedRecords,
            title: 'My Records',
            currentSort: req.query.sort
        });
    } catch (e) {
        console.log(e);
        res.redirect('/');
    }
});

module.exports = router;