const express = require('express');
const router = express.Router();

// Middleware to protect selected routes
const ensureSignedIn = require('../middleware/ensure-signed-in');

// All routes start with '/unicorns'

// GET /unicorns (index functionality) UN-PROTECTED - all users can access
router.get('/', (req, res) => {
  res.send('Rejoice - the unicorns are here!');
});

// GET /unicorns/new (new functionality) PROTECTED - only signed in users can access
router.get('/new', ensureSignedIn, (req, res) => {
  res.send('Add a unicorn!');
});



module.exports = router;