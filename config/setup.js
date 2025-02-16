const fs = require('fs');
const path = require('path');

/**
 * Initialize required directories and configurations
 */
function initializeApp() {
    // Create required directories if they don't exist
    const requiredDirs = [
        path.join(__dirname, '../public/uploads'),
        path.join(__dirname, '../public/uploads/blog'),
        path.join(__dirname, '../public/uploads/avatars'),
        path.join(__dirname, '../public/uploads/records'),
        path.join(__dirname, '../public/stylesheets')
    ];

    requiredDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

module.exports = { initializeApp };
