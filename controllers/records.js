const express = require('express');
const router = express.Router();
const Record = require('../models/record');
const User = require('../models/user');
const Activity = require('../models/activity');

// GET /records/profile - Show user's profile with recent activity
router.get('/profile', async (req, res) => {
    try {
        const recentlyAdded = await Record.find({ owner: req.user._id })
            .sort({ createdAt: -1 })
            .limit(10);
            
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
        console.error('Error loading profile:', e);
        res.redirect('/records');
    }
});

// GET /records/settings - Show user settings page
router.get('/settings', (req, res) => {
    res.render('records/settings', { 
        title: 'Profile Settings'
    });
});

// POST /records/settings - Update user settings
router.post('/settings', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.isPublic = !!req.body.isPublic; 
        await user.save();
        res.redirect('/records/profile');
    } catch (e) {
        console.error('Error updating settings:', e);
        res.redirect('/records/settings');
    }
});

// GET /records/feed - Show activity feed from all public users
router.get('/feed', async (req, res) => {
    try { const activities = await Activity.find()
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
        console.error('Error loading feed:', e);
        res.redirect('/records');
    }
});

// GET /records/stats - Show collection statistics
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
        console.error('Error loading stats:', e);
        res.redirect('/records');
    }
});

// GET /records/new - Show form to add new record
router.get('/new', (req, res) => {
    const formats = Record.schema.path('format').enumValues;
    res.render('records/new.ejs', {
        title: 'Add Record',
        formats
    });
});

// GET /records/:id - Show single record details
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
        console.error('Error loading record:', e);
        res.redirect('/records');
    }
});

// POST /records - Create new record
router.post('/', async (req, res) => {
    try {req.body.owner = req.user._id;
        // Parse submitted tags into an array, trim whitespace, and remove empty strings
        req.body.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    
        const newRecord = await Record.create(req.body);
        
        
        await Activity.create({
            user: req.user._id,
            activityType: 'add_record',
            record: newRecord._id
        });

        res.redirect('/records');
    } catch (e) {
        console.error('Error creating record:', e);
        res.redirect('/records/new');
    }
});

// POST /records/:id/play - Track record play
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
        console.error('Error playing record:', e);
        res.redirect('/records');
    }
});

// DELETE /records/:id - Delete a record
router.delete('/:id', async (req, res) => {
    try {
        await Record.findByIdAndDelete(req.params.id);
        res.redirect('/records');
    } catch (e) {
        console.error('Error deleting record:', e);
        res.redirect('/records');
    }
});

// GET /records/:id/edit - Show edit form
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
        console.error('Error loading edit form:', e);
        res.redirect('/records');
    }
});

// PUT /records/:id - Update a record
router.put('/:id', async (req, res) => {
    try {
    
      req.body.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);

        await Record.findByIdAndUpdate(req.params.id, req.body);
        res.redirect(`/records/${req.params.id}`);
    } catch (e) {
        console.error('Error updating record:', e);
        res.redirect('/records');
    }
});

// GET /records - Show all records (index/collection view)
router.get('/', async (req, res) => {
  try {
      const query = { owner: req.user._id };
      
      
      if (req.query.tag) {
          query.tags = req.query.tag;
      }
      
      
      const records = await Record.find(query);
      
      
      const tags = await Record.distinct('tags', { owner: req.user._id });
      
      
      let sortedRecords = [...records];
      
      
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
      console.error('Error loading collection:', e);
      res.redirect('/');
  }
});

module.exports = router;