require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const methodOverride = require("method-override");
const mongoose = require("mongoose");
const session = require('express-session');

const app = express();

// Set the port from environment variable or default to 3000
const port = process.env.PORT || "3000";

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

mongoose.connection.on("connected", () => {
    console.log(`Connected to MongoDB ${mongoose.connection.name}`);
});

// Configure Express app
app.set('view engine', 'ejs');

// Mount Middleware
// Morgan for logging HTTP requests
app.use(morgan('dev'));
// Static middleware for serving static files
app.use(express.static('public'));
// Middleware to parse URL-encoded data from forms
app.use(express.urlencoded({ extended: false }));
// Middleware for using HTTP verbs such as PUT or DELETE
app.use(methodOverride("_method"));
// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Add the user to req.user & res.locals
app.use(require('./middleware/add-user-to-locals-and-req'));

// Routes

// GET / (home page functionality)
app.get('/', async (req, res) => {
    try {
        if (req.user) {
            return res.redirect('/records');
        }

        const recentRecords = await Record.find()
            .populate({
                path: 'owner',
                match: { isPublic: true },
                select: 'username'
            })
            .sort({ createdAt: -1 })
            .limit(12)
            .select('title artist imageUrl createdAt');

        const publicRecords = recentRecords.filter(record => record.owner);

        res.render('home', {
            title: 'Welcome to Share Space',
            recentRecords: publicRecords
        });
    } catch (e) {
        console.log(e);
        res.render('home', {
            title: 'Welcome to Share Space',
            recentRecords: []
        });
    }
});

// GET /users/:username (public profile functionality)
app.get('/users/:username', async (req, res) => {
    try {
        const user = await User.findOne({
            username: req.params.username,
            isPublic: true
        });

        if (!user) return res.redirect('/');

        const [recentlyAdded, recentlyPlayed] = await Promise.all([
            Record.find({ owner: user._id })
                .sort({ createdAt: -1 })
                .limit(10),
            Record.find({
                owner: user._id,
                lastPlayed: { $exists: true, $ne: null }
            })
                .sort({ lastPlayed: -1 })
                .limit(10)
        ]);

        res.render('users/profile', {
            title: `${user.username}'s Profile`,
            profileUser: user,
            recentlyAdded,
            recentlyPlayed
        });
    } catch (e) {
        console.log(e);
        res.redirect('/');
    }
});

// Mount route handlers - no auth required
app.use('/auth', require('./controllers/auth'));

// Ensure authentication for all routes below
app.use(require('./middleware/ensure-signed-in'));

// Mount protected routes
app.use('/records', require('./controllers/records'));
app.use('/feed', require('./controllers/feed'));

// Error handlers
app.use((req, res) => {
    res.status(404).render('shared/404', {
        title: 'Page Not Found',
        message: "The page you're looking for doesn't exist."
    });
});

app.listen(port, () => {
    console.log(`Express app is running on port ${port}`);
});