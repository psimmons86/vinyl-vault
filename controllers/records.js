const express = require('express');
const router = express.Router();
const Record = require('../models/record');
const User = require('../models/user');
const discogs = require('../services/discogs');

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
        
        const sortedRecords = [...records].sort((a, b) => 
            req.query.sort === 'artist' 
                ? a.artist.toLowerCase().localeCompare(b.artist.toLowerCase())
                : b.createdAt - a.createdAt
        );
        
        res.render('records/index', {
            records: sortedRecords,
            title: 'My Records',
            currentSort: req.query.sort,
            currentTag: req.query.tag,
            tags
        });
    } catch (err) {
        res.redirect('/');
    }
});

router.get('/stats', async (req, res) => {
  try {
      const [
          totalRecords,
          mostPlayed,
          totalPlays,
          topArtists,
          topTags,
          recordsByYear,
          topPlayedArtists
      ] = await Promise.all([
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
          ])
      ]);

      res.render('records/stats', {
          title: 'Collection Stats',
          totalRecords,
          mostPlayed,
          totalPlays: totalPlays[0]?.total || 0,
          topArtists,
          topTags,
          recordsByYear,
          topPlayedArtists
      });
  } catch (err) {
      res.redirect('/records');
  }
});

router.get('/search', async (req, res) => {
    try {
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
    } catch (err) {
        res.render('records/search', {
            title: 'Search Results',
            results: [],
            query: req.query.q || '',
            error: 'Error searching records'
        });
    }
});

router.get('/new', async (req, res) => {
    const formats = Record.schema.path('format').enumValues;
    res.render('records/new', {
        title: 'Add Record',
        formats,
        prefilledData: null
    });
});

router.get('/settings', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.render('records/settings', { 
            title: 'Profile Settings',
            error: null
        });
    } catch (err) {
        res.redirect('/records');
    }
});

router.post('/settings', async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            isPublic: !!req.body.isPublic
        });
        res.redirect('/records');
    } catch (err) {
        res.render('records/settings', {
            title: 'Profile Settings',
            error: 'Error updating settings'
        });
    }
});

router.post('/', async (req, res) => {
    try {
        req.body.owner = req.user._id;
        req.body.tags = req.body.tags
            ? req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
            : [];

        await Record.create(req.body);
        res.redirect('/records');
    } catch (err) {
        res.redirect('/records/new');
    }
});

router.get('/add-from-discogs/:id', async (req, res) => {
    try {
        const recordDetails = await discogs.getRecordDetails(req.params.id);
        if (!recordDetails) {
            throw new Error('Could not fetch record details');
        }
        
        res.render('records/new', {
            title: 'Add Record',
            formats: Record.schema.path('format').enumValues,
            prefilledData: recordDetails
        });
    } catch (err) {
        res.redirect('/records/search');
    }
});

router.get('/:id', async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record) return res.redirect('/records');
        
        res.render('records/show', {
            title: `${record.title} by ${record.artist}`,
            record
        });
    } catch (err) {
        res.redirect('/records');
    }
});

router.get('/:id/edit', async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record) return res.redirect('/records');
        
        res.render('records/edit', {
            title: 'Edit Record',
            record,
            formats: Record.schema.path('format').enumValues
        });
    } catch (err) {
        res.redirect('/records');
    }
});

router.post('/:id/play', async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record) return res.redirect('/records');
        
        record.plays += 1;
        record.lastPlayed = new Date();
        await record.save();

        res.redirect(`/records/${record._id}`);
    } catch (err) {
        res.redirect('/records');
    }
});

router.put('/:id', async (req, res) => {
    try {
        if (req.body.tags) {
            req.body.tags = req.body.tags.split(',')
                .map(tag => tag.trim())
                .filter(tag => tag);
        }

        await Record.findByIdAndUpdate(req.params.id, req.body);
        res.redirect(`/records/${req.params.id}`);
    } catch (err) {
        res.redirect('/records');
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await Record.findByIdAndDelete(req.params.id);
        res.redirect('/records');
    } catch (err) {
        res.redirect('/records');
    }
});

module.exports = router;