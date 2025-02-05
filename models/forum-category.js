const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const forumCategorySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    description: String,
    icon: {
        type: String,
        default: 'forum' // Default material icon
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    moderators: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    topicCount: {
        type: Number,
        default: 0
    },
    postCount: {
        type: Number,
        default: 0
    },
    lastPost: {
        topic: {
            type: Schema.Types.ObjectId,
            ref: 'ForumTopic'
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: Date
    }
}, {
    timestamps: true
});

// Index for efficient queries
forumCategorySchema.index({ slug: 1 });
forumCategorySchema.index({ order: 1 });

module.exports = mongoose.model('ForumCategory', forumCategorySchema);
