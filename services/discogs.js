// Initialize Discogs API client
const Discogs = require('disconnect').Client;

// Create database connection with API credentials
const discogs = new Discogs({
   consumerKey: process.env.DISCOGS_KEY,
   consumerSecret: process.env.DISCOGS_SECRET,
});

// Get database instance
const db = discogs.database();

// Get user instance for collection access
const user = discogs.user();

// Helper function to pause execution (used for rate limiting)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
* Search Discogs database for vinyl records
* @param {string} query - Search query string
* @returns {Array} Formatted array of search results
*/
async function searchRecords(query) {
   try {
       // Search Discogs API with parameters
       const searchResults = await db.search({
           query: query,
           type: 'release',     // Only get releases (not artists/labels)
           format: 'Vinyl',     // Only vinyl records
           per_page: 40,        // Number of results to return
       });

       // Format the results for our application
       return searchResults.results.map(result => ({
           id: result.id,
           // Split title on dash to separate artist/title if possible
           title: result.title.split(' - ')[1]?.trim() || result.title.trim(),
           artist: result.title.split(' - ')[0]?.trim() || 'Unknown Artist',
           year: result.year,
           // Use default image if none provided
           thumb: result.thumb || '/images/default-album.png',
           // Get first format or default to LP
           format: Array.isArray(result.format) ? result.format[0] : 'LP'
       }));
   } catch (error) {
       // Handle rate limiting by waiting and retrying
       if (error.statusCode === 429) {
           await sleep(2000);  // Wait 2 seconds
           return searchRecords(query);  // Try again
       }
       throw error;
   }
}

/**
* Get detailed information about a specific record
* @param {string} releaseId - Discogs release ID
* @returns {Object} Formatted record details
*/
async function getRecordDetails(releaseId) {
   try {
       // Fetch specific release from Discogs
       const release = await db.getRelease(releaseId);

       return {
           // Parse title and artist from release data
           title: release.title.split(' - ')[1]?.trim() || release.title.trim(),
           artist: release.artists?.[0]?.name || release.title.split(' - ')[0]?.trim(),
           year: release.year,
           // Get format or default to LP
           format: release.formats?.[0]?.name || 'LP',
           // Get image URL with fallbacks
           imageUrl: release.images?.[0]?.resource_url || release.thumb || '/images/default-album.png',
           // Combine and deduplicate genres and styles into tags
           tags: [...new Set([
               ...(release.genres || []),
               ...(release.styles || [])
           ])].join(',')
       };
   } catch (error) {
       // Handle rate limiting
       if (error.statusCode === 429) {
           await sleep(2000);
           return getRecordDetails(releaseId);
       }
       throw error;
   }
}

/**
 * Search for record stores
 * @param {string} location - Location to search for (city, state, etc.)
 * @returns {Array} Array of stores
 */
async function findStores(location) {
    try {
        const searchResults = await db.search({
            query: location,
            type: 'label',    // Search for labels (stores)
            per_page: 20
        });

        return searchResults.results.map(result => ({
            name: result.title,
            location: result.location || 'Location not specified',
            thumb: result.thumb || '/images/default-album.png',
            url: `https://www.discogs.com/label/${result.id}`,
            resource_url: result.resource_url
        }));
    } catch (error) {
        if (error.statusCode === 429) {
            await sleep(2000);
            return findStores(location);
        }
        throw error;
    }
}

/**
 * Search for records at a specific store/label
 * @param {string} query - Search query
 * @param {string} labelId - Discogs label ID
 * @returns {Array} Array of records
 */
async function searchStoreInventory(query, labelId) {
    try {
        const searchResults = await db.search({
            query: query,
            type: 'release',
            label: labelId,
            format: 'Vinyl',
            per_page: 30
        });

        return searchResults.results.map(result => ({
            id: result.id,
            title: result.title.split(' - ')[1]?.trim() || result.title.trim(),
            artist: result.title.split(' - ')[0]?.trim() || 'Unknown Artist',
            year: result.year,
            thumb: result.thumb || '/images/default-album.png',
            format: Array.isArray(result.format) ? result.format[0] : 'LP',
            url: `https://www.discogs.com/release/${result.id}`
        }));
    } catch (error) {
        if (error.statusCode === 429) {
            await sleep(2000);
            return searchStoreInventory(query, labelId);
        }
        throw error;
    }
}

/**
 * Get detailed information about a store/label
 * @param {string} labelId - Discogs label ID
 * @returns {Object} Formatted store details
 */
async function getStoreDetails(labelId) {
    try {
        const label = await db.getLabel(labelId);
        
        return {
            id: label.id,
            name: label.name,
            location: label.profile?.match(/Location:\s*([^\n]+)/)?.[1] || 'Location not specified',
            profile: label.profile,
            url: `https://www.discogs.com/label/${label.id}`,
            thumb: label.images?.[0]?.resource_url || '/images/default-banner.jpg'
        };
    } catch (error) {
        if (error.statusCode === 429) {
            await sleep(2000);
            return getStoreDetails(labelId);
        }
        throw error;
    }
}

/**
 * Get a user's Discogs collection
 * @param {string} username - Discogs username
 * @param {number} page - Page number for pagination
 * @returns {Promise<Array>} Array of collection items
 */
async function getUserCollection(username, page = 1) {
    try {
        const collection = await user.collection().getReleases(username, 0, {
            page: page,
            per_page: 100,
            sort: 'artist',
            sort_order: 'asc'
        });

        // Map collection items to our format
        return collection.releases.map(item => ({
            id: item.id,
            title: item.basic_information.title,
            artist: item.basic_information.artists[0].name,
            year: item.basic_information.year,
            imageUrl: item.basic_information.cover_image || '/images/default-album.png',
            format: item.basic_information.formats[0].name || 'LP',
            tags: [
                ...(item.basic_information.genres || []),
                ...(item.basic_information.styles || [])
            ].join(',')
        }));
    } catch (error) {
        if (error.statusCode === 429) {
            await sleep(2000);
            return getUserCollection(username, page);
        }
        throw error;
    }
}

module.exports = {
    searchRecords,
    getRecordDetails,
    findStores,
    searchStoreInventory,
    getStoreDetails,
    getUserCollection
};
