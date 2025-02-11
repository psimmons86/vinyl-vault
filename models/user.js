const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { 
    PASSWORD_MIN_LENGTH, 
    PASSWORD_REGEX,
    MAX_LOGIN_ATTEMPTS,
    LOGIN_TIMEOUT,
    SALT_ROUNDS
} = require('../config/security');
const bcrypt = require('bcrypt');

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    validate: {
      validator: function(password) {
        return password.length >= PASSWORD_MIN_LENGTH && PASSWORD_REGEX.test(password);
      },
      message: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character'
    }
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lastLoginAttempt: {
    type: Date
  },
  accountLocked: {
    type: Boolean,
    default: false
  },
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  profile: {
    name: String,
    bio: String,
    location: String,
    favoriteGenres: [String],
    avatarUrl: String,
    socialLinks: {
      discogs: String,
      instagram: String,
      twitter: String
    },
    bannerUrl: String,
    top8Records: [{
      type: Schema.Types.ObjectId,
      ref: 'Record'
    }],
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    showStats: {
      type: Boolean,
      default: true
    }
  },
  following: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  posts: [{
    content: String,
    imageUrl: String,
    recordRef: {
      type: Schema.Types.ObjectId,
      ref: 'Record'
    },
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    comments: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      content: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for common queries
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ loginAttempts: 1, lastLoginAttempt: 1 });
userSchema.index({ isPublic: 1, username: 1 });
userSchema.index({ 'profile.name': 1 });
userSchema.index({ following: 1 });
userSchema.index({ followers: 1 });
userSchema.index({ 'posts.createdAt': -1 });
userSchema.index({ 'posts.likes': 1 });
userSchema.index({ 'profile.favoriteGenres': 1 });

// Text index for search
userSchema.index(
    { 
        'username': 'text',
        'profile.name': 'text',
        'profile.bio': 'text',
        'profile.location': 'text'
    },
    {
        weights: {
            username: 3,
            'profile.name': 2,
            'profile.bio': 1,
            'profile.location': 1
        },
        name: 'UserTextIndex'
    }
);

// Query helpers
userSchema.query.byUsername = function(username) {
    return this.where({ username: new RegExp(`^${username}$`, 'i') });
};

userSchema.query.publicProfiles = function() {
    return this.where({ isPublic: true });
};

userSchema.query.withBasicInfo = function() {
    return this.select('username profile.name profile.avatarUrl isPublic');
};

// Instance methods
userSchema.methods = {
    // Check if account is locked
    isAccountLocked() {
        if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS && 
            this.lastLoginAttempt && 
            Date.now() - this.lastLoginAttempt < LOGIN_TIMEOUT) {
            return true;
        }
        return false;
    },

    // Verify password
    async verifyPassword(password) {
        try {
            return await bcrypt.compare(password, this.password);
        } catch (error) {
            console.error('Password verification error:', error);
            return false;
        }
    },

    // Follow user
    async follow(userId) {
        if (this.following.includes(userId)) return this;
        
        this.following.push(userId);
        await this.save();
        
        await mongoose.model('User').findByIdAndUpdate(
            userId,
            { $addToSet: { followers: this._id } }
        );
        
        return this;
    },

    // Unfollow user
    async unfollow(userId) {
        this.following = this.following.filter(id => id.toString() !== userId.toString());
        await this.save();
        
        await mongoose.model('User').findByIdAndUpdate(
            userId,
            { $pull: { followers: this._id } }
        );
        
        return this;
    },

    // Add post
    async addPost(postData) {
        this.posts.unshift({
            ...postData,
            createdAt: new Date()
        });
        return this.save();
    },

    // Remove post
    async removePost(postId) {
        this.posts = this.posts.filter(post => post._id.toString() !== postId.toString());
        return this.save();
    }
};

// Static methods
userSchema.statics = {
    // Find by username case insensitive
    async findByUsername(username) {
        return this.findOne({ username: new RegExp(`^${username}$`, 'i') });
    },

    // Search users
    async searchUsers(query, options = {}) {
        const { limit = 10, skip = 0, publicOnly = true } = options;
        
        const searchQuery = {
            $text: { $search: query }
        };
        
        if (publicOnly) {
            searchQuery.isPublic = true;
        }
        
        return this.find(searchQuery)
            .select('username profile.name profile.avatarUrl isPublic')
            .sort({ score: { $meta: 'textScore' } })
            .skip(skip)
            .limit(limit)
            .lean();
    },

    // Get user stats
    async getUserStats(userId) {
        const [user, recordCount, totalPlays] = await Promise.all([
            this.findById(userId)
                .select('following followers posts')
                .lean(),
            mongoose.model('Record').countDocuments({ owner: userId }),
            mongoose.model('Record').aggregate([
                { $match: { owner: mongoose.Types.ObjectId(userId) } },
                { $group: { _id: null, total: { $sum: '$plays' } } }
            ])
        ]);

        return {
            followingCount: user.following.length,
            followersCount: user.followers.length,
            postsCount: user.posts.length,
            recordCount,
            totalPlays: totalPlays[0]?.total || 0
        };
    }
};

// Middleware
userSchema.pre('save', async function(next) {
    try {
        // Hash password if modified
        if (this.isModified('password')) {
            this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
            this.lastPasswordChange = new Date();
        }

        // Clean up profile data
        if (this.isModified('profile')) {
            // Trim strings
            if (this.profile.name) this.profile.name = this.profile.name.trim();
            if (this.profile.bio) this.profile.bio = this.profile.bio.trim();
            if (this.profile.location) this.profile.location = this.profile.location.trim();

            // Clean up favorite genres
            if (this.profile.favoriteGenres) {
                this.profile.favoriteGenres = [...new Set(
                    this.profile.favoriteGenres
                        .map(genre => genre.trim().toLowerCase())
                        .filter(genre => genre.length > 0)
                )];
            }

            // Validate social links
            const validateUrl = (url) => {
                if (!url) return '';
                try {
                    const parsed = new URL(url);
                    return parsed.protocol === 'http:' || parsed.protocol === 'https:' 
                        ? url : '';
                } catch {
                    return '';
                }
            };

            if (this.profile.socialLinks) {
                this.profile.socialLinks.discogs = validateUrl(this.profile.socialLinks.discogs);
                this.profile.socialLinks.instagram = validateUrl(this.profile.socialLinks.instagram);
                this.profile.socialLinks.twitter = validateUrl(this.profile.socialLinks.twitter);
            }
        }

        next();
    } catch (error) {
        next(error);
    }
});

// Clean up user data when deleted
userSchema.pre('remove', async function(next) {
    try {
        // Remove user's records
        await mongoose.model('Record').deleteMany({ owner: this._id });
        
        // Remove user from others' following/followers lists
        await mongoose.model('User').updateMany(
            { $or: [
                { following: this._id },
                { followers: this._id }
            ]},
            { 
                $pull: { 
                    following: this._id,
                    followers: this._id
                }
            }
        );
        
        // Remove user's likes and comments
        await mongoose.model('User').updateMany(
            { 'posts.likes': this._id },
            { $pull: { 'posts.$.likes': this._id } }
        );
        
        await mongoose.model('User').updateMany(
            { 'posts.comments.user': this._id },
            { $pull: { 'posts.$.comments': { user: this._id } } }
        );

        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('User', userSchema);
