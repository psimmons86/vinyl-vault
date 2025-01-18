const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    // Can be a news article URL or activity ID
    target: {
        type: String,
        required: true
    },
    targetType: {
        type: String,
        enum: ['news', 'activity'],
        required: true
    }
}, {
    timestamps: true
});

commentSchema.index({ target: 1 });
commentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);