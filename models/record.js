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

// Compound indexes for common queries
recordSchema.index({ owner: 1, createdAt: -1 }); // For listing records by date
recordSchema.index({ owner: 1, artist: 1, title: 1 }); // For artist/title sorting and search
recordSchema.index({ owner: 1, tags: 1 }); // For tag-based filtering
recordSchema.index({ owner: 1, plays: -1, artist: 1 }); // For most played queries with artist sort
recordSchema.index({ owner: 1, lastPlayed: -1 }); // For recently played queries
recordSchema.index({ owner: 1, year: 1 }); // For year-based queries
recordSchema.index({ owner: 1, value: -1 }); // For value-based sorting

// Text index for search functionality
recordSchema.index(
    { title: 'text', artist: 'text', tags: 'text' },
    { 
        weights: {
            title: 3,
            artist: 2,
            tags: 1
        },
        name: 'RecordTextIndex'
    }
);

// Ensure owner field is always populated in queries
recordSchema.pre(/^find/, function() {
    if (!this._conditions.owner && !this._conditions.$and) {
        console.warn('Query executed without owner field:', this.getQuery());
    }
});

// Add query helper for common record listing
recordSchema.query.listForOwner = function(ownerId, options = {}) {
    const {
        sort = '-createdAt',
        limit = 50,
        skip = 0,
        tag = null,
        search = null,
        year = null
    } = options;

    const query = { owner: ownerId };
    
    if (tag) query.tags = tag;
    if (year) query.year = year;
    if (search) {
        query.$text = { $search: search };
    }

    return this.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('title artist imageUrl year plays tags createdAt')
        .lean();
};

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

// Enhanced pre-save middleware
recordSchema.pre('save', async function(next) {
    try {
        // Clean up tags
        if (this.isModified('tags')) {
            this.tags = [...new Set(
                this.tags
                    .map(tag => tag.trim().toLowerCase())
                    .filter(tag => tag.length > 0 && tag.length <= 50)
            )];
        }

        // Validate year
        if (this.isModified('year')) {
            const currentYear = new Date().getFullYear();
            if (this.year > currentYear) {
                this.year = currentYear;
            }
        }

        // Ensure non-negative values
        if (this.isModified('plays') && this.plays < 0) {
            this.plays = 0;
        }
        if (this.isModified('value') && this.value < 0) {
            this.value = 0;
        }

        next();
    } catch (error) {
        next(error);
    }
});

// Instance methods with error handling
recordSchema.methods.incrementPlays = async function() {
    try {
        this.plays = (this.plays || 0) + 1;
        this.lastPlayed = new Date();
        return await this.save();
    } catch (error) {
        console.error('Error incrementing plays:', error);
        throw error;
    }
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

// Enhanced static methods with better error handling and performance
recordSchema.statics = {
    async findByTag(ownerId, tag, options = {}) {
        const { limit = 50, skip = 0, sort = '-createdAt' } = options;
        
        return this.find({
            owner: ownerId,
            tags: tag.toLowerCase()
        })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('title artist imageUrl year plays tags')
        .lean();
    },

    async findMostPlayed(ownerId, options = {}) {
        const { limit = 10, minPlays = 1 } = options;
        
        return this.find({
            owner: ownerId,
            plays: { $gte: minPlays }
        })
        .sort('-plays artist')
        .limit(limit)
        .select('title artist plays lastPlayed imageUrl')
        .lean();
    },

    async getStats(ownerId) {
        const [
            totalCount,
            playsStats,
            topArtists,
            yearDistribution
        ] = await Promise.all([
            this.countDocuments({ owner: ownerId }),
            this.aggregate([
                { $match: { owner: mongoose.Types.ObjectId(ownerId) } },
                { $group: {
                    _id: null,
                    totalPlays: { $sum: '$plays' },
                    avgPlays: { $avg: '$plays' },
                    maxPlays: { $max: '$plays' }
                }}
            ]),
            this.aggregate([
                { $match: { owner: mongoose.Types.ObjectId(ownerId) } },
                { $group: {
                    _id: '$artist',
                    count: { $sum: 1 },
                    totalPlays: { $sum: '$plays' }
                }},
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            this.aggregate([
                { $match: {
                    owner: mongoose.Types.ObjectId(ownerId),
                    year: { $exists: true, $ne: null }
                }},
                { $group: {
                    _id: { $subtract: ['$year', { $mod: ['$year', 10] }] },
                    count: { $sum: 1 }
                }},
                { $sort: { '_id': 1 } }
            ])
        ]);

        return {
            totalRecords: totalCount,
            playsStats: playsStats[0] || { totalPlays: 0, avgPlays: 0, maxPlays: 0 },
            topArtists,
            yearDistribution
        };
    }
};

module.exports = mongoose.model('Record', recordSchema);
