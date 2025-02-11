/**
 * Input validation middleware
 */

const { 
    PASSWORD_MIN_LENGTH, 
    PASSWORD_REGEX, 
    USERNAME_REGEX 
} = require('../config/security');

const rateLimit = require('express-rate-limit');

// Rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});

const validateSignUp = (req, res, next) => {
    const { username, password, confirmPassword } = req.body;
    const errors = [];

    // Validate username
    if (!username || !USERNAME_REGEX.test(username)) {
        errors.push('Username must be 3-20 characters and can only contain letters, numbers, underscores, and hyphens');
    }

    // Validate password
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
    }
    if (!PASSWORD_REGEX.test(password)) {
        errors.push('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
        errors.push('Passwords do not match');
    }

    if (errors.length > 0) {
        return res.render('auth/sign-up', {
            title: 'Sign Up',
            error: errors.join('. '),
            username: username // Preserve the username input
        });
    }

    next();
};

const validateSignIn = (req, res, next) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.render('auth/sign-in', {
            title: 'Sign In',
            error: 'Username and password are required'
        });
    }

    // Add basic sanitization
    req.body.username = username.trim().toLowerCase();
    req.body.password = password.trim();

    next();
};

// Helper function to sanitize and validate URLs
const validateUrl = (url) => {
    if (!url) return '';
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : '';
    } catch {
        return '';
    }
};

// Middleware to sanitize profile URLs
const sanitizeProfileUrls = (req, res, next) => {
    if (req.body.profile) {
        if (req.body.profile.socialLinks) {
            req.body.profile.socialLinks.discogs = validateUrl(req.body.profile.socialLinks.discogs);
            req.body.profile.socialLinks.instagram = validateUrl(req.body.profile.socialLinks.instagram);
            req.body.profile.socialLinks.twitter = validateUrl(req.body.profile.socialLinks.twitter);
        }
        if (req.body.profile.avatarUrl) {
            req.body.profile.avatarUrl = validateUrl(req.body.profile.avatarUrl);
        }
        if (req.body.profile.bannerUrl) {
            req.body.profile.bannerUrl = validateUrl(req.body.profile.bannerUrl);
        }
    }
    next();
};

module.exports = {
    authLimiter,
    validateSignUp,
    validateSignIn,
    sanitizeProfileUrls
};
