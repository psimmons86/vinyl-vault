const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');

// GET /auth/sign-up - Show sign up form
router.get('/sign-up', (req, res) => {
    res.render('auth/sign-up', { 
        title: 'Sign Up' 
    });
});

// POST /auth/sign-up - Handle form submission
router.post('/sign-up', async (req, res) => {
    try {
        req.body.password = bcrypt.hashSync(req.body.password, 10);
        const user = await User.create(req.body);
        req.session.user = user;
        res.redirect('/records/profile');
    } catch (err) {
        console.error('Sign up error:', err);
        res.redirect('/auth/sign-up');
    }
});

// GET /auth/sign-in - Show sign in form
router.get('/sign-in', (req, res) => {
    res.render('auth/sign-in', { 
        title: 'Sign In' 
    });
});

// POST /auth/sign-in - Handle sign in form submission
router.post('/sign-in', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user && bcrypt.compareSync(req.body.password, user.password)) {
            req.session.user = user;
            res.redirect('/records/profile');
        } else {
            res.redirect('/auth/sign-in');
        }
    } catch (err) {
        console.error('Sign in error:', err);
        res.redirect('/auth/sign-in');
    }
});

// GET /auth/sign-out - Sign out user
router.get('/sign-out', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

module.exports = router;