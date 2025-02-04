const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const featuredRecordSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    artist: {
        type: String,
        required: true
    },
    albumArt: {
        type: String,
        required: true
    },
    description: String,
    link: String, // Optional link to purchase or stream
    order: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    }
}, {
    timestamps: true
});

// Ensure only 5 records can be featured at a time
featuredRecordSchema.pre('save', async function(next) {
    if (this.isNew) {
        const count = await this.constructor.countDocuments();
        if (count >= 5) {
            throw new Error('Maximum of 5 featured records allowed');
        }
    }
    next();
});

// Keep order numbers unique and sequential
featuredRecordSchema.pre('save', async function(next) {
    if (this.isModified('order')) {
        // Get existing record at target order position
        const existing = await this.constructor.findOne({ 
            order: this.order,
            _id: { $ne: this._id }
        });
        
        if (existing) {
            // Shift other records to make room
            await this.constructor.updateMany(
                { 
                    order: { $gte: this.order },
                    _id: { $ne: this._id }
                },
                { $inc: { order: 1 } }
            );
        }
    }
    next();
});

module.exports = mongoose.model('FeaturedRecord', featuredRecordSchema);
