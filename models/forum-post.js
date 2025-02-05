const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const forumPostSchema = new Schema({
    topic: {
        type: Schema.Types.ObjectId,
        ref: 'ForumTopic',
        required: true
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editHistory: [{
        content: String,
        editedAt: Date,
        editedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    likes: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    attachments: [{
        url: String,
        filename: String,
        mimetype: String
    }],
    quotes: [{
        post: {
            type: Schema.Types.ObjectId,
            ref: 'ForumPost'
        },
        content: String
    }],
    flags: [{
        reason: {
            type: String,
            required: true
        },
        flaggedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        flaggedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'resolved', 'dismissed'],
            default: 'pending'
        }
    }],
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    deletedAt: Date
}, {
    timestamps: true
});

// Indexes for efficient queries
forumPostSchema.index({ topic: 1, createdAt: 1 });
forumPostSchema.index({ author: 1, createdAt: -1 });
forumPostSchema.index({ 'flags.status': 1 });

// Virtual for formatted creation date
forumPostSchema.virtual('formattedCreatedAt').get(function() {
    return this.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

module.exports = mongoose.model('ForumPost', forumPostSchema);
