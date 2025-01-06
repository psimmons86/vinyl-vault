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
      // If user is logged in, redirect to their profile
      if (req.user) {
          return res.redirect('/records/profile');
      }

      // Fetch recent records from public profiles
      const recentRecords = await Record.find()
          .populate({
              path: 'owner',
              match: { isPublic: true },
              select: 'username'
          })
          .sort({ createdAt: -1 })
          .limit(12)
          .select('title artist imageUrl createdAt');

      // Filter out records from private profiles
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