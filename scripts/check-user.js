require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');
const Record = require('../models/record');

async function checkUser() {
    try {
        console.log('Attempting to connect to:', process.env.MONGODB_URI);
        const client = await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB:', mongoose.connection.name);

        // First check if we can query the database at all
        const userCount = await User.countDocuments();
        console.log('\nCurrent database stats:');
        console.log('Total users:', userCount);

        const recordCount = await Record.countDocuments();
        console.log('Total records:', recordCount);

        // Find users with the most records
        const recordsByUser = await Record.aggregate([
            { $group: { 
                _id: '$owner', 
                count: { $sum: 1 } 
            }},
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // Get user details for these record owners
        const userDetails = await Promise.all(
            recordsByUser.map(async record => {
                const user = await User.findById(record._id);
                return {
                    username: user ? user.username : 'Unknown',
                    recordCount: record.count
                };
            })
        );

        console.log('\nTop record owners:');
        userDetails.forEach(user => {
            console.log(`${user.username}: ${user.recordCount} records`);
        });

        // Try case-insensitive search for our target user
        const user = await User.findOne({
            username: { $regex: new RegExp('^psimmons86$', 'i') }
        });

        if (!user) {
            console.log('\nUser psimmons86 not found');
            return;
        }

        console.log('\nTarget user details:');
        console.log('Username:', user.username);
        console.log('ID:', user._id);
        
        // Get records for this user
        const userRecords = await Record.find({ owner: user._id });
        console.log('Record count:', userRecords.length);

    } catch (error) {
        console.error('Detailed error:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code
        });
    } finally {
        await mongoose.connection.close();
    }
}

checkUser();
