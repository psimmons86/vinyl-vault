const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const activitySchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    activityType: {
        type: String,
        enum: [
            'signup',
            'login',
            'logout',
            'add_record',
            'play_record',
            'like_record',
            'follow_user',
            'comment',
            'update_profile_picture',
            'update_location'
        ],
        required: true
    },
    record: {
        type: Schema.Types.ObjectId,
        ref: 'Record',
        required: function() {
            return ['add_record', 'play_record', 'like_record'].includes(this.activityType);
        }
    },
    targetUser: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: function() {
            return this.activityType === 'follow_user';
        }
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
        required: function() {
            return this.activityType === 'comment';
        }
    },
    details: {
        type: Object,
        default: {}
    }
}, {
    timestamps: true
});

activitySchema.index({ createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
