// Load environment variables and configuration
require("dotenv").config();
const { SESSION_CONFIG } = require('./config/security');
const { initializeApp } = require('./config/setup');

// Import required packages
const express = require("express");
const morgan = require("morgan");
const flash = require('connect-flash');
const methodOverride = require("method-override");
const mongoose = require("mongoose");
const session = require('express-session');
const MongoStore = require('connect-mongo');
const expressLayouts = require('express-ejs-layouts');
const compression = require('compression');
const csrf = require('csurf');

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

// Handle MongoDB connection events
mongoose.connection
    .on("error", (err) => console.error("MongoDB connection error:", err))
    .on("disconnected", () => console.log("MongoDB disconnected. Attempting to reconnect..."))
    .on("connected", () => console.log(`Connected to MongoDB ${mongoose.connection.name}`));

// Set up view engine
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Set up middleware
app.use(morgan('dev'));                             // Request logging
// Compression middleware
app.use(compression());

// Static file serving with cache control
app.use(express.static('public', {
    maxAge: '1d', // Cache for 1 day
    setHeaders: (res, path) => {
        // Set different cache times based on file type
        if (path.endsWith('.css') || path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'public, max-age=0'); // No cache for CSS/JS during development
        } else if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.svg')) {
            res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
        } else if (path.endsWith('.woff2') || path.endsWith('.woff') || path.endsWith('.ttf')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
        }
    }
}));
app.use(express.urlencoded({ extended: false }));   // Parse form data
app.use(express.json());                           // Parse JSON requests
app.use(methodOverride("_method"));                 // Support PUT/DELETE methods
// Configure session store
SESSION_CONFIG.store = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60, // Session TTL in seconds (24 hours)
    autoRemove: 'native',
    touchAfter: 24 * 3600 // Only update session every 24 hours unless data changes
});

app.use(session(SESSION_CONFIG));                   // Session management

// Set up CSRF protection
app.use(csrf());
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});

// Set up flash messages and session messages
app.use(flash());
app.use(require('./middleware/add-messages-to-locals'));

// Add user data and notifications to all requests
app.use(require('./middleware/add-user-to-locals-and-req'));
app.use(require('./middleware/add-notifications-to-locals'));

// Mount route handlers
app.use('/', require('./controllers/home'));                // Home routes
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

// Initialize required directories
initializeApp();

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
    const statusCode = err.status || 500;
    res.status(statusCode).render('shared/error', {
        title: 'Error',
        message: process.env.NODE_ENV === 'production' 
            ? 'Something went wrong!' 
            : err.message,
        statusCode,
        stack: process.env.NODE_ENV === 'development' ? err.stack : null,
        details: err.details,
        req: req
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
