require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');
const Record = require('../models/record');

async function fixUsername() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB:', mongoose.connection.name);

        // Find both users
        const capitalUser = await User.findOne({ username: 'Psimmons86' });
        const lowercaseUser = await User.findOne({ username: 'psimmons86' });

        if (!capitalUser || !lowercaseUser) {
            console.log('Could not find both users');
            console.log('Capital P user:', capitalUser ? 'found' : 'not found');
            console.log('Lowercase user:', lowercaseUser ? 'found' : 'not found');
            return;
        }

        console.log('\nBefore update:');
        console.log('Capital user records:', await Record.countDocuments({ owner: capitalUser._id }));
        console.log('Lowercase user records:', await Record.countDocuments({ owner: lowercaseUser._id }));

        // Update all records to point to the lowercase user
        const updateResult = await Record.updateMany(
            { owner: capitalUser._id },
            { $set: { owner: lowercaseUser._id } }
        );
        console.log('\nUpdated records:', updateResult.modifiedCount);

        // Delete the capital P user
        await User.deleteOne({ _id: capitalUser._id });
        console.log('Deleted capital P user');

        // Verify the results
        console.log('\nAfter update:');
        const finalRecordCount = await Record.countDocuments({ owner: lowercaseUser._id });
        console.log('Total records for lowercase user:', finalRecordCount);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

fixUsername();
