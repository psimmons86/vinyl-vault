const Notification = require('../models/notification');

module.exports = async function(req, res, next) {
    if (req.user) {
        try {
            const [unreadCount, recentNotifications] = await Promise.all([
                Notification.getUnreadCount(req.user._id),
                Notification.find({ recipient: req.user._id })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .populate('sender', 'username profile.avatarUrl')
                    .populate('record', 'title artist imageUrl')
                    .populate('post', 'title')
            ]);

            res.locals.unreadNotifications = unreadCount;
            res.locals.recentNotifications = recentNotifications;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            res.locals.unreadNotifications = 0;
            res.locals.recentNotifications = [];
        }
    }
    next();
};
