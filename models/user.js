const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Constants for password validation
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

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

// Index for username lookups
userSchema.index({ username: 1 });

// Index for login attempts monitoring
userSchema.index({ loginAttempts: 1, lastLoginAttempt: 1 });

// Method to check if account is locked
userSchema.methods.isAccountLocked = function() {
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_TIME = 15 * 60 * 1000; // 15 minutes
  
  if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS && 
      this.lastLoginAttempt && 
      Date.now() - this.lastLoginAttempt < LOCK_TIME) {
    return true;
  }
  return false;
};

// Pre-save hook to hash password if modified
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const bcrypt = require('bcrypt');
    const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    this.lastPasswordChange = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);
