require('dotenv').config();

module.exports = {
  expo: {
    name: 'Full Stylist',
    slug: 'full-stylist',
    version: '1.0.0',
    orientation: 'portrait',
    // Placeholder PNGs (valid 1x1) — replace with proper icon/splash/favicon via scripts/generate-assets.js
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['assets/**'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.fullstylist.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.fullstylist.app',
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
      // PWA Configuration
      manifest: {
        name: 'Outfits',
        short_name: 'Outfits',
        description: 'AI styling app for creating virtual headshots and outfits',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        orientation: 'portrait',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      // iOS-specific meta tags
      meta: {
        'apple-mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-status-bar-style': 'default',
        'apple-mobile-web-app-title': 'Outfits',
        'theme-color': '#ffffff',
      },
    },
    scheme: 'fullstylist',
    plugins: ['expo-router'],
    extra: {
      // Expose environment variables to the app
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};
