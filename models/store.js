const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const storeSchema = new Schema({
    placeId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    address: String,
    location: {
        lat: Number,
        lng: Number
    },
    rating: Number,
    photos: [String],
    website: String,
    discogsUsername: String, // Discogs seller username for inventory lookup
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for geospatial queries
storeSchema.index({ 'location': '2dsphere' });

// Index for place ID lookups
storeSchema.index({ placeId: 1 });

module.exports = mongoose.model('Store', storeSchema);
