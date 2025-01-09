require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const methodOverride = require("method-override");
const mongoose = require("mongoose");
const session = require('express-session');
const User = require('./models/user');
const Record = require('./models/record');
const Activity = require('./models/activity');

const app = express();
const port = process.env.PORT || "3000";

mongoose.connect(process.env.MONGODB_URI, {});

mongoose.connection.on("connected", () => {
    console.log(`Connected to MongoDB ${mongoose.connection.name}`);
});

app.set('view engine', 'ejs');

app.use(morgan('dev'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride("_method"));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    },
    proxy: true
}));

app.use(require('./middleware/add-user-to-locals-and-req'));

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
            title: 'Welcome to Vinyl Vault',
            recentRecords: publicRecords
        });
    } catch (e) {
        res.render('home', {
            title: 'Welcome to Vinyl Vault',
            recentRecords: []
        });
    }
});

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
        res.redirect('/');
    }
});

app.use('/auth', require('./controllers/auth'));
app.use(require('./middleware/ensure-signed-in'));
app.use('/records', require('./controllers/records'));

app.use((req, res) => {
    res.status(404).render('shared/404', {
        title: 'Page Not Found',
        message: "The page you're looking for doesn't exist."
    });
});

app.use((err, req, res, next) => {
    console.log(err);
    res.status(500).render('shared/error', {
        title: 'Error',
        message: 'Something went wrong!'
    });
});

app.listen(port, () => {
    console.log(`Express app is running on port ${port}`);
});