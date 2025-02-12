#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');

async function makeCollectionsPublic() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('Connected to MongoDB');

        // Update all users to be public
        const result = await User.updateMany(
            { isPublic: false },
            { $set: { isPublic: true } }
        );

        console.log(`Updated ${result.modifiedCount} users to be public`);
        console.log('All collections are now public');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

makeCollectionsPublic();
