// Load environment variables from .env file
require("dotenv").config();

// Import required packages
const express = require("express");             // Web framework
const morgan = require("morgan");               // HTTP request logger
const flash = require('connect-flash');
const methodOverride = require("method-override");  // Enable PUT/DELETE in forms
const mongoose = require("mongoose");           // MongoDB ODM
const session = require('express-session');     // Session management

// Import models
const User = require('./models/user');
const Record = require('./models/record');
const Activity = require('./models/activity');
const Post = require('./models/post');
const FeaturedRecord = require('./models/featured');

// Initialize Express app and port
const app = express();
const port = process.env.PORT || "3000";

// Connect to MongoDB database with proper options
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
});

// Handle MongoDB connection errors
mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
    console.log("MongoDB disconnected. Attempting to reconnect...");
});

// Log when successfully connected to MongoDB
mongoose.connection.on("connected", () => {
   console.log(`Connected to MongoDB ${mongoose.connection.name}`);
});

// Set EJS as template engine
app.set('view engine', 'ejs');

// Set up middleware
app.use(morgan('dev'));                             // Request logging
app.use(express.static('public'));                  // Serve static files
app.use(express.urlencoded({ extended: false }));   // Parse form data
app.use(express.json());                           // Parse JSON requests
app.use(methodOverride("_method"));                 // Support PUT/DELETE methods

// Configure session management with enhanced security
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: '_sid', // Change cookie name from default 'connect.sid'
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    },
    proxy: true
}));

// Set up flash messages
app.use(flash());

// Configure flash messages middleware
app.use((req, res, next) => {
    res.locals.messages = req.flash();
    next();
});

// Add user data and notifications to all requests
app.use(require('./middleware/add-user-to-locals-and-req'));
app.use(require('./middleware/add-notifications-to-locals'));

// Home page route
app.get('/', async (req, res) => {
   try {
       // If user is logged in, redirect to their records
       if (req.user) {
           return res.redirect('/records');
       }

       // Get recent public records for homepage carousel
       const recentRecords = await Record.find()
           .populate({
               path: 'owner',               // Get owner details
               match: { isPublic: true },   // Only public profiles
               select: 'username'           // Just get username
           })
           .sort({ createdAt: -1 })        // Newest first
           .limit(12)                       // Get 12 records
           .select('title artist imageUrl createdAt');  // Only needed fields

       // Filter out records where owner is private
       const publicRecords = recentRecords.filter(record => record.owner);

       res.render('home', {
           title: 'Welcome to Vinyl Vault',
           recentRecords: publicRecords
       });
   } catch (e) {
       // On error, render home page with no records
       res.render('home', {
           title: 'Welcome to Vinyl Vault',
           recentRecords: []
       });
   }
});

// Public user profile route
app.get('/users/:username', async (req, res) => {
   try {
       // Find public user profile
       const user = await User.findOne({
           username: req.params.username,
           isPublic: true
       });

       if (!user) return res.redirect('/');

       // Get user's recent records and recently played in parallel
       const [recentlyAdded, recentlyPlayed] = await Promise.all([
           // Recently added records
           Record.find({ owner: user._id })
               .sort({ createdAt: -1 })
               .limit(10),
           // Recently played records
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
       res.redirect('/');
   }
});

// Mount route handlers
app.use('/auth', require('./controllers/auth'));           // Authentication routes
app.use('/notifications', require('./controllers/notifications')); // Notification routes
app.use(require('./middleware/ensure-signed-in'));         // Require login for routes below
app.use('/records', require('./controllers/records'));     // Record routes
app.use('/stores', require('./controllers/stores'));       // Store routes
app.use('/api/profile', require('./controllers/profile')); // Profile API routes
app.use('/admin', require('./controllers/admin'));         // Admin routes
app.use('/social', require('./controllers/social'));       // Social routes
app.use('/blog', require('./controllers/blog'));           // Blog routes
app.use('/search', require('./controllers/search'));       // Search routes
app.use('/forum', require('./controllers/forum'));         // Forum routes

// Create blog uploads directory if it doesn't exist
const fs = require('fs');
const path = require('path');
const blogUploadsDir = path.join(__dirname, 'public/uploads/blog');
if (!fs.existsSync(blogUploadsDir)) {
    fs.mkdirSync(blogUploadsDir, { recursive: true });
}

// 404 handler - for undefined routes
app.use((req, res) => {
   res.status(404).render('shared/404', {
       title: 'Page Not Found',
       message: "The page you're looking for doesn't exist."
   });
});

// Error handler - for all other errors with improved logging
app.use((err, req, res, next) => {
    // Log error details
    console.error('Error details:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Send appropriate response
    res.status(err.status || 500).render('shared/error', {
        title: 'Error',
        message: process.env.NODE_ENV === 'production' 
            ? 'Something went wrong!' 
            : err.message
    });
});

// Start server with port retry logic
const startServer = (retryPort = port) => {
    const server = app.listen(retryPort)
        .on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Port ${retryPort} is busy, trying ${parseInt(retryPort) + 1}...`);
                server.close();
                startServer(parseInt(retryPort) + 1);
            } else {
                console.error('Server error:', err);
            }
        })
        .on('listening', () => {
            console.log(`Express app is running on port ${retryPort}`);
        });
};

startServer();
