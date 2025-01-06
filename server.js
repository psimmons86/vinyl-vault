require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const methodOverride = require("method-override");
const mongoose = require("mongoose");
const session = require('express-session');

// Connect to MongoDB first
mongoose.connect(process.env.MONGODB_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));

// Import models after connection is established
const User = require('./models/user');
const Record = require('./models/record');

const app = express();
const port = process.env.PORT || "3000";

// Configure Express app
app.set('view engine', 'ejs');

// Mount Middleware
app.use(morgan('dev'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride("_method"));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

// Add the user (if logged in) to req.user & res.locals
app.use(require('./middleware/add-user-to-locals-and-req'));

// Mount auth routes
app.use('/auth', require('./controllers/auth'));

// Mount record routes with ensure-signed-in middleware
app.use('/records', require('./middleware/ensure-signed-in'), require('./controllers/records'));

// GET / (public home page functionality)
app.get('/', async (req, res) => {
    try {
        const users = await User.find({ isPublic: true })
            .sort({ createdAt: -1 })
            .limit(12);

        const usersWithRecords = await Promise.all(users.map(async user => {
            try {
                const recentlyAdded = await Record.find({ owner: user._id })
                    .sort({ createdAt: -1 })
                    .limit(3)
                    .select('title artist createdAt');

                const recentlyPlayed = await Record.findOne({ 
                    owner: user._id,
                    lastPlayed: { $exists: true, $ne: null }
                })
                    .sort({ lastPlayed: -1 })
                    .select('title artist lastPlayed');

                return {
                    ...user.toObject(),
                    recentlyAdded: recentlyAdded || [],
                    recentlyPlayed: recentlyPlayed || null,
                    joinDate: user.createdAt ? user.createdAt.toLocaleDateString() : 'Unknown'
                };
            } catch (e) {
                console.error('Error processing user records:', e);
                return {
                    ...user.toObject(),
                    recentlyAdded: [],
                    recentlyPlayed: null,
                    joinDate: user.createdAt ? user.createdAt.toLocaleDateString() : 'Unknown'
                };
            }
        }));

        res.render('home', { 
            title: 'Welcome to VinylVault',
            users: usersWithRecords
        });
    } catch (e) {
        console.error('Error in home route:', e);
        res.render('home', { 
            title: 'Welcome to VinylVault',
            users: []
        });
    }
});

// GET /users/:username - View a user's public profile
app.get('/users/:username', async (req, res) => {
    try {
        const user = await User.findOne({ 
            username: req.params.username,
            isPublic: true
        });

        if (!user) {
            return res.redirect('/');
        }

        const recentlyAdded = await Record.find({ owner: user._id })
            .sort({ createdAt: -1 })
            .limit(10);

        const recentlyPlayed = await Record.find({ 
            owner: user._id,
            lastPlayed: { $exists: true, $ne: null }
        })
            .sort({ lastPlayed: -1 })
            .limit(10);

        res.render('users/profile', {
            title: `${user.username}'s Profile`,
            profileUser: user,
            recentlyAdded,
            recentlyPlayed
        });
    } catch (e) {
        console.error('Error in user profile route:', e);
        res.redirect('/');
    }
});

// Protect all routes after this point
app.use(require('./middleware/ensure-signed-in'));

// Mount protected routes
app.use('/records', require('./controllers/records'));

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});