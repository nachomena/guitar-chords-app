module.exports = function babelConfigurationFunction(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated/plugin (renamed react-native-worklets/plugin in
      // Reanimated 4) must always be listed last.
      'react-native-worklets/plugin',
    ],
  };
};
