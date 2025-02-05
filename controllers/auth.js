const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Activity = require('../models/activity');
const Record = require('../models/record');
const bcrypt = require('bcrypt');
const asyncHandler = require('../middleware/async-handler');
const { validateSignUp, validateSignIn } = require('../middleware/validate');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_TIMEOUT = 15 * 60 * 1000; // 15 minutes

router.get('/sign-up', asyncHandler(async (req, res) => {
    const recentRecords = await Record.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('owner', 'username');

    res.render('auth/sign-up', { 
        title: 'Sign Up',
        error: null,
        username: '',
        recentRecords
    });
}));

router.post('/sign-up', validateSignUp, asyncHandler(async (req, res) => {
    const [existingUser, recentRecords] = await Promise.all([
        User.findOne({ username: req.body.username }),
        Record.find().sort({ createdAt: -1 }).limit(8).populate('owner', 'username')
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
        username: req.body.username,
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

    // Set session with limited user data
    req.session.user = {
        _id: user._id,
        username: user.username
    };
    
    res.redirect('/records');
}));

router.get('/sign-in', asyncHandler(async (req, res) => {
    const recentRecords = await Record.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('owner', 'username');

    res.render('auth/sign-in', { 
        title: 'Sign In',
        error: null,
        recentRecords
    });
}));

router.post('/sign-in', validateSignIn, asyncHandler(async (req, res) => {
    const [user, recentRecords] = await Promise.all([
        User.findOne({ username: req.body.username }),
        Record.find().sort({ createdAt: -1 }).limit(8).populate('owner', 'username')
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
                lastLoginAttempt: null
            }
        }
    );

    // Set session with limited user data
    req.session.user = {
        _id: user._id,
        username: user.username
    };
    
    res.redirect('/records');
}));

router.get('/sign-out', asyncHandler(async (req, res) => {
    await new Promise((resolve) => req.session.destroy(resolve));
    res.clearCookie('_sid'); // Clear session cookie
    res.redirect('/');
}));

module.exports = router;
