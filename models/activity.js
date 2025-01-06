const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const activitySchema = new Schema({
    // Link to the user who performed the activity
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Type of activity performed
    activityType: {
        type: String,
        enum: ['signup', 'add_record', 'play_record'],
        required: true
    },
    // Link to the record involved (if applicable)
    record: {
        type: Schema.Types.ObjectId,
        ref: 'Record',
        required: function() {
            return ['add_record', 'play_record'].includes(this.activityType);
        }
    },
    // Additional activity details if needed
    details: {
        type: Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index for quick retrieval of recent activities
activitySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);