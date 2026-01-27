module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@/lib': './src/lib',
            '@/app': './app',
            '@/components': './src/components',
            '@/hooks': './src/hooks',
            '@/utils': './src/utils',
            '@/contexts': './src/contexts',
            '@/styles': './src/styles',
          },
        },
      ],
    ],
  };
};
