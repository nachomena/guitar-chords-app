module.exports = function babelConfigurationFunction(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Inlines the .sql migration files Drizzle's Expo SQLite migrator imports
      // (src/db/migrations/migrations.js) as string constants at build time.
      ['inline-import', { extensions: ['.sql'] }],
      // react-native-reanimated/plugin (renamed react-native-worklets/plugin in
      // Reanimated 4) must always be listed last.
      'react-native-worklets/plugin',
    ],
  };
};
