# PWA (Progressive Web App) Implementation Guide

This document describes the PWA implementation for the Full Stylist app and how to test it.

## Overview

The app is now installable as a Progressive Web App (PWA) on both iOS and Android devices. When installed, it runs in standalone mode (no browser UI) and supports offline functionality.

## Features Implemented

1. **Web App Manifest** (`/manifest.webmanifest`)
   - App name: "Outfits"
   - Standalone display mode
   - Icons for 192x192 and 512x512 sizes
   - Theme color: #ffffff

2. **Service Worker** (`/service-worker.js`)
   - Offline caching of app shell
   - Network-first strategy for navigation (ensures updates work)
   - Cache-first strategy for static assets (performance)
   - Automatic cache cleanup on updates

3. **iOS Support**
   - Apple Touch Icon (180x180)
   - Meta tags for standalone mode
   - In-app "Add to Home Screen" banner (iOS Safari only)

4. **Netlify Headers**
   - HTML files: no-cache (ensures updates)
   - Service worker: no-cache (ensures updates)
   - Static assets: long cache (performance)

## Testing Locally

### 1. Build the App

```bash
# Build for web
npx expo export --platform web --output-dir web-build
```

### 2. Serve Locally

You can use any static file server:

```bash
# Option 1: Using Python
cd web-build
python3 -m http.server 8000

# Option 2: Using Node.js http-server
npx http-server web-build -p 8000

# Option 3: Using Netlify CLI
netlify dev
```

### 3. Test in Browser

1. Open `http://localhost:8000` in your browser
2. Open DevTools (F12) → Application tab
3. Check:
   - **Manifest**: Should show "Outfits" with icons
   - **Service Workers**: Should show registered service worker
   - **Application Cache**: Should show cached files

### 4. Test Installation

#### Chrome/Edge (Desktop)
- Look for install icon in address bar
- Click to install
- App should open in standalone window

#### Chrome (Android)
- Open site in Chrome
- Tap menu (⋮) → "Add to Home screen" or "Install app"
- App icon appears on home screen
- Launch from home screen → runs in standalone mode

#### Safari (iOS)
- Open site in Safari (not Chrome/Firefox on iOS)
- Tap Share button (📤)
- Scroll down → "Add to Home Screen"
- Customize name if desired → "Add"
- App icon appears on home screen
- Launch from home screen → runs in standalone mode (no Safari UI)

## Testing on Device (Netlify Deploy)

### Prerequisites
- App must be deployed to Netlify (or accessible via HTTPS)
- HTTPS is required for service workers

### Steps

1. **Deploy to Netlify**
   ```bash
   git push origin main
   # Netlify will auto-deploy
   ```

2. **Test on iPhone**
   - Open Safari on iPhone
   - Navigate to your Netlify URL
   - You should see the "Add to Home Screen" banner at the bottom
   - Tap Share → Add to Home Screen
   - Launch from home screen
   - Verify: No Safari UI (standalone mode)

3. **Test on Android**
   - Open Chrome on Android
   - Navigate to your Netlify URL
   - Chrome should show install prompt
   - Tap "Install" or "Add to Home screen"
   - Launch from home screen
   - Verify: No browser UI (standalone mode)

## Verifying Standalone Mode

### Visual Check
- No browser address bar
- No browser navigation buttons
- App fills entire screen

### Programmatic Check
Open browser console and run:
```javascript
// Check display mode
window.matchMedia('(display-mode: standalone)').matches
// Should return: true

// iOS-specific check
window.navigator.standalone
// Should return: true (iOS only)
```

## Testing Offline Functionality

1. Install the app (add to home screen)
2. Launch the installed app
3. Enable airplane mode (or disable WiFi)
4. App should still load (cached app shell)
5. Navigate between pages (should work if cached)
6. New content may not load (expected - network-first strategy)

## iOS Banner Behavior

The "Add to Home Screen" banner appears when:
- ✅ User is on iOS Safari (not Chrome/Firefox iOS)
- ✅ App is NOT in standalone mode (not installed)
- ✅ User has not dismissed it in the last 30 days

The banner:
- Shows at bottom of screen
- Includes instructions: "Tap 📤 Share → Add to Home Screen"
- Has dismiss button (×)
- Respects safe area insets (iPhone notch)

### Testing Banner Dismissal

1. Open app in iOS Safari
2. Banner appears
3. Tap × to dismiss
4. Banner disappears
5. Refresh page → banner should NOT reappear
6. Clear localStorage → banner will reappear

## Limitations & Notes

### iOS Limitations
- **Push Notifications**: Limited support (requires user interaction)
- **Background Sync**: Not supported
- **Service Worker**: Limited compared to Android
- **Install Prompt**: No automatic prompt (must use Share menu)

### Android Limitations
- Generally better PWA support than iOS
- Full service worker support
- Better offline capabilities

### General Notes
- Service worker updates automatically (no manual refresh needed)
- HTML is not cached aggressively (ensures new deploys work)
- Static assets are cached long-term (performance)
- Manifest changes require app reinstall to take effect

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Ensure HTTPS (required for service workers)
- Check `/service-worker.js` is accessible
- Clear browser cache and reload

### App Not Installing
- Check manifest is valid (use Chrome DevTools)
- Ensure icons are accessible
- Check HTTPS requirement
- Verify start_url and scope in manifest

### Updates Not Appearing
- Service worker uses network-first for HTML
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Uninstall and reinstall app
- Clear service worker cache in DevTools

### iOS Banner Not Showing
- Must be iOS Safari (not Chrome/Firefox)
- Must not be in standalone mode
- Check localStorage for dismissal
- Check browser console for errors

## Files Changed

- `public/manifest.webmanifest` - Web app manifest
- `public/service-worker.js` - Service worker for offline support
- `public/icons/` - PWA icons (192, 512, 180)
- `app.config.js` - Added PWA web configuration
- `app/_layout.tsx` - Service worker registration + iOS banner
- `app/components/AddToHomeScreenBanner.tsx` - iOS banner component
- `netlify.toml` - Caching headers

## Next Steps (Optional Enhancements)

1. **Generate Proper Icons**: Replace placeholder icons with branded 192x192, 512x512, and 180x180 images
2. **Offline Page**: Create custom offline fallback page
3. **Update Notification**: Show toast when new version is available
4. **Background Sync**: Implement for offline actions (Android)
5. **Push Notifications**: Add push notification support (with user interaction on iOS)
