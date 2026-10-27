const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native/rn-get-polyfills': path.resolve(
    __dirname,
    'node_modules/react-native/rn-get-polyfills.js'
  ),
};

module.exports = withNativeWind(config, { input: './global.css' });
