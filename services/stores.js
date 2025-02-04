const axios = require('axios');

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

                    return {
                        id: place.place_id,
                        name: details.name,
                        address: details.formatted_address,
                        location: details.geometry.location,
                        rating: details.rating,
                        photos: details.photos?.map(photo => 
                            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_API_KEY}`
                        ),
                        openNow: details.opening_hours?.open_now,
                        distance: calculateDistance(
                            searchLocation.lat,
                            searchLocation.lng,
                            details.geometry.location.lat,
                            details.geometry.location.lng
                        )
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
        const response = await discogsClient.get(`/users/${storeId}/inventory`, {
            params: {
                q: query,
                format: 'Vinyl',
                per_page: 50
            }
        });

        return response.data.listings.map(item => ({
            id: item.id.toString(),
            title: item.release.title,
            artist: item.release.artist,
            thumb: item.release.thumb || '/images/default-album.png',
            format: item.release.format || 'Vinyl',
            year: item.release.year || 'Unknown',
            url: item.uri,
            condition: item.condition,
            price: item.price
        }));
    } catch (error) {
        console.error('Error searching inventory:', error);
        throw error;
    }
}

module.exports = {
    findNearbyStores,
    searchStoreInventory
};
