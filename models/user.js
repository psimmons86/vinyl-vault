const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    // New profile fields
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
        showStats: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);