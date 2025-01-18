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
    }
  },
  showStats: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);