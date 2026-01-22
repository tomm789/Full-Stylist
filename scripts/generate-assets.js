const fs = require('fs');
const path = require('path');

// Minimal valid 1x1 PNG (transparent)
// PNG signature + minimal IHDR chunk + IEND chunk
const minimalPNG = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
  0x49, 0x48, 0x44, 0x52, // IHDR
  0x00, 0x00, 0x00, 0x01, // width: 1
  0x00, 0x00, 0x00, 0x01, // height: 1
  0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
  0x1F, 0x15, 0xC4, 0x89, // CRC
  0x00, 0x00, 0x00, 0x00, // IDAT chunk length (empty)
  0x49, 0x44, 0x41, 0x54, // IDAT
  0x78, 0x9C, 0x63, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // zlib compressed data
  0x00, 0x00, 0x00, 0x00, // IEND chunk length
  0x49, 0x45, 0x4E, 0x44, // IEND
  0xAE, 0x42, 0x60, 0x82  // CRC
]);

// Function to create a simple colored PNG (using a minimal approach)
// For actual use, these should be replaced with proper images
function createPlaceholderPNG(size, color = [255, 255, 255, 255]) {
  // This is a simplified approach - in production, use a proper image library
  // For now, we'll create a minimal valid PNG that will work as a placeholder
  return minimalPNG;
}

const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create placeholder files
const assets = [
  { name: 'icon.png', size: 1024 },
  { name: 'splash.png', size: 1242 },
  { name: 'adaptive-icon.png', size: 1024 },
  { name: 'favicon.png', size: 96 }
];

console.log('Generating placeholder assets...');

assets.forEach(asset => {
  const filePath = path.join(assetsDir, asset.name);
  // Create a minimal valid PNG (1x1 transparent)
  // Note: These are minimal placeholders - replace with actual images
  fs.writeFileSync(filePath, minimalPNG);
  console.log(`Created: ${asset.name} (placeholder - replace with actual ${asset.size}x${asset.size}px image)`);
});

console.log('\nAll placeholder assets created!');
console.log('Note: These are minimal 1x1px transparent PNGs.');
console.log('Replace them with proper images before production:');
console.log('  - icon.png: 1024x1024px');
console.log('  - splash.png: 1242x2436px (or appropriate size)');
console.log('  - adaptive-icon.png: 1024x1024px');
console.log('  - favicon.png: 48x48px or 96x96px');
