const axios = require('axios');
const Store = require('../models/store');
require('dotenv').config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const DISCOGS_KEY = process.env.DISCOGS_KEY;
const DISCOGS_SECRET = process.env.DISCOGS_SECRET;

if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY environment variable is required');
if (!DISCOGS_KEY) throw new Error('DISCOGS_KEY environment variable is required');
if (!DISCOGS_SECRET) throw new Error('DISCOGS_SECRET environment variable is required');


const googleMapsClient = axios.create({
    baseURL: 'https://maps.googleapis.com/maps/api',
    params: {
        key: GOOGLE_API_KEY
    }
});

const discogsClient = axios.create({
    baseURL: 'https://api.discogs.com',
    params: {
        key: DISCOGS_KEY,
        secret: DISCOGS_SECRET
    }
});

/**
 * Calculate distance between two points in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Find record stores near a location
 * @param {Object} params Search parameters
 * @param {string} [params.location] Address or place name to search near
 * @param {number} [params.latitude] Latitude coordinate
 * @param {number} [params.longitude] Longitude coordinate
 * @param {number} [params.radius=5000] Search radius in meters (max 50000)
 * @returns {Promise<Array>} Array of store objects
 */
async function findNearbyStores({ location, latitude, longitude, radius = 5000 }) {
    try {
        let searchLocation;

        // Get coordinates from address if provided
        if (location) {
            const geocodeResponse = await googleMapsClient.get('/geocode/json', {
                params: { address: location }
            });

            if (geocodeResponse.data.status !== 'OK') {
                throw new Error(geocodeResponse.data.error_message || 'Location not found');
            }

            if (!geocodeResponse.data.results?.[0]?.geometry?.location) {
                throw new Error('No results found for this location');
            }

            searchLocation = geocodeResponse.data.results[0].geometry.location;
        } else {
            searchLocation = { lat: latitude, lng: longitude };
        }

        // Search for record stores
        const placesResponse = await googleMapsClient.get('/place/nearbysearch/json', {
            params: {
                location: `${searchLocation.lat},${searchLocation.lng}`,
                radius: radius,
                type: 'store',
                keyword: 'record store vinyl'
            }
        });

        if (placesResponse.data.status !== 'OK' && placesResponse.data.status !== 'ZERO_RESULTS') {
            throw new Error(placesResponse.data.error_message || 'Error searching for stores');
        }

        if (!placesResponse.data.results?.length) {
            return [];
        }

        // Get additional details for each store
        const stores = await Promise.all(
            placesResponse.data.results.map(async (place) => {
                try {
                    const detailsResponse = await googleMapsClient.get('/place/details/json', {
                        params: {
                            place_id: place.place_id,
                            fields: 'name,formatted_address,geometry,rating,photos,opening_hours,website'
                        }
                    });

                    if (detailsResponse.data.status !== 'OK') {
                        return null;
                    }

                    const details = detailsResponse.data.result;

                    // Try to find existing store in database
                    let store = await Store.findOne({ placeId: place.place_id });
                    
                    if (!store) {
                        // Create new store if not found
                        store = await Store.create({
                            placeId: place.place_id,
                            name: details.name,
                            address: details.formatted_address,
                            location: {
                                lat: details.geometry.location.lat,
                                lng: details.geometry.location.lng
                            },
                            rating: details.rating,
                            photos: details.photos?.map(photo => 
                                `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`
                            ),
                            website: details.website
                        });
                    }

                    return {
                        id: store.placeId,
                        name: store.name,
                        address: store.address,
                        location: store.location,
                        rating: store.rating,
                        photos: store.photos,
                        openNow: details.opening_hours?.open_now,
                        distance: calculateDistance(
                            searchLocation.lat,
                            searchLocation.lng,
                            store.location.lat,
                            store.location.lng
                        ),
                        hasInventory: !!store.discogsUsername
                    };
                } catch (error) {
                    console.error(`Error getting details for store ${place.name}:`, error);
                    return null;
                }
            })
        );

        // Filter out failed stores and sort by distance
        const validStores = stores.filter(store => store !== null);
        validStores.sort((a, b) => (a.distance || 0) - (b.distance || 0));

        return validStores;
    } catch (error) {
        console.error('Error finding stores:', error);
        throw error;
    }
}

/**
 * Search for records in a store's inventory
 * @param {Object} params Search parameters
 * @param {string} params.storeId Discogs store/seller ID
 * @param {string} params.query Search query
 * @returns {Promise<Array>} Array of record objects
 */
async function searchStoreInventory({ storeId, query }) {
    try {
        // Get store from database
        const store = await Store.findOne({ placeId: storeId });
        if (!store || !store.discogsUsername) {
            return {
                hasInventory: false,
                message: 'This store does not have a linked Discogs inventory',
                listings: []
            };
        }

        const response = await discogsClient.get(`/users/${store.discogsUsername}/inventory`, {
            params: {
                q: query,
                format: 'Vinyl',
                per_page: 50
            }
        });

        return {
            hasInventory: true,
            listings: response.data.listings.map(item => ({
                id: item.id.toString(),
                title: item.release.title,
                artist: item.release.artist,
                thumb: item.release.thumb || '/images/default-album.png',
                format: item.release.format || 'Vinyl',
                year: item.release.year || 'Unknown',
                url: item.uri,
                condition: item.condition,
                price: item.price
            }))
        };
    } catch (error) {
        console.error('Error searching inventory:', error);
        throw error;
    }
}

/**
 * Get store details by place ID
 * @param {string} placeId Google Places ID of the store
 * @returns {Promise<Object>} Store details
 */
async function getStoreDetails(placeId) {
    try {
        // Try to get store from database first
        let store = await Store.findOne({ placeId });
        
        // Fetch fresh details from Google Places
        const detailsResponse = await googleMapsClient.get('/place/details/json', {
            params: {
                place_id: placeId,
                fields: 'name,formatted_address,geometry,rating,photos,opening_hours,website'
            }
        });

        if (detailsResponse.data.status !== 'OK') {
            throw new Error(detailsResponse.data.error_message || 'Store not found');
        }

        const details = detailsResponse.data.result;
        const photos = details.photos?.map(photo => 
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`
        );

        // Update or create store in database
        if (!store) {
            store = await Store.create({
                placeId,
                name: details.name,
                address: details.formatted_address,
                location: {
                    lat: details.geometry.location.lat,
                    lng: details.geometry.location.lng
                },
                rating: details.rating,
                photos,
                website: details.website
            });
        } else {
            store.name = details.name;
            store.address = details.formatted_address;
            store.location = {
                lat: details.geometry.location.lat,
                lng: details.geometry.location.lng
            };
            store.rating = details.rating;
            store.photos = photos;
            store.website = details.website;
            store.lastUpdated = new Date();
            await store.save();
        }

        return {
            id: store.placeId,
            name: store.name,
            address: store.address,
            location: store.location,
            rating: store.rating,
            photos: store.photos,
            openNow: details.opening_hours?.open_now,
            website: store.website,
            hasInventory: !!store.discogsUsername
        };
    } catch (error) {
        console.error('Error getting store details:', error);
        throw error;
    }
}

/**
 * Link a store with a Discogs seller account
 * @param {string} placeId Google Places ID of the store
 * @param {string} discogsUsername Discogs seller username
 */
async function linkDiscogsAccount(placeId, discogsUsername) {
    try {
        // Verify the Discogs account exists and is a seller
        const response = await discogsClient.get(`/users/${discogsUsername}`);
        if (!response.data || response.data.num_for_sale === undefined) {
            throw new Error('Invalid Discogs seller account');
        }

        // Update store in database
        const store = await Store.findOne({ placeId });
        if (!store) {
            throw new Error('Store not found');
        }

        store.discogsUsername = discogsUsername;
        store.lastUpdated = new Date();
        await store.save();

        return {
            success: true,
            message: 'Successfully linked Discogs account'
        };
    } catch (error) {
        console.error('Error linking Discogs account:', error);
        throw error;
    }
}

module.exports = {
    findNearbyStores,
    searchStoreInventory,
    getStoreDetails,
    linkDiscogsAccount
};
