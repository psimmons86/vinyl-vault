# Vinyl Vault

![Vinyl Vault Screenshot](https://i.imgur.com/ZVqvtvA.png)

Your Records Online - A modern web application for managing and tracking your vinyl record collection.

Vinyl Vault is a full-stack web application built for vinyl enthusiasts who want to digitally catalog and track their record collections. With Discogs integration, detailed statistics, and a clean interface, it's the perfect tool for managing your growing vinyl library.

## Features

### Collection Management
- Add, edit, and organize your vinyl records
- Track play counts and listening history
- Tag records for easy categorization
- Add notes and details to each record
- Track collection value and individual record values
- Support for multiple media types (Vinyl, CD, Cassette, etc.)

### Discogs Integration
- Search the Discogs database
- Import record details automatically
- Album artwork and metadata integration

### Statistics & Insights
- View your total collection size and value
- Track total plays across all records
- See your top artists by collection size
- Monitor your most played records
- Analyze your collection by decade
- View top tags and genres
- Financial insights and value tracking
- Detailed collection analytics

### Social Features
- MySpace-inspired profile customization
- Top 8 favorite records display
- Public/private profile options
- Activity feed of recent plays
- Share collections and wishlists

### Location Features
- Record store map integration
- Find nearest vinyl shops
- Store favorites and visited locations
- Community store ratings and reviews

### User Features
- Secure user authentication
- Public/private profile options
- Personalized collection dashboard
- Customizable profile themes

## Prerequisites
- Node.js
- MongoDB
- Discogs API credentials
- Google Maps API key (for store locator)

## Environment Variables
Create a `.env` file with the following:
```
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
DISCOGS_CONSUMER_KEY=your_discogs_key
DISCOGS_CONSUMER_SECRET=your_discogs_secret
GOOGLE_MAPS_API_KEY=your_maps_api_key
```

## Installation
1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables
4. Start the server:
   ```
   npm start
   ```

## Tech Stack
- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose
- **Frontend**: EJS, Materialize CSS
- **Authentication**: Express-session
- **External APIs**: Discogs, Google Maps
- **Styling**: Custom CSS with theme support

## Project Structure
```
├── controllers/    # Route handlers
├── middleware/     # Custom middleware
├── models/         # MongoDB schemas
├── public/         # Static files
├── services/       # External services (Discogs, Maps)
└── views/          # EJS templates
```

## Upcoming Features
- MySpace-style profile customization
- Record store locator map
- Support for additional media types
- Enhanced collection statistics
- Profile themes and customization
- Social features and sharing
- Mobile app version

## Contributing
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## Live Demo
[Vinyl Vault](https://vinyl-vault-48903370aef6.herokuapp.com/)