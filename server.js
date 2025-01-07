require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const methodOverride = require("method-override");
const mongoose = require("mongoose");
const session = require('express-session');

// Database Connection Setup
mongoose.connect(process.env.MONGODB_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));

// Import models after mongoose connection is established
const User = require('./models/user');
const Record = require('./models/record');

// Express Application Setup
const app = express();
const port = process.env.PORT || "3000";

// Basic Express Configuration
app.set('view engine', 'ejs');

// Middleware Stack
app.use(morgan('dev'));                                    
app.use(express.static('public'));                        
app.use(express.urlencoded({ extended: false }));         
app.use(methodOverride("_method"));                       
app.use(session({                                         
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

// Custom Middleware
app.use(require('./middleware/add-user-to-locals-and-req'));

// Public Routes (No Authentication Required)
app.use('/auth', require('./controllers/auth'));

// Home Page Route
app.get('/', async (req, res) => {
    try {
        if (req.user) {
            return res.redirect('/records/profile');
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
            title: 'Welcome to VinylVault',
            recentRecords: publicRecords
        });
    } catch (e) {
        console.error('Error in home route:', e);
        res.render('home', { 
            title: 'Welcome to VinylVault',
            recentRecords: []
        });
    }
});

// Public User Profile Route
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

// Protected Routes (Authentication Required)
app.use('/records', require('./middleware/ensure-signed-in'), require('./controllers/records'));

// Error Handling Middleware 
// Handle 404 errors
app.use((req, res) => {
    res.status(404).render('records/404', { 
        title: 'Page Not Found',
        message: "The page you're looking for doesn't exist."
    });
});

// Handle all other errors
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).render('records/error', {
        title: 'Error',
        message: err.message || 'Something went wrong!'
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});