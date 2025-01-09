const Discogs = require('disconnect').Client;

const db = new Discogs({
    consumerKey: process.env.DISCOGS_CONSUMER_KEY,
    consumerSecret: process.env.DISCOGS_CONSUMER_SECRET,
}).database();

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function searchRecords(query) {
    try {
        const searchResults = await db.search({
            query: query,
            type: 'release',
            format: 'Vinyl',
            per_page: 40,
        });

        return searchResults.results.map(result => ({
            id: result.id,
            title: result.title.split(' - ')[1]?.trim() || result.title.trim(),
            artist: result.title.split(' - ')[0]?.trim() || 'Unknown Artist',
            year: result.year,
            thumb: result.thumb || '/images/default-album.png',
            format: Array.isArray(result.format) ? result.format[0] : 'LP'
        }));
    } catch (error) {
        if (error.statusCode === 429) {
            await sleep(2000);
            return searchRecords(query);
        }
        throw error;
    }
}

async function getRecordDetails(releaseId) {
    try {
        const release = await db.getRelease(releaseId);

        return {
            title: release.title.split(' - ')[1]?.trim() || release.title.trim(),
            artist: release.artists?.[0]?.name || release.title.split(' - ')[0]?.trim(),
            year: release.year,
            format: release.formats?.[0]?.name || 'LP',
            imageUrl: release.images?.[0]?.resource_url || release.thumb || '/images/default-album.png',
            tags: [...new Set([
                ...(release.genres || []),
                ...(release.styles || [])
            ])].join(',')
        };
    } catch (error) {
        if (error.statusCode === 429) {
            await sleep(2000);
            return getRecordDetails(releaseId);
        }
        throw error;
    }
}

module.exports = {
    searchRecords,
    getRecordDetails
};