# PWA Icons

This directory contains icons for Progressive Web App (PWA) support.

## Current Status

⚠️ **TODO**: The icons in this directory are currently placeholders copied from `assets/icon.png`. 
They need to be replaced with properly sized PNG images:

- `icon-192.png`: 192x192 pixels (required for Android)
- `icon-512.png`: 512x512 pixels (required for Android)
- `icon-180.png`: 180x180 pixels (required for iOS Apple Touch Icon)

## How to Generate Proper Icons

1. Start with a high-resolution source image (at least 512x512px, square)
2. Use an image editor or tool to resize:
   - ImageMagick: `convert source.png -resize 192x192 icon-192.png`
   - Online tools: Use any image resizer
   - Design tools: Export at the specified sizes

3. Ensure icons:
   - Are square (1:1 aspect ratio)
   - Have transparent backgrounds (if needed)
   - Are optimized PNG files
   - Follow platform guidelines (Android Material Design, iOS Human Interface Guidelines)

## Icon Requirements

- **Format**: PNG
- **192x192**: Minimum size for Android home screen
- **512x512**: Recommended for Android splash screens and high-DPI displays
- **180x180**: iOS Apple Touch Icon (required for iOS home screen)
