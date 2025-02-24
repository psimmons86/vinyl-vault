const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Activity = require('../models/activity');
const Record = require('../models/record');
const bcrypt = require('bcrypt');
const asyncHandler = require('../middleware/async-handler');
const { validateSignUp, validateSignIn, authLimiter } = require('../middleware/validate');
const { SALT_ROUNDS, MAX_LOGIN_ATTEMPTS, LOGIN_TIMEOUT } = require('../config/security');

// Apply rate limiting to all auth routes
router.use(authLimiter);

// Helper function to get recent records for auth pages
const getRecentRecords = async () => {
    return Record.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('owner', 'username');
};

router.get('/sign-up', asyncHandler(async (req, res) => {
    const recentRecords = await getRecentRecords();
    res.render('auth/sign-up', { 
        title: 'Sign Up',
        error: null,
        username: '',
        recentRecords
    });
}));

router.post('/sign-up', validateSignUp, asyncHandler(async (req, res) => {
    const [existingUser, recentRecords] = await Promise.all([
        User.findOne({ username: req.body.username.toLowerCase() }),
        getRecentRecords()
    ]);

    if (existingUser) {
        return res.render('auth/sign-up', {
            title: 'Sign Up',
            error: 'Username already exists',
            username: req.body.username,
            recentRecords
        });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, SALT_ROUNDS);
    const user = await User.create({
        username: req.body.username.toLowerCase(),
        password: hashedPassword,
        profile: {
            name: req.body.username,
            showStats: true
        },
        loginAttempts: 0,
        lastLoginAttempt: null
    });
    
    await Activity.create({
        user: user._id,
        activityType: 'signup'
    });

    // Set session with user data including admin status
    req.session.user = {
        _id: user._id,
        username: user.username,
        isAdmin: user.isAdmin
    };
    
    // Wait for session to be saved before redirecting
    await new Promise((resolve) => req.session.save(resolve));
    res.redirect('/records');
}));

router.get('/sign-in', asyncHandler(async (req, res) => {
    const recentRecords = await getRecentRecords();
    res.render('auth/sign-in', { 
        title: 'Sign In',
        error: null,
        recentRecords
    });
}));

router.post('/sign-in', validateSignIn, asyncHandler(async (req, res) => {
    const [user, recentRecords] = await Promise.all([
        User.findOne({ username: req.body.username.toLowerCase() }),
        getRecentRecords()
    ]);
    
    if (!user) {
        return res.render('auth/sign-in', {
            title: 'Sign In',
            error: 'Invalid username or password',
            recentRecords
        });
    }

    // Check for too many login attempts
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS && 
        user.lastLoginAttempt && 
        Date.now() - user.lastLoginAttempt < LOGIN_TIMEOUT) {
        return res.render('auth/sign-in', {
            title: 'Sign In',
            error: 'Account temporarily locked. Please try again later.',
            recentRecords
        });
    }

    const isValidPassword = await bcrypt.compare(req.body.password, user.password);
    
    if (!isValidPassword) {
        // Increment login attempts
        await User.updateOne(
            { _id: user._id },
            {
                $inc: { loginAttempts: 1 },
                $set: { lastLoginAttempt: Date.now() }
            }
        );
        
        return res.render('auth/sign-in', {
            title: 'Sign In',
            error: 'Invalid username or password',
            recentRecords
        });
    }

    // Reset login attempts on successful login
    await User.updateOne(
        { _id: user._id },
        {
            $set: { 
                loginAttempts: 0,
                lastLoginAttempt: null,
                lastLoginAt: Date.now()
            }
        }
    );

    // Set session with user data including admin status
    req.session.user = {
        _id: user._id,
        username: user.username,
        isAdmin: user.isAdmin
    };
    
    // Wait for both session save and activity creation
    await Promise.all([
        new Promise((resolve) => req.session.save(resolve)),
        Activity.create({
            user: user._id,
            activityType: 'login'
        })
    ]);
    
    res.redirect('/records');
}));

router.get('/sign-out', asyncHandler(async (req, res) => {
    if (req.session.user) {
        // Record logout activity
        await Activity.create({
            user: req.session.user._id,
            activityType: 'logout'
        });
    }
    
    await new Promise((resolve) => req.session.destroy(resolve));
    res.clearCookie('_sid'); // Clear session cookie
    res.redirect('/');
}));

module.exports = router;
