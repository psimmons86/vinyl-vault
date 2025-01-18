const express = require('express');
const router = express.Router();
const Record = require('../models/record');
const User = require('../models/user');
const Activity = require('../models/activity');
const Comment = require('../models/comment');  // Add this
const { getMusicNews } = require('../services/newsapi');
const discogs = require('../services/discogs');
const upload = require('../config/uploads');

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
router.get('/', async (req, res) => {
    try {
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

router.get('/profile', async (req, res) => {
    try {
        const [
            totalRecords,
            totalPlays,
            recentlyAdded,
            recentlyPlayed,
            user
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
            
            // Fetch user with populated top8Records
            User.findById(req.user._id)
                .populate('profile.top8Records')
        ]);

        res.render('records/profile', {
            title: 'My Profile',
            totalRecords,
            totalPlays: totalPlays[0]?.total || 0,
            recentlyAdded,
            recentlyPlayed,
            top8Records: user.profile?.top8Records || [],
            user: user // Add this to ensure user data is available in the template
        });
    } catch (err) {
        console.error('Profile error:', err);
        res.redirect('/records');
    }
});

router.post('/settings', upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 }
]), async (req, res) => {
    try {
        const updateData = {
            isPublic: !!req.body.isPublic,
            profile: {
                name: req.body.name,
                bio: req.body.bio,
                location: req.body.location,
                favoriteGenres: req.body.favoriteGenres?.split(',').map(genre => genre.trim()) || [],
                socialLinks: {
                    discogs: req.body.discogsLink,
                    instagram: req.body.instagramLink,
                    twitter: req.body.twitterLink
                },
                showStats: !!req.body.showStats,
                theme: req.body.darkMode ? 'dark' : 'light'
            }
        };

        // Add uploaded files to update data if they exist
        if (req.files) {
            if (req.files.profilePicture && req.files.profilePicture[0]) {
                updateData.profile.avatarUrl = '/uploads/' + req.files.profilePicture[0].filename;
            }
            if (req.files.bannerImage && req.files.bannerImage[0]) {
                updateData.profile.bannerUrl = '/uploads/' + req.files.bannerImage[0].filename;
            }
        }

        // Maintain existing avatar/banner if no new files uploaded
        if (!req.files?.profilePicture) {
            updateData.profile.avatarUrl = req.user.profile?.avatarUrl;
        }
        if (!req.files?.bannerImage) {
            updateData.profile.bannerUrl = req.user.profile?.bannerUrl;
        }

        await User.findByIdAndUpdate(req.user._id, updateData, { new: true });
        
        req.session.message = { type: 'success', text: 'Profile updated successfully!' };
        res.redirect('/records/settings');
    } catch (err) {
        console.error('Settings update error:', err);
        res.render('records/settings', {
            title: 'Profile Settings',
            error: 'Error updating settings',
            user: req.user,
            userRecords: await Record.find({ owner: req.user._id }).sort('artist title')
        });
    }
});

// Get feed items with pagination
router.get('/feed', async (req, res) => {
    try {
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
    } catch (err) {
        console.error('Feed error:', err);
        res.status(500).json({ error: 'Error loading feed' });
    }
});

// Get music news
router.get('/news', async (req, res) => {
    try {
        const genre = req.query.genre || '';
        const news = await getMusicNews(genre);
        res.json(news || []); // Ensure we always return an array
    } catch (err) {
        console.error('News error:', err);
        res.status(500).json({ error: 'Error loading news' });
    }
});

// Add comment
router.post('/comments', async (req, res) => {
    try {
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
    } catch (err) {
        res.status(500).json({ error: 'Error creating comment' });
    }
});

// Get comments for a target
router.get('/comments/:target', async (req, res) => {
    try {
        const comments = await Comment.find({ target: req.params.target })
            .populate('user', 'username profile.name profile.avatarUrl')
            .sort('-createdAt');
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: 'Error loading comments' });
    }
});

// Get collection statistics
router.get('/stats', async (req, res) => {
    try {
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
    } catch (err) {
        res.redirect('/records');
    }
});

// Search Discogs database
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

// Show new record form
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
    } catch (err) {
        res.redirect('/records');
    }
});

// Update user settings
router.post('/settings', async (req, res) => {
    try {
        const updateData = {
            isPublic: !!req.body.isPublic,
            profile: {
                name: req.body.name,
                bio: req.body.bio,
                location: req.body.location,
                favoriteGenres: req.body.favoriteGenres?.split(',').map(genre => genre.trim()) || [],
                avatarUrl: req.body.avatarUrl,
                bannerUrl: req.body.bannerUrl,
                socialLinks: {
                    discogs: req.body.discogsLink,
                    instagram: req.body.instagramLink,
                    twitter: req.body.twitterLink
                },
                showStats: !!req.body.showStats
            }
        };

        await User.findByIdAndUpdate(req.user._id, updateData);
        
        req.session.message = { type: 'success', text: 'Profile updated successfully!' };
        res.redirect('/records/settings');
    } catch (err) {
        res.render('records/settings', {
            title: 'Profile Settings',
            error: 'Error updating settings',
            user: req.user
        });
    }
});

router.post('/settings/top8', async (req, res) => {
    try {
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
    } catch (err) {
        console.error('Error updating top 8:', err);
        res.status(500).json({ error: 'Error updating top 8' });
    }
});

// Create new record
router.post('/', async (req, res) => {
    try {
        // Add owner and process tags
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

// Add record from Discogs
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

// Show single record
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

// Show edit form
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

// Track record play
router.post('/:id/play', async (req, res) => {
    try {
        const record = await Record.findById(req.params.id);
        if (!record) return res.redirect('/records');
        
        // Increment plays and update last played date
        record.plays += 1;
        record.lastPlayed = new Date();
        await record.save();

        res.redirect(`/records/${record._id}`);
    } catch (err) {
        res.redirect('/records');
    }
});

// Update record
router.put('/:id', async (req, res) => {
    try {
        // Process tags if provided
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

// Delete record
router.delete('/:id', async (req, res) => {
    try {
        await Record.findByIdAndDelete(req.params.id);
        res.redirect('/records');
    } catch (err) {
        res.redirect('/records');
    }
});

module.exports = router;