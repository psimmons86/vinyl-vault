// Initialize Discogs API client
const Discogs = require('disconnect').Client;

// Create database connection with API credentials
const db = new Discogs({
   consumerKey: process.env.DISCOGS_CONSUMER_KEY,
   consumerSecret: process.env.DISCOGS_CONSUMER_SECRET,
}).database();

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

// Export functions for use in other files
module.exports = {
   searchRecords,
   getRecordDetails
};