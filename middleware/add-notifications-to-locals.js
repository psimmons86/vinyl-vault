const Notification = require('../models/notification');
const asyncHandler = require('./async-handler');

// In-memory cache for notifications with 30-second TTL
const notificationCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds

/**
 * Get notifications from cache or database
 * @param {string} userId - User ID to fetch notifications for
 * @returns {Promise<{unreadCount: number, recentNotifications: Array}>}
 */
async function getNotifications(userId) {
    const cacheKey = `notifications:${userId}`;
    const cached = notificationCache.get(cacheKey);
    
    if (cached && cached.timestamp > Date.now() - CACHE_TTL) {
        return cached.data;
    }

    const [unreadCount, recentNotifications] = await Promise.all([
        Notification.getUnreadCount(userId),
        Notification.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('type message createdAt isRead')
            .populate('sender', 'username profile.avatarUrl')
            .populate('record', 'title artist imageUrl')
            .populate('post', 'title')
            .lean()
    ]);

    const data = { unreadCount, recentNotifications };
    
    // Cache the results
    notificationCache.set(cacheKey, {
        timestamp: Date.now(),
        data
    });

    return data;
}

/**
 * Middleware to add notifications to locals
 * Uses caching to reduce database load
 */
module.exports = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        res.locals.unreadNotifications = 0;
        res.locals.recentNotifications = [];
        return next();
    }

    try {
        const { unreadCount, recentNotifications } = await getNotifications(req.user._id);
        res.locals.unreadNotifications = unreadCount;
        res.locals.recentNotifications = recentNotifications;
    } catch (error) {
        console.error('Error fetching notifications:', {
            userId: req.user._id,
            error: error.message,
            stack: error.stack
        });
        // Set defaults on error
        res.locals.unreadNotifications = 0;
        res.locals.recentNotifications = [];
    }

    next();
});

// Export cache clear function for testing
module.exports.clearCache = () => notificationCache.clear();
