const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/async-handler');
const { findNearbyStores, searchStoreInventory, getStoreDetails, linkDiscogsAccount } = require('../services/stores');
const ensureSignedIn = require('../middleware/ensure-signed-in');

// Find record stores by location
router.get('/nearby', asyncHandler(async (req, res) => {
    const { location, latitude, longitude } = req.query;
    
    if (!location && (!latitude || !longitude)) {
        return res.render('stores/nearby', {
            title: 'Find Record Stores',
            stores: [],
            error: null,
            googleApiKey: process.env.GOOGLE_API_KEY
        });
    }

    try {
        const searchParams = latitude && longitude 
            ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
            : { location };

        const stores = await findNearbyStores({
            ...searchParams,
            radius: 10000 // 10km radius
        });
        
        res.render('stores/nearby', {
            title: 'Record Stores',
            stores,
            searchLocation: location,
            error: null,
            googleApiKey: process.env.GOOGLE_API_KEY
        });
    } catch (err) {
        console.error('Error finding stores:', err);
        res.render('stores/nearby', {
            title: 'Find Record Stores',
            stores: [],
            searchLocation: location,
            error: err.message || 'Error finding stores. Please try again.',
            googleApiKey: process.env.GOOGLE_API_KEY
        });
    }
}));

// Search for records at stores
router.get('/search', asyncHandler(async (req, res) => {
    const { q, store } = req.query;

    if (!q || !store) {
        if (req.xhr) {
            return res.json({ results: [] });
        }
        return res.render('stores/search', {
            title: 'Search Store Inventory',
            results: [],
            query: q || '',
            error: null,
            store: null
        });
    }

    try {
        const response = await searchStoreInventory({
            storeId: store,
            query: q
        });
        
        if (req.xhr) {
            return res.json(response);
        }

        res.render('stores/search', {
            title: 'Search Results',
            results: response.listings,
            hasInventory: response.hasInventory,
            message: response.message,
            query: q,
            error: null,
            store
        });
    } catch (err) {
        console.error('Error searching inventory:', err);
        if (req.xhr) {
            return res.status(500).json({ 
                error: 'Error searching records. Please try again.' 
            });
        }

        res.render('stores/search', {
            title: 'Search Results',
            results: [],
            query: q,
            error: 'Error searching records. Please try again.',
            store
        });
    }
}));

// Get record details
router.get('/record/:id', asyncHandler(async (req, res) => {
    const recordId = req.params.id;
    const { store } = req.query;
    
    try {
        const response = await searchStoreInventory({
            storeId: store,
            query: recordId // Use record ID as query to get specific record
        });

        if (!response.hasInventory) {
            throw new Error(response.message || 'Store inventory not available');
        }

        const record = response.listings.find(r => r.id === recordId);
        if (!record) {
            throw new Error('Record not found');
        }

        res.json(record);
    } catch (err) {
        console.error('Error getting record details:', err);
        res.status(404).json({ error: 'Record not found' });
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
            results: [],
            query: '',
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

// Link store to Discogs account (admin only)
router.post('/:id/link-discogs', ensureSignedIn, asyncHandler(async (req, res) => {
    const storeId = req.params.id;
    const { discogsUsername } = req.body;

    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!discogsUsername) {
        return res.status(400).json({ error: 'Discogs username is required' });
    }

    try {
        const result = await linkDiscogsAccount(storeId, discogsUsername);
        res.json(result);
    } catch (err) {
        console.error('Error linking Discogs account:', err);
        res.status(500).json({ 
            error: err.message || 'Error linking Discogs account' 
        });
    }
}));

module.exports = router;
