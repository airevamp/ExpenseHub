/**
 * Splash Screen Generator for ExpenseHub PWA
 *
 * This script generates splash screen images for iOS devices.
 * Run this with Node.js after installing the 'sharp' package:
 *
 * npm install sharp --save-dev
 * node scripts/generate-splash-screens.js
 *
 * Alternatively, use an online tool like:
 * - https://appsco.pe/developer/splash-screens
 * - https://progressier.com/pwa-icons-and-ios-splash-screen-generator
 */

const fs = require('fs');
const path = require('path');

// Splash screen sizes for iOS devices
const splashSizes = [
  { width: 640, height: 1136, name: 'splash-640x1136.png' },   // iPhone SE
  { width: 750, height: 1334, name: 'splash-750x1334.png' },   // iPhone 8
  { width: 1242, height: 2208, name: 'splash-1242x2208.png' }, // iPhone 8 Plus
  { width: 1125, height: 2436, name: 'splash-1125x2436.png' }, // iPhone X/XS/11 Pro
  { width: 828, height: 1792, name: 'splash-828x1792.png' },   // iPhone XR/11
  { width: 1242, height: 2688, name: 'splash-1242x2688.png' }, // iPhone XS Max/11 Pro Max
  { width: 1080, height: 2340, name: 'splash-1080x2340.png' }, // iPhone 12 mini/13 mini
  { width: 1170, height: 2532, name: 'splash-1170x2532.png' }, // iPhone 12/13/14
  { width: 1284, height: 2778, name: 'splash-1284x2778.png' }, // iPhone 12/13 Pro Max/14 Plus
  { width: 1179, height: 2556, name: 'splash-1179x2556.png' }, // iPhone 14 Pro
  { width: 1290, height: 2796, name: 'splash-1290x2796.png' }, // iPhone 14 Pro Max
];

const outputDir = path.join(__dirname, '../src/assets/splash');

// Create output directory
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateSplashScreens() {
  try {
    const sharp = require('sharp');

    for (const size of splashSizes) {
      const { width, height, name } = size;

      // Create a splash screen with the app branding
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#2563eb"/>
              <stop offset="100%" style="stop-color:#1d4ed8"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#bg)"/>
          <text x="50%" y="45%" font-family="system-ui, -apple-system, sans-serif"
                font-size="${Math.round(width * 0.15)}" fill="white" text-anchor="middle" dominant-baseline="middle">
            💰
          </text>
          <text x="50%" y="55%" font-family="system-ui, -apple-system, sans-serif"
                font-size="${Math.round(width * 0.06)}" font-weight="bold" fill="white"
                text-anchor="middle" dominant-baseline="middle">
            ExpenseHub
          </text>
        </svg>
      `;

      await sharp(Buffer.from(svg))
        .png()
        .toFile(path.join(outputDir, name));

      console.log(`Generated: ${name}`);
    }

    console.log('\\nAll splash screens generated successfully!');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('Sharp module not found. Creating placeholder files...');
      createPlaceholders();
    } else {
      console.error('Error generating splash screens:', error);
    }
  }
}

function createPlaceholders() {
  // Create placeholder SVG files as a fallback
  for (const size of splashSizes) {
    const { width, height, name } = size;
    const svgName = name.replace('.png', '.svg');

    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="50%" y="50%" font-family="system-ui" font-size="${Math.round(width * 0.06)}"
        font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">
    ExpenseHub
  </text>
</svg>`;

    fs.writeFileSync(path.join(outputDir, svgName), svg);
    console.log(`Created placeholder: ${svgName}`);
  }

  console.log('\\nPlaceholder SVG files created.');
  console.log('For production, generate proper PNG splash screens using an online tool.');
}

generateSplashScreens();
