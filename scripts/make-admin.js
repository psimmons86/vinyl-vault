require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');

// Function to make a user admin
async function makeAdmin(username) {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Find and update the user
        const result = await User.findOneAndUpdate(
            { username: username },
            { $set: { isAdmin: true } },
            { new: true }
        );

        if (!result) {
            console.error(`User "${username}" not found`);
            process.exit(1);
        }

        console.log(`Successfully made "${username}" an admin!`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Get username from command line argument
const username = process.argv[2];
if (!username) {
    console.error('Please provide a username');
    console.error('Usage: node scripts/make-admin.js <username>');
    process.exit(1);
}

makeAdmin(username);
