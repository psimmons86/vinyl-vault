const express = require('express');
const router = express.Router();
const Activity = require('../models/activity');

// All routes start with '/feed'

// GET /feed (index functionality)
router.get('/', async (req, res) => {
    try {
        const activities = await Activity.find()
            .populate('user', 'username')
            .populate('record', 'title artist')
            .sort({ createdAt: -1 })
            .limit(20);

        res.render('feed', {
            title: 'Activity Feed',
            activities
        });
    } catch (e) {
        console.log(e);
        res.redirect('/');
    }
});

module.exports = router;