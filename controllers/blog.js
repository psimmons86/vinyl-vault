const express = require('express');
const router = express.Router();
const fs = require('fs/promises');
const Post = require('../models/post');
const FeaturedRecord = require('../models/featured');
const Record = require('../models/record');
const ensureSignedIn = require('../middleware/ensure-signed-in');
const ensureAdmin = require('../middleware/ensure-admin');
const asyncHandler = require('../middleware/async-handler');
const multer = require('multer');
const path = require('path');
const { marked } = require('marked');
const discogsService = require('../services/discogs');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/blog')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ 
    storage: storage,
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

// Remove ensure-signed-in middleware from public routes
router.use([
    '/admin/pending',
    '/admin/featured',
    '/*/edit',
    '/*/delete'
], ensureSignedIn);

// Ensure blog uploads directory exists
async function ensureBlogUploadsDir() {
    const dir = 'public/uploads/blog';
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

// Blog home page with posts and featured records
router.get('/', asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const category = req.query.category;
    const query = { approved: true };
    if (category) {
        query.category = category;
    }

    // Ensure uploads directory exists
    await ensureBlogUploadsDir();

    const [posts, featured, total] = await Promise.all([
        Post.find(query)
            .populate('author', 'username isAdmin')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit)
            .lean(),
        FeaturedRecord.find()
            .sort('order')
            .lean(),
        Post.countDocuments(query)
    ]);

    res.render('blog/index', {
        title: category ? `${category.replace(/-/g, ' ').replace(/(^|\s)\S/g, l => l.toUpperCase())}` : 'Blog',
        posts,
        featured,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        user: req.user,
        category
    });
}));

// New post form
router.get('/new', (req, res) => {
    res.render('blog/new', { title: 'New Post' });
});

// Create post
router.post('/', upload.single('coverImage'), asyncHandler(async (req, res) => {
    // Ensure uploads directory exists
    await ensureBlogUploadsDir();
    const { title, content, tags, category } = req.body;
    
    const post = new Post({
        title,
        content,
        category,
        author: req.user._id,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        approved: req.user.isAdmin, // Auto-approve admin posts
        coverImage: req.file ? '/uploads/blog/' + req.file.filename : undefined
    });

    await post.save();
    
    if (req.user.isAdmin) {
        req.flash('success', 'Post published successfully');
    } else {
        req.flash('success', 'Post submitted for approval');
    }
    
    res.redirect('/blog');
}));

// Show post
router.get('/:slug', asyncHandler(async (req, res) => {
    const post = await Post.findOne({ 
        slug: req.params.slug,
        $or: [
            { approved: true },
            { author: req.user?._id }
        ]
    }).populate('author', 'username isAdmin');

    if (!post) {
        return res.status(404).render('shared/404');
    }

    res.render('blog/show', { 
        title: post.title,
        post,
        marked
    });
}));

// Edit post form
router.get('/:slug/edit', asyncHandler(async (req, res) => {
    const post = await Post.findOne({
        slug: req.params.slug,
        author: req.user._id
    });

    if (!post) {
        return res.status(404).render('shared/404');
    }

    res.render('blog/edit', {
        title: 'Edit Post',
        post
    });
}));

// Update post
router.put('/:slug', upload.single('coverImage'), asyncHandler(async (req, res) => {
    // Ensure uploads directory exists
    await ensureBlogUploadsDir();
    const post = await Post.findOne({
        slug: req.params.slug,
        author: req.user._id
    });

    if (!post) {
        return res.status(404).render('shared/404');
    }

    post.title = req.body.title;
    post.content = req.body.content;
    post.category = req.body.category;
    post.tags = req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [];
    
    if (req.file) {
        post.coverImage = '/uploads/blog/' + req.file.filename;
    }

    // Reset approval for non-admin edits
    if (!req.user.isAdmin) {
        post.approved = false;
    }

    await post.save();
    req.flash('success', 'Post updated successfully');
    res.redirect('/blog/' + post.slug);
}));

// Delete post
router.delete('/:slug', ensureAdmin, asyncHandler(async (req, res) => {
    // Find the post by slug instead of id
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) {
        req.flash('error', 'Post not found');
        return res.redirect('/blog');
    }

    // Delete the associated image if it exists
    if (post.coverImage) {
        const imagePath = path.join(__dirname, '../public', post.coverImage);
        try {
            await fs.unlink(imagePath);
        } catch (err) {
            console.error('Error deleting image:', err);
            // Continue with post deletion even if image deletion fails
        }
    }

    // Delete the post
    await Post.findByIdAndDelete(post._id);

    req.flash('success', 'Post deleted successfully');
    res.redirect('/blog');
}));

// Admin routes
router.get('/admin/pending', ensureAdmin, asyncHandler(async (req, res) => {
    const posts = await Post.find({ approved: false })
        .populate('author', 'username')
        .sort('-createdAt');

    res.render('blog/admin/pending', {
        title: 'Pending Posts',
        posts
    });
}));

router.post('/admin/approve/:id', ensureAdmin, asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }

    post.approved = true;
    await post.save();
    
    res.json({ success: true });
}));

router.delete('/admin/reject/:id', ensureAdmin, asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }

    await post.remove();
    res.json({ success: true });
}));

// Featured records routes
router.get('/admin/featured', ensureAdmin, asyncHandler(async (req, res) => {
    const featured = await FeaturedRecord.find().sort('order');
    res.render('blog/admin/featured', {
        title: 'Manage Featured Records',
        featured
    });
}));

// Search Discogs for featured records
router.get('/admin/featured/search-discogs', ensureAdmin, asyncHandler(async (req, res) => {
    const query = req.query.q;
    
    if (!query || query.trim().length === 0) {
        return res.json({ results: [] });
    }
    
    try {
        const results = await discogsService.searchRecords(query);
        res.json({ results });
    } catch (error) {
        console.error('Discogs search error:', error);
        res.status(500).json({ error: error.message });
    }
}));

// Add record from Discogs to featured records
router.post('/admin/featured/add-from-discogs', ensureAdmin, asyncHandler(async (req, res) => {
    const { releaseId } = req.body;
    
    try {
        // Get record details from Discogs
        const recordDetails = await discogsService.getRecordDetails(releaseId);
        
        // Check if record already exists in the database
        let record = await Record.findOne({
            title: recordDetails.title,
            artist: recordDetails.artist
        });
        
        // If record doesn't exist, create it and assign to admin
        if (!record) {
            record = new Record({
                title: recordDetails.title,
                artist: recordDetails.artist,
                year: recordDetails.year,
                format: recordDetails.format,
                imageUrl: recordDetails.imageUrl,
                tags: recordDetails.tags,
                owner: req.user._id,
                plays: 0,
                inHeavyRotation: true
            });
            
            await record.save();
        } else {
            // If record exists, update heavy rotation status
            record.inHeavyRotation = true;
            await record.save();
        }
        
        // Check if featured record already exists
        let featured = await FeaturedRecord.findOne({
            title: recordDetails.title,
            artist: recordDetails.artist
        });
        
        // If not, create it
        if (!featured) {
            const count = await FeaturedRecord.countDocuments();
            if (count >= 5) {
                // If we already have 5 records, replace the last one
                const lastFeatured = await FeaturedRecord.findOne().sort('-order');
                if (lastFeatured) {
                    lastFeatured.title = recordDetails.title;
                    lastFeatured.artist = recordDetails.artist;
                    lastFeatured.albumArt = recordDetails.imageUrl;
                    lastFeatured.link = record ? `/records/${record._id}` : undefined;
                    await lastFeatured.save();
                    
                    return res.json({ success: true, message: 'Replaced existing featured record' });
                } else {
                    return res.status(400).json({ error: 'Maximum of 5 featured records allowed' });
                }
            }
            
            featured = new FeaturedRecord({
                title: recordDetails.title,
                artist: recordDetails.artist,
                albumArt: recordDetails.imageUrl,
                order: count + 1,
                link: record ? `/records/${record._id}` : undefined
            });
            
            await featured.save();
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error adding record from Discogs:', error);
        res.status(500).json({ error: error.message });
    }
}));

router.post('/admin/featured', ensureAdmin, upload.single('albumArt'), asyncHandler(async (req, res) => {
    const { title, artist, description, link, order, _method, recordId } = req.body;
    
    // Handle PUT requests for editing
    if (_method === 'PUT') {
        const featured = await FeaturedRecord.findById(recordId);
        if (!featured) {
            throw new Error('Record not found');
        }

        featured.title = title;
        featured.artist = artist;
        featured.description = description;
        featured.link = link;
        featured.order = parseInt(order);

        if (req.file) {
            // Delete old image if it exists and isn't the default
            if (featured.albumArt && !featured.albumArt.includes('default-')) {
                try {
                    await fs.unlink('public' + featured.albumArt);
                } catch (err) {
                    console.error('Error deleting old album art:', err);
                }
            }
            featured.albumArt = '/uploads/blog/' + req.file.filename;
        }

        await featured.save();
        
        // Update corresponding record if it exists
        const record = await Record.findOne({
            title: featured.title,
            artist: featured.artist
        });
        
        if (record) {
            record.inHeavyRotation = true;
            await record.save();
        }
        
        req.flash('success', 'Record updated successfully');
        return res.redirect('/blog/admin/featured');
    }

    // Handle POST requests for new records
    if (!req.file) {
        throw new Error('Album art is required');
    }

    // Check if we already have 5 featured records
    const count = await FeaturedRecord.countDocuments();
    if (count >= 5) {
        req.flash('error', 'Maximum of 5 featured records allowed. Please remove one first.');
        return res.redirect('/blog/admin/featured');
    }

    const featured = new FeaturedRecord({
        title,
        artist,
        description,
        link,
        order: parseInt(order),
        albumArt: '/uploads/blog/' + req.file.filename
    });

    await featured.save();
    
    // Update corresponding record if it exists
    const record = await Record.findOne({
        title: featured.title,
        artist: featured.artist
    });
    
    if (record) {
        record.inHeavyRotation = true;
        await record.save();
    }
    
    req.flash('success', 'Record added successfully');
    res.redirect('/blog/admin/featured');
}));

router.delete('/admin/featured/:id', ensureAdmin, asyncHandler(async (req, res) => {
    const featured = await FeaturedRecord.findById(req.params.id);
    
    if (featured) {
        // Update corresponding record if it exists
        const record = await Record.findOne({
            title: featured.title,
            artist: featured.artist
        });
        
        if (record) {
            record.inHeavyRotation = false;
            await record.save();
        }
        
        await FeaturedRecord.findByIdAndDelete(req.params.id);
    }
    
    res.json({ success: true });
}));

router.put('/admin/featured/:id/order', ensureAdmin, asyncHandler(async (req, res) => {
    const { order } = req.body;
    const featured = await FeaturedRecord.findById(req.params.id);
    
    if (!featured) {
        return res.status(404).json({ error: 'Record not found' });
    }

    featured.order = parseInt(order);
    await featured.save();
    
    res.json({ success: true });
}));

module.exports = router;
