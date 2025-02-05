const express = require('express');
const router = express.Router();
const ForumCategory = require('../models/forum-category');
const ForumTopic = require('../models/forum-topic');
const ForumPost = require('../models/forum-post');
const asyncHandler = require('../middleware/async-handler');
const ensureSignedIn = require('../middleware/ensure-signed-in');
const slugify = require('slugify');

// Get all categories and recent activity
router.get('/', asyncHandler(async (req, res) => {
    const categories = await ForumCategory.find({ isActive: true })
        .sort('order')
        .populate('moderators', 'username profile.name profile.avatarUrl')
        .populate({
            path: 'lastPost.topic',
            select: 'title slug'
        })
        .populate({
            path: 'lastPost.user',
            select: 'username profile.name profile.avatarUrl'
        });

    // Get recent topics across all categories
    const recentTopics = await ForumTopic.find()
        .sort('-lastPost.createdAt')
        .limit(5)
        .populate('author', 'username profile.name profile.avatarUrl')
        .populate('category', 'name slug');

    res.render('forum/index', {
        title: 'Forum',
        categories,
        recentTopics
    });
}));

// Get category and its topics
router.get('/category/:slug', asyncHandler(async (req, res) => {
    const category = await ForumCategory.findOne({ 
        slug: req.params.slug,
        isActive: true
    }).populate('moderators', 'username profile.name profile.avatarUrl');

    if (!category) {
        return res.status(404).render('shared/404');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const [topics, totalTopics] = await Promise.all([
        ForumTopic.find({ category: category._id })
            .sort({ isPinned: -1, 'lastPost.createdAt': -1 })
            .skip(skip)
            .limit(limit)
            .populate('author', 'username profile.name profile.avatarUrl')
            .populate({
                path: 'lastPost.user',
                select: 'username profile.name profile.avatarUrl'
            }),
        ForumTopic.countDocuments({ category: category._id })
    ]);

    res.render('forum/category', {
        title: category.name,
        category,
        topics,
        pagination: {
            page,
            pageCount: Math.ceil(totalTopics / limit)
        }
    });
}));

// Get topic and its posts
router.get('/topic/:slug', asyncHandler(async (req, res) => {
    const topic = await ForumTopic.findOne({ slug: req.params.slug })
        .populate('author', 'username profile.name profile.avatarUrl')
        .populate('category', 'name slug')
        .populate('likes', 'username');

    if (!topic) {
        return res.status(404).render('shared/404');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const [posts, totalPosts] = await Promise.all([
        ForumPost.find({ 
            topic: topic._id,
            isDeleted: false
        })
            .sort('createdAt')
            .skip(skip)
            .limit(limit)
            .populate('author', 'username profile.name profile.avatarUrl')
            .populate('likes', 'username')
            .populate({
                path: 'quotes.post',
                populate: {
                    path: 'author',
                    select: 'username profile.name'
                }
            }),
        ForumPost.countDocuments({ 
            topic: topic._id,
            isDeleted: false
        })
    ]);

    // Increment view count
    if (req.user) {
        topic.views += 1;
        await topic.save();
    }

    res.render('forum/topic', {
        title: topic.title,
        topic,
        posts,
        pagination: {
            page,
            pageCount: Math.ceil(totalPosts / limit)
        }
    });
}));

// Create new topic form
router.get('/new-topic/:categorySlug', ensureSignedIn, asyncHandler(async (req, res) => {
    const category = await ForumCategory.findOne({ 
        slug: req.params.categorySlug,
        isActive: true
    });

    if (!category) {
        return res.status(404).render('shared/404');
    }

    res.render('forum/new-topic', {
        title: 'New Topic',
        category
    });
}));

// Create new topic
router.post('/new-topic/:categorySlug', ensureSignedIn, asyncHandler(async (req, res) => {
    const category = await ForumCategory.findOne({ 
        slug: req.params.categorySlug,
        isActive: true
    });

    if (!category) {
        return res.status(404).render('shared/404');
    }

    const slug = slugify(req.body.title, {
        lower: true,
        strict: true
    });

    // Create topic and initial post
    const topic = await ForumTopic.create({
        title: req.body.title,
        slug,
        content: req.body.content,
        category: category._id,
        author: req.user._id,
        tags: req.body.tags?.split(',').map(tag => tag.trim()),
        lastPost: {
            user: req.user._id,
            createdAt: new Date()
        }
    });

    await ForumPost.create({
        topic: topic._id,
        author: req.user._id,
        content: req.body.content
    });

    // Update category counts
    category.topicCount += 1;
    category.postCount += 1;
    category.lastPost = {
        topic: topic._id,
        user: req.user._id,
        createdAt: new Date()
    };
    await category.save();

    res.redirect(`/forum/topic/${topic.slug}`);
}));

// Reply to topic
router.post('/topic/:slug/reply', ensureSignedIn, asyncHandler(async (req, res) => {
    const topic = await ForumTopic.findOne({ slug: req.params.slug });
    if (!topic || topic.isLocked) {
        return res.status(404).render('shared/404');
    }

    // Create post
    const post = await ForumPost.create({
        topic: topic._id,
        author: req.user._id,
        content: req.body.content,
        quotes: req.body.quotes ? JSON.parse(req.body.quotes) : []
    });

    // Update topic and category
    topic.postCount += 1;
    topic.lastPost = {
        user: req.user._id,
        createdAt: new Date()
    };
    await topic.save();

    const category = await ForumCategory.findById(topic.category);
    category.postCount += 1;
    category.lastPost = {
        topic: topic._id,
        user: req.user._id,
        createdAt: new Date()
    };
    await category.save();

    // If AJAX request, return post HTML
    if (req.xhr) {
        const populatedPost = await ForumPost.findById(post._id)
            .populate('author', 'username profile.name profile.avatarUrl')
            .populate({
                path: 'quotes.post',
                populate: {
                    path: 'author',
                    select: 'username profile.name'
                }
            });

        res.render('forum/partials/post', {
            post: populatedPost,
            topic
        });
    } else {
        res.redirect(`/forum/topic/${topic.slug}`);
    }
}));

// Like/unlike topic
router.post('/topic/:slug/like', ensureSignedIn, asyncHandler(async (req, res) => {
    const topic = await ForumTopic.findOne({ slug: req.params.slug });
    if (!topic) {
        return res.status(404).json({ error: 'Topic not found' });
    }

    const userLikeIndex = topic.likes.indexOf(req.user._id);
    if (userLikeIndex === -1) {
        topic.likes.push(req.user._id);
    } else {
        topic.likes.splice(userLikeIndex, 1);
    }
    await topic.save();

    res.json({ likes: topic.likes.length });
}));

// Like/unlike post
router.post('/post/:id/like', ensureSignedIn, asyncHandler(async (req, res) => {
    const post = await ForumPost.findById(req.params.id);
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }

    const userLikeIndex = post.likes.indexOf(req.user._id);
    if (userLikeIndex === -1) {
        post.likes.push(req.user._id);
    } else {
        post.likes.splice(userLikeIndex, 1);
    }
    await post.save();

    res.json({ likes: post.likes.length });
}));

// Flag post
router.post('/post/:id/flag', ensureSignedIn, asyncHandler(async (req, res) => {
    const post = await ForumPost.findById(req.params.id);
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }

    post.flags.push({
        reason: req.body.reason,
        flaggedBy: req.user._id
    });
    await post.save();

    res.json({ success: true });
}));

module.exports = router;
