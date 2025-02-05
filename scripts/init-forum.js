#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const ForumCategory = require('../models/forum-category');

const categories = [
    {
        name: 'Vinyl Discussion',
        slug: 'vinyl-discussion',
        description: 'General discussions about vinyl records, equipment, and collecting',
        icon: 'album'
    },
    {
        name: 'Genre Discussion',
        slug: 'genre-discussion',
        description: 'Discuss specific music genres, artists, and styles',
        icon: 'queue_music'
    },
    {
        name: 'Live Music & Events',
        slug: 'live-music-events',
        description: 'Upcoming concerts, festivals, and music events',
        icon: 'event'
    },
    {
        name: 'New Releases',
        slug: 'new-releases',
        description: 'Discuss and review new vinyl releases and reissues',
        icon: 'new_releases'
    },
    {
        name: 'Equipment & Setup',
        slug: 'equipment-setup',
        description: 'Turntables, speakers, amplifiers, and audio setup discussions',
        icon: 'speaker'
    },
    {
        name: 'Record Store Talk',
        slug: 'record-store-talk',
        description: 'Share experiences and recommendations for record stores',
        icon: 'store'
    },
    {
        name: 'Vinyl Care & Maintenance',
        slug: 'vinyl-care',
        description: 'Tips and discussions about maintaining your vinyl collection',
        icon: 'build'
    },
    {
        name: 'Trading & Marketplace',
        slug: 'trading-marketplace',
        description: 'Buy, sell, and trade vinyl records with other collectors',
        icon: 'swap_horiz'
    },
    {
        name: 'Digital vs Vinyl',
        slug: 'digital-vs-vinyl',
        description: 'Discussions comparing vinyl to digital formats',
        icon: 'compare'
    },
    {
        name: 'Rare & Vintage',
        slug: 'rare-vintage',
        description: 'Discuss rare pressings, first editions, and vintage vinyl',
        icon: 'diamond'
    },
    {
        name: 'Record Labels',
        slug: 'record-labels',
        description: 'News and discussions about record labels',
        icon: 'label'
    },
    {
        name: 'Upcoming Artists',
        slug: 'upcoming-artists',
        description: 'Discover and discuss emerging artists and bands',
        icon: 'trending_up'
    }
];

async function initForum() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Delete existing categories
        await ForumCategory.deleteMany({});
        console.log('Cleared existing categories');

        // Create categories with order based on array index
        const createdCategories = await Promise.all(
            categories.map((category, index) => 
                ForumCategory.create({
                    ...category,
                    order: index,
                    isActive: true
                })
            )
        );

        console.log('Created categories:');
        createdCategories.forEach(category => {
            console.log(`- ${category.name} (${category.slug})`);
        });

        console.log('\nForum initialization complete!');
    } catch (error) {
        console.error('Error initializing forum:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the initialization
initForum();
