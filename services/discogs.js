const Discogs = require('disconnect').Client;

// Initialize the Discogs client with proper authentication
// We use the authenticated client for better rate limits and full access
const db = new Discogs({
    consumerKey: process.env.DISCOGS_CONSUMER_KEY,        // Your consumer key
    consumerSecret: process.env.DISCOGS_CONSUMER_SECRET,  // Your consumer secret
}).database();

// Helper function to handle Discogs rate limiting
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Function to search the Discogs database with retry logic
async function searchRecords(query, retries = 3) {
    try {
        console.log('Searching Discogs for:', query);
        const searchResults = await db.search({
            query: query,
            type: 'release',         // Only get releases (not artists/labels)
            format: 'Vinyl',         // Only vinyl records
            per_page: 20,            // Limit results for faster response
        });

        // Transform the results into a format our application can use
        return searchResults.results.map(result => ({
            id: result.id,
            title: cleanupTitle(result.title),
            artist: extractArtist(result.title),
            year: result.year,
            thumb: result.thumb || '/images/default-album.png',
            format: Array.isArray(result.format) ? result.format[0] : 'LP',
            label: Array.isArray(result.label) ? result.label[0] : undefined,
            country: result.country
        }));
    } catch (error) {
        // Handle rate limiting
        if (error.statusCode === 429 && retries > 0) {
            console.log('Rate limited, waiting before retry...');
            await sleep(2000);  // Wait 2 seconds before retrying
            return searchRecords(query, retries - 1);
        }
        console.error('Discogs search error:', error);
        throw error;
    }
}

// Function to get detailed information about a specific release
async function getRecordDetails(releaseId, retries = 3) {
    try {
        console.log('Fetching Discogs release:', releaseId);
        const release = await db.getRelease(releaseId);
        
        // Transform the release data into our application's format
        return {
            title: cleanupTitle(release.title),
            artist: release.artists?.[0]?.name || extractArtist(release.title),
            year: release.year,
            format: release.formats?.[0]?.name || 'LP',
            imageUrl: release.images?.[0]?.resource_url || release.thumb || '/images/default-album.png',
            label: release.labels?.[0]?.name,
            // Combine genres and styles for tags
            tags: [...new Set([
                ...(release.genres || []), 
                ...(release.styles || [])
            ])].join(','),
            notes: formatNotes(release)
        };
    } catch (error) {
        // Handle rate limiting
        if (error.statusCode === 429 && retries > 0) {
            console.log('Rate limited, waiting before retry...');
            await sleep(2000);
            return getRecordDetails(releaseId, retries - 1);
        }
        console.error('Discogs release error:', error);
        throw error;
    }
}

// Helper function to clean up Discogs titles
// Discogs often includes artist in title, this removes it
function cleanupTitle(title) {
    const parts = title.split(' - ');
    return parts.length > 1 ? parts[1].trim() : title.trim();
}

// Helper function to extract artist from Discogs title
function extractArtist(title) {
    const parts = title.split(' - ');
    return parts[0].trim();
}

// Helper function to format release notes
function formatNotes(release) {
    const notes = [];
    
    if (release.notes) notes.push(release.notes);
    if (release.formats?.[0]?.descriptions) {
        notes.push(`Format details: ${release.formats[0].descriptions.join(', ')}`);
    }
    
    return notes.join('\n\n');
}

module.exports = {
    searchRecords,
    getRecordDetails
};