const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  '@/lib': path.resolve(__dirname, 'src/lib'),
  '@/components': path.resolve(__dirname, 'src/components'),
  '@/hooks': path.resolve(__dirname, 'src/hooks'),
  '@/utils': path.resolve(__dirname, 'src/utils'),
  '@/contexts': path.resolve(__dirname, 'src/contexts'),
  '@/styles': path.resolve(__dirname, 'src/styles'),
  '@/app': path.resolve(__dirname, 'app'),
};

module.exports = config;
