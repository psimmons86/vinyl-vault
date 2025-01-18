const fetch = require('node-fetch');

const API_KEY = process.env.NEWS_API_KEY;
const BASE_URL = 'https://newsapi.org/v2';

async function getMusicNews(genre = '') {
    try {
        // Build query with genre if provided
        const query = `music ${genre}`.trim();
        const url = `${BASE_URL}/everything?` + new URLSearchParams({
            q: query,
            language: 'en',
            sortBy: 'publishedAt',
            pageSize: 10,
            apiKey: API_KEY
        });

        const response = await fetch(url);
        const data = await response.json();

        // Format the response
        return data.articles.map(article => ({
            title: article.title,
            description: article.description,
            url: article.url,
            imageUrl: article.urlToImage,
            source: article.source.name,
            publishedAt: new Date(article.publishedAt)
        }));
    } catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
}

module.exports = {
    getMusicNews
};