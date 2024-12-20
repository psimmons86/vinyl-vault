const User = require('../models/user');
const bcrypt = require('bcrypt');
const express = require('express');
// Create a router function/object (a router is a middleware function)
const router = express.Router();

// All paths start with '/auth'

// GET /auth/sign-up (see the sign-up form - new functionality for the users data resource)
router.get('/sign-up', (req, res) => {
  res.render('auth/sign-up.ejs', { title: 'Sign Up!' })
});

// GET /auth/sign-out
router.get('/sign-out', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// POST /auth/sign-up (create a user)
router.post('/sign-up', async (req, res) => {
  try {
    if (req.body.password !== req.body.confirmPassword) throw new Error('Passwords do not match');
    req.body.password = bcrypt.hashSync(req.body.password, 6);
    const user = await User.create(req.body);
    req.session.user_id = user._id;
    // Update path to the functionality YOU want
    res.redirect('/');
  } catch (e) {
    console.log(e);
    res.render('auth/sign-up.ejs', { title: 'Sign Up!' });
  }
});

// GET /auth/sign-in (show the sign-in page)
router.get('/sign-in', (req, res) => {
  res.render('auth/sign-in.ejs', { title: 'Sign In' });
});

// POST /auth/sign-in (sign in a user)
router.post('/sign-in', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (!user) throw new Error('Invalid username');
    // Verify the password
    const valid = bcrypt.compareSync(req.body.password, user.password);
    if (!valid) throw new Error('Invalid password');
    req.session.user_id = user._id;
    // Update path to the functionality YOU want
    res.redirect('/');
  } catch (e) {
    console.log(e);
    res.render('auth/sign-in.ejs', { title: 'Sign In' });
  }
});


module.exports = router;