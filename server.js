// Load environment variables from .env file
require("dotenv").config();

// Import required packages
const express = require("express");             // Web framework
const morgan = require("morgan");               // HTTP request logger
const methodOverride = require("method-override");  // Enable PUT/DELETE in forms
const mongoose = require("mongoose");           // MongoDB ODM
const session = require('express-session');     // Session management

// Import models
const User = require('./models/user');
const Record = require('./models/record');
const Activity = require('./models/activity');

// Initialize Express app and port
const app = express();
const port = process.env.PORT || "3000";

// Connect to MongoDB database
mongoose.connect(process.env.MONGODB_URI, {});

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
app.use(methodOverride("_method"));                 // Support PUT/DELETE methods

// Configure session management
app.use(session({
   secret: process.env.SESSION_SECRET,   // Secret for signing session ID
   resave: false,                        // Don't save session if unmodified
   saveUninitialized: false,             // Don't create session until something stored
   cookie: {
       secure: false,                    // Allow non-HTTPS (development)
       maxAge: 24 * 60 * 60 * 1000      // Session expires in 24 hours
   },
   proxy: true                           // Trust the reverse proxy
}));

// Add user data to all requests
app.use(require('./middleware/add-user-to-locals-and-req'));

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
app.use(require('./middleware/ensure-signed-in'));         // Require login for routes below
app.use('/records', require('./controllers/records'));     // Record routes

// 404 handler - for undefined routes
app.use((req, res) => {
   res.status(404).render('shared/404', {
       title: 'Page Not Found',
       message: "The page you're looking for doesn't exist."
   });
});

// Error handler - for all other errors
app.use((err, req, res, next) => {
   console.log(err);
   res.status(500).render('shared/error', {
       title: 'Error',
       message: 'Something went wrong!'
   });
});

// Start server
app.listen(port, () => {
   console.log(`Express app is running on port ${port}`);
});