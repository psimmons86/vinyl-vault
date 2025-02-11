const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const sizes = {
  'favicon-16x16.png': 16,
  'favicon-32x32.png': 32,
  'apple-touch-icon.png': 180,
  'android-chrome-192x192.png': 192,
  'android-chrome-512x512.png': 512
};

async function generateFavicons() {
  try {
    // Read the SVG file
    const svgBuffer = await fs.readFile('public/images/favicon.svg');
    
    // Create the output directory if it doesn't exist
    await fs.mkdir('public/images', { recursive: true });

    // Generate each size
    for (const [filename, size] of Object.entries(sizes)) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(`public/images/${filename}`);
      
      console.log(`Generated ${filename}`);
    }

    console.log('All favicons generated successfully!');
  } catch (error) {
    console.error('Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();
