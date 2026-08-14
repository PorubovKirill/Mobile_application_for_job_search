const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.extraNodeModules = {
  ...defaultConfig.resolver.extraNodeModules,
  assert: require.resolve('assert'),
  buffer: require.resolve('buffer'),
  crypto: require.resolve('react-native-crypto'),
  http: require.resolve('stream-http'),
  https: require.resolve('https-browserify'),
  os: require.resolve('os-browserify/browser'),
  path: require.resolve('path-browserify'),
  stream: require.resolve('readable-stream'),
  vm: require.resolve('vm-browserify'),
  zlib: require.resolve('browserify-zlib'),
  net: require.resolve('react-native-tcp-socket'),
  tls: require.resolve('react-native-tcp-socket'),
  url: require.resolve('react-native-url-polyfill'),
};
module.exports = defaultConfig;
