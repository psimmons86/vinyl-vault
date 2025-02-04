const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Constants for validation
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1900;

const recordSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        maxlength: [200, 'Title cannot be longer than 200 characters']
    },
    artist: {
        type: String,
        required: [true, 'Artist is required'],
        trim: true,
        maxlength: [200, 'Artist name cannot be longer than 200 characters']
    },
    year: {
        type: Number,
        min: [MIN_YEAR, `Year must be ${MIN_YEAR} or later`],
        max: [CURRENT_YEAR, 'Year cannot be in the future']
    },
    format: {
        type: String,
        enum: ['LP', 'EP', 'Single'],
        default: 'LP'
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [50, 'Tag cannot be longer than 50 characters']
    }],
    plays: {
        type: Number,
        default: 0,
        min: [0, 'Plays cannot be negative']
    },
    lastPlayed: Date,
    imageUrl: {
        type: String,
        trim: true,
        default: '/images/default-album.png'
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot be longer than 1000 characters']
    },
    value: {
        type: Number,
        min: [0, 'Value cannot be negative'],
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
recordSchema.index({ owner: 1, createdAt: -1 }); // For listing records
recordSchema.index({ owner: 1, artist: 1 }); // For artist-based queries
recordSchema.index({ owner: 1, tags: 1 }); // For tag-based filtering
recordSchema.index({ owner: 1, plays: -1 }); // For most played queries
recordSchema.index({ owner: 1, lastPlayed: -1 }); // For recently played queries

// Virtual for formatted date
recordSchema.virtual('formattedLastPlayed').get(function() {
    if (!this.lastPlayed) return 'Never played';
    return this.lastPlayed.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

// Virtual for time since last played
recordSchema.virtual('timeSinceLastPlayed').get(function() {
    if (!this.lastPlayed) return 'Never played';
    const now = new Date();
    const diff = now - this.lastPlayed;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
});

// Pre-save middleware
recordSchema.pre('save', function(next) {
    // Clean up tags
    if (this.isModified('tags')) {
        this.tags = this.tags
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0);
        
        // Remove duplicates
        this.tags = [...new Set(this.tags)];
    }
    
    next();
});

// Instance methods
recordSchema.methods.incrementPlays = async function() {
    this.plays += 1;
    this.lastPlayed = new Date();
    return this.save();
};

recordSchema.methods.addTag = async function(tag) {
    if (!this.tags.includes(tag.toLowerCase())) {
        this.tags.push(tag.toLowerCase());
        return this.save();
    }
    return this;
};

recordSchema.methods.removeTag = async function(tag) {
    this.tags = this.tags.filter(t => t !== tag.toLowerCase());
    return this.save();
};

// Static methods
recordSchema.statics.findByTag = function(ownerId, tag) {
    return this.find({
        owner: ownerId,
        tags: tag.toLowerCase()
    });
};

recordSchema.statics.findMostPlayed = function(ownerId, limit = 10) {
    return this.find({
        owner: ownerId,
        plays: { $gt: 0 }
    })
    .sort('-plays')
    .limit(limit);
};

module.exports = mongoose.model('Record', recordSchema);
