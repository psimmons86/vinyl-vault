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
router.post('/sign-up', (req, res) => {
    req.body.password = bcrypt.hashSync(req.body.password, 10);
    
    User.create(req.body)
        .then(user => {
            req.session.user = user;
            res.redirect('/records');
    });
});

// GET /auth/sign-in - Show sign in form
router.get('/sign-in', (req, res) => {
    res.render('auth/sign-in', { 
        title: 'Sign In' 
    });
});

// POST /auth/sign-in - Handle sign in form submission
router.post('/sign-in', (req, res) => {
    User.findOne({ username: req.body.username })
        .then(user => {
            if (user && bcrypt.compareSync(req.body.password, user.password)) {
                req.session.user = user;
                res.redirect('/records');
            } else {
                res.redirect('/auth/sign-in');
            }
    });
});

// GET /auth/sign-out - Sign out user
router.get('/sign-out', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

module.exports = router;