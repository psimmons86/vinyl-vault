/**
 * Security configuration constants
 */

module.exports = {
    // Password requirements
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])(?!.*\s).{8,}$/,
    
    // Username requirements
    USERNAME_REGEX: /^[a-zA-Z0-9_\-]{3,20}$/,
    
    // Login attempt limits
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_TIMEOUT: 15 * 60 * 1000, // 15 minutes
    
    // Password hashing
    SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10,
    
    // Session configuration
    SESSION_CONFIG: {
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        name: '_sid',
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'lax'
        },
        proxy: true
    }
};
