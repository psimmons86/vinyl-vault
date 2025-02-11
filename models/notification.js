const mongoose = require('mongoose');

// Constants
const NOTIFICATION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
const NOTIFICATION_TYPES = {
    FOLLOW: 'follow',
    LIKE: 'like',
    COMMENT: 'comment',
    MENTION: 'mention',
    PRICE_ALERT: 'price_alert',
    MILESTONE: 'milestone'
};

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        required: true,
        enum: Object.values(NOTIFICATION_TYPES),
        index: true
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: [500, 'Message cannot be longer than 500 characters']
    },
    link: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return v.startsWith('/');
            },
            message: 'Link must be a relative URL starting with /'
        }
    },
    read: {
        type: Boolean,
        default: false,
        index: true
    },
    record: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Record',
        index: true
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        index: true
    },
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Indexes
notificationSchema.index({ recipient: 1, createdAt: -1 }); // For listing notifications
notificationSchema.index({ recipient: 1, read: 1 }); // For unread counts
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NOTIFICATION_TTL }); // TTL index

// Query helpers
notificationSchema.query.forUser = function(userId) {
    return this.where({ recipient: userId });
};

notificationSchema.query.unread = function() {
    return this.where({ read: false });
};

notificationSchema.query.recent = function(limit = 10) {
    return this.sort('-createdAt').limit(limit);
};

notificationSchema.query.withSenderInfo = function() {
    return this.populate('sender', 'username profile.name profile.avatarUrl');
};

// Instance methods
notificationSchema.methods.markAsRead = async function() {
    if (!this.read) {
        this.read = true;
        return this.save();
    }
    return this;
};

// Static methods
notificationSchema.statics = {
    TYPES: NOTIFICATION_TYPES,

    async getUnreadCount(userId) {
        return this.countDocuments({ recipient: userId, read: false });
    },

    async markAllAsRead(userId) {
        return this.updateMany(
            { recipient: userId, read: false },
            { $set: { read: true } }
        );
    },

    async createNotification(data) {
        // Prevent duplicate notifications
        const existingSimilar = await this.findOne({
            recipient: data.recipient,
            type: data.type,
            sender: data.sender,
            createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) } // Within last 5 minutes
        });

        if (existingSimilar) {
            return existingSimilar;
        }

        return this.create(data);
    },

    async createBatchNotifications(notifications) {
        // Filter out potential duplicates
        const uniqueNotifications = await Promise.all(
            notifications.map(async (data) => {
                const exists = await this.findOne({
                    recipient: data.recipient,
                    type: data.type,
                    sender: data.sender,
                    createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) }
                });
                return exists ? null : data;
            })
        );

        return this.insertMany(
            uniqueNotifications.filter(n => n !== null)
        );
    },

    async deleteOldNotifications(userId, days = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        return this.deleteMany({
            recipient: userId,
            createdAt: { $lt: cutoff }
        });
    }
};

// Middleware
notificationSchema.pre('save', function(next) {
    // Ensure message doesn't exceed max length
    if (this.message && this.message.length > 500) {
        this.message = this.message.substring(0, 497) + '...';
    }
    next();
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
