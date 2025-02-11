const fs = require('fs');
const path = require('path');

/**
 * Initialize required directories and configurations
 */
function initializeApp() {
    // Create uploads directories if they don't exist
    const uploadDirs = [
        path.join(__dirname, '../public/uploads'),
        path.join(__dirname, '../public/uploads/blog'),
        path.join(__dirname, '../public/uploads/avatars'),
        path.join(__dirname, '../public/uploads/records')
    ];

    uploadDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

module.exports = { initializeApp };
