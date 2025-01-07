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
        enum: ['signup', 'add_record', 'play_record'],
        required: true
    },

    record: {
        type: Schema.Types.ObjectId,
        ref: 'Record',
        required: function() {
            return ['add_record', 'play_record'].includes(this.activityType);
        }
    },
    
    details: {
        type: Schema.Types.Mixed
    }
}, {
    timestamps: true
});


activitySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);