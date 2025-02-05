const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Ensure upload directories exist
async function ensureDirectories() {
    const dirs = [
        'public/uploads',
        'public/uploads/profile',
        'public/uploads/banner',
        'public/uploads/records'
    ];
    
    for (const dir of dirs) {
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
    }
}

// Create upload directories
ensureDirectories().catch(console.error);

// Configure storage based on file type
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = 'public/uploads/';
        
        // Determine appropriate subdirectory based on field name
        switch (file.fieldname) {
            case 'profilePicture':
                uploadPath += 'profile/';
                break;
            case 'bannerImage':
                uploadPath += 'banner/';
                break;
            case 'albumArt':
                uploadPath += 'records/';
                break;
            default:
                uploadPath += 'misc/';
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Create unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

module.exports = upload;
