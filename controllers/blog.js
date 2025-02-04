const express = require('express');
const router = express.Router();
const Post = require('../models/post');
const FeaturedRecord = require('../models/featured');
const ensureSignedIn = require('../middleware/ensure-signed-in');
const ensureAdmin = require('../middleware/ensure-admin');
const asyncHandler = require('../middleware/async-handler');
const multer = require('multer');
const path = require('path');

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

// Blog home page with posts and featured records
router.get('/', asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const [posts, featured, total] = await Promise.all([
        Post.find({ approved: true })
            .populate('author', 'username isAdmin')
            .sort('-createdAt')
            .skip(skip)
            .limit(limit)
            .lean(),
        FeaturedRecord.find()
            .sort('order')
            .lean(),
        Post.countDocuments({ approved: true })
    ]);

    res.render('blog/index', {
        title: 'Blog',
        posts,
        featured,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
    });
}));

// New post form
router.get('/new', (req, res) => {
    res.render('blog/new', { title: 'New Post' });
});

// Create post
router.post('/', upload.single('coverImage'), asyncHandler(async (req, res) => {
    const { title, content, tags } = req.body;
    
    const post = new Post({
        title,
        content,
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
        post
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
    const post = await Post.findOne({
        slug: req.params.slug,
        author: req.user._id
    });

    if (!post) {
        return res.status(404).render('shared/404');
    }

    post.title = req.body.title;
    post.content = req.body.content;
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
router.delete('/:slug', asyncHandler(async (req, res) => {
    const post = await Post.findOne({
        slug: req.params.slug,
        author: req.user._id
    });

    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }

    await post.remove();
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

router.post('/admin/featured', ensureAdmin, upload.single('albumArt'), asyncHandler(async (req, res) => {
    const { title, artist, description, link, order } = req.body;
    
    if (!req.file) {
        throw new Error('Album art is required');
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
    res.redirect('/blog/admin/featured');
}));

router.delete('/admin/featured/:id', ensureAdmin, asyncHandler(async (req, res) => {
    await FeaturedRecord.findByIdAndDelete(req.params.id);
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
