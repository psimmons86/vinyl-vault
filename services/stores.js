const axios = require('axios');

/**
 * Find record stores near a location using Google Places API
 * @param {Object} params Search parameters
 * @param {number} params.latitude Latitude coordinate
 * @param {number} params.longitude Longitude coordinate
 * @param {number} [params.radius=5000] Search radius in meters (max 50000)
 * @returns {Promise<Array>} Array of store objects
 */
async function findNearbyStores({ latitude, longitude, radius = 5000 }) {
    try {
        const response = await axios.get(
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
            {
                params: {
                    location: `${latitude},${longitude}`,
                    radius: Math.min(radius, 50000),
                    type: 'store',
                    keyword: 'record store vinyl',
                    key: process.env.GOOGLE_API_KEY
                }
            }
        );

        if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
            throw new Error(`Google Places API error: ${response.data.status}`);
        }

        return (response.data.results || []).map(place => ({
            id: place.place_id,
            name: place.name,
            address: place.vicinity,
            rating: place.rating,
            openNow: place.opening_hours?.open_now,
            distance: getDistance(
                latitude,
                longitude,
                place.geometry.location.lat,
                place.geometry.location.lng
            )
        }));
    } catch (error) {
        console.error('Error finding stores:', error);
        throw new Error('Failed to find nearby stores. Please try again.');
    }
}

/**
 * Get store details by place ID
 * @param {string} placeId Google Places ID of the store
 * @returns {Promise<Object>} Store details
 */
async function getStoreDetails(placeId) {
    try {
        const response = await axios.get(
            'https://maps.googleapis.com/maps/api/place/details/json',
            {
                params: {
                    place_id: placeId,
                    fields: 'name,formatted_address,geometry,rating,opening_hours,formatted_phone_number,website',
                    key: process.env.GOOGLE_API_KEY
                }
            }
        );

        if (response.data.status !== 'OK') {
            throw new Error(`Google Places API error: ${response.data.status}`);
        }

        const place = response.data.result;
        return {
            id: placeId,
            name: place.name,
            address: place.formatted_address,
            location: {
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng
            },
            rating: place.rating,
            openNow: place.opening_hours?.open_now,
            hours: place.opening_hours?.weekday_text,
            phone: place.formatted_phone_number,
            website: place.website
        };
    } catch (error) {
        console.error('Error getting store details:', error);
        throw new Error('Failed to get store details. Please try again.');
    }
}

/**
 * Calculate distance between two points in meters
 * Uses the Haversine formula
 */
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

module.exports = {
    findNearbyStores,
    getStoreDetails
};
