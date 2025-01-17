const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Activity = require('../models/activity');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;

router.get('/sign-up', async (req, res) => {
    res.render('auth/sign-up', { 
        title: 'Sign Up',
        error: null 
    });
});

router.post('/sign-up', async (req, res) => {
    try {
        if (req.body.password !== req.body.confirmPassword) {
            return res.render('auth/sign-up', { 
                title: 'Sign Up',
                error: 'Passwords do not match'
            });
        }

        const existingUser = await User.findOne({ username: req.body.username });
        if (existingUser) {
            return res.render('auth/sign-up', {
                title: 'Sign Up',
                error: 'Username already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, SALT_ROUNDS);
        const user = await User.create({
            username: req.body.username,
            password: hashedPassword,
            profile: {
                name: req.body.username,  // Default display name to username
                showStats: true          // Default to showing stats
            }
        });
        
        await Activity.create({
            user: user._id,
            activityType: 'signup'
        });

        req.session.user = user;
        res.redirect('/records');
        
    } catch (err) {
        res.render('auth/sign-up', {
            title: 'Sign Up',
            error: 'Error creating account'
        });
    }
});

router.get('/sign-in', async (req, res) => {
    res.render('auth/sign-in', { 
        title: 'Sign In',
        error: null
    });
});

router.post('/sign-in', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        
        if (!user) {
            return res.render('auth/sign-in', {
                title: 'Sign In',
                error: 'Invalid username or password'
            });
        }

        const isValidPassword = await bcrypt.compare(req.body.password, user.password);
        if (!isValidPassword) {
            return res.render('auth/sign-in', {
                title: 'Sign In',
                error: 'Invalid username or password'
            });
        }

        req.session.user = user;
        res.redirect('/records');
        
    } catch (err) {
        res.render('auth/sign-in', {
            title: 'Sign In',
            error: 'Error signing in'
        });
    }
});

router.get('/sign-out', async (req, res) => {
    try {
        await new Promise((resolve) => req.session.destroy(resolve));
        res.redirect('/');
    } catch (err) {
        res.redirect('/');
    }
});

module.exports = router;