const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const forumTopicSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'ForumCategory',
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    views: {
        type: Number,
        default: 0
    },
    lastPost: {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: Date
    },
    tags: [{
        type: String
    }],
    postCount: {
        type: Number,
        default: 0
    },
    likes: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    subscribers: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    attachments: [{
        url: String,
        filename: String,
        mimetype: String
    }]
}, {
    timestamps: true
});

// Indexes for efficient queries
forumTopicSchema.index({ category: 1, createdAt: -1 });
forumTopicSchema.index({ slug: 1 });
forumTopicSchema.index({ tags: 1 });
forumTopicSchema.index({ 'lastPost.createdAt': -1 });

module.exports = mongoose.model('ForumTopic', forumTopicSchema);
