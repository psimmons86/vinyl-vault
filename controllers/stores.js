const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/async-handler');
const { findNearbyStores, getStoreDetails } = require('../services/stores');

// Find record stores by location
router.get('/nearby', asyncHandler(async (req, res) => {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
        return res.render('stores/nearby', {
            title: 'Find Record Stores',
            stores: [],
            error: null,
            googleApiKey: process.env.GOOGLE_API_KEY
        });
    }

    try {
        const stores = await findNearbyStores({
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            radius: 10000 // 10km radius
        });
        
        res.render('stores/nearby', {
            title: 'Record Stores',
            stores,
            error: null,
            googleApiKey: process.env.GOOGLE_API_KEY
        });
    } catch (err) {
        console.error('Error finding stores:', err);
        res.render('stores/nearby', {
            title: 'Find Record Stores',
            stores: [],
            error: err.message || 'Error finding stores. Please try again.',
            googleApiKey: process.env.GOOGLE_API_KEY
        });
    }
}));

// Show store details
router.get('/:id', asyncHandler(async (req, res) => {
    const storeId = req.params.id;
    
    try {
        const store = await getStoreDetails(storeId);

        // If it's an AJAX request, return JSON
        if (req.xhr) {
            return res.json(store);
        }

        // Otherwise render the page
        res.render('stores/show', {
            title: store.name,
            store,
            googleApiKey: process.env.GOOGLE_API_KEY
        });
    } catch (err) {
        console.error('Error getting store details:', err);
        if (req.xhr) {
            return res.status(404).json({ error: 'Store not found' });
        }
        res.render('stores/show', {
            title: 'Store Not Found',
            store: null,
            error: err.message || 'Store not found',
            googleApiKey: process.env.GOOGLE_API_KEY
        });
    }
}));

module.exports = router;
