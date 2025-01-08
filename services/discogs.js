const Discogs = require('disconnect').Client;

// Initialize the Discogs client with proper authentication
const db = new Discogs({
    consumerKey: process.env.DISCOGS_CONSUMER_KEY,        
    consumerSecret: process.env.DISCOGS_CONSUMER_SECRET, 
}).database();


const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));


async function searchRecords(query, retries = 3) {
    try {
        console.log('Searching Discogs for:', query);
        const searchResults = await db.search({
            query: query,
            type: 'release',         
            format: 'Vinyl',         
            per_page: 40,            
        });

        
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
        
        if (error.statusCode === 429 && retries > 0) {
            console.log('Rate limited, waiting before retry...');
            await sleep(2000); 
            return searchRecords(query, retries - 1);
        }
        console.error('Discogs search error:', error);
        throw error;
    }
}


async function getRecordDetails(releaseId, retries = 3) {
    try {
        console.log('Fetching Discogs release:', releaseId);
        const release = await db.getRelease(releaseId);
        
        
        return {
            title: cleanupTitle(release.title),
            artist: release.artists?.[0]?.name || extractArtist(release.title),
            year: release.year,
            format: release.formats?.[0]?.name || 'LP',
            imageUrl: release.images?.[0]?.resource_url || release.thumb || '/images/default-album.png',
            label: release.labels?.[0]?.name,
            
            tags: [...new Set([
                ...(release.genres || []), 
                ...(release.styles || [])
            ])].join(','),
            notes: formatNotes(release)
        };
    } catch (error) {
        
        if (error.statusCode === 429 && retries > 0) {
            console.log('Rate limited, waiting before retry...');
            await sleep(2000);
            return getRecordDetails(releaseId, retries - 1);
        }
        console.error('Discogs release error:', error);
        throw error;
    }
}

function cleanupTitle(title) {
    const parts = title.split(' - ');
    return parts.length > 1 ? parts[1].trim() : title.trim();
}

function extractArtist(title) {
    const parts = title.split(' - ');
    return parts[0].trim();
}

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