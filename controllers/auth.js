const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Activity = require('../models/activity');
const bcrypt = require('bcrypt');

// All routes start with '/auth'

// GET /auth/sign-up (new functionality)
router.get('/sign-up', (req, res) => {
    res.render('auth/sign-up', { 
        title: 'Sign Up',
        error: null 
    });
});

// POST /auth/sign-up (create functionality)
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

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = await User.create({
            username: req.body.username,
            password: hashedPassword
        });
        
        await Activity.create({
            user: user._id,
            activityType: 'signup'
        });

        req.session.user = user;
        res.redirect('/records');
    } catch (e) {
        console.log(e);
        res.render('auth/sign-up', {
            title: 'Sign Up',
            error: 'Error creating account'
        });
    }
});

// GET /auth/sign-in (new functionality)
router.get('/sign-in', (req, res) => {
    res.render('auth/sign-in', { 
        title: 'Sign In',
        error: null
    });
});

// POST /auth/sign-in (create session functionality)
router.post('/sign-in', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
            return res.render('auth/sign-in', {
                title: 'Sign In',
                error: 'Invalid username or password'
            });
        }

        req.session.user = user;
        res.redirect('/records');
    } catch (e) {
        console.log(e);
        res.render('auth/sign-in', {
            title: 'Sign In',
            error: 'Error signing in'
        });
    }
});

// GET /auth/sign-out (delete session functionality)
router.get('/sign-out', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

module.exports = router;