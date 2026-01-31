# iOS Splash Screens

This folder should contain splash screen images for iOS PWA support.

## Required Sizes

Generate PNG images at the following sizes:

| File Name | Size | Device |
|-----------|------|--------|
| splash-640x1136.png | 640x1136 | iPhone SE |
| splash-750x1334.png | 750x1334 | iPhone 8 |
| splash-1242x2208.png | 1242x2208 | iPhone 8 Plus |
| splash-1125x2436.png | 1125x2436 | iPhone X/XS/11 Pro |
| splash-828x1792.png | 828x1792 | iPhone XR/11 |
| splash-1242x2688.png | 1242x2688 | iPhone XS Max/11 Pro Max |
| splash-1080x2340.png | 1080x2340 | iPhone 12 mini/13 mini |
| splash-1170x2532.png | 1170x2532 | iPhone 12/13/14 |
| splash-1284x2778.png | 1284x2778 | iPhone 12/13 Pro Max/14 Plus |
| splash-1179x2556.png | 1179x2556 | iPhone 14 Pro |
| splash-1290x2796.png | 1290x2796 | iPhone 14 Pro Max |

## Generation Options

### Option 1: Online Generator
Use an online tool like:
- https://appsco.pe/developer/splash-screens
- https://progressier.com/pwa-icons-and-ios-splash-screen-generator

### Option 2: Node.js Script
1. Install sharp: `npm install sharp --save-dev`
2. Run: `node scripts/generate-splash-screens.js`

## Design Guidelines

- Use a gradient background (#2563eb to #1d4ed8)
- Center the app icon and name
- Keep text readable at all sizes
- Use transparent PNG format
