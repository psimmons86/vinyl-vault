const express = require('express');
const router = express.Router();
const Notification = require('../models/notification');
const ensureSignedIn = require('../middleware/ensure-signed-in');

// Require sign in for all notification routes
router.use(ensureSignedIn);

// Get all notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .populate('sender', 'username profile.avatarUrl')
      .populate('record', 'title artist imageUrl')
      .populate('post', 'title');

    // Mark all as read
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    res.render('notifications/index', {
      title: 'Notifications',
      notifications
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.redirect('/');
  }
});

// Mark a notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a notification
router.delete('/:id', async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
