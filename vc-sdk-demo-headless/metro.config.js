const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Watch the vc-sdk-headless folder
const vcSdkPath = path.resolve(__dirname, '../vc-sdk-headless');

config.watchFolders = [vcSdkPath];

// Add node_modules from vc-sdk-headless
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(vcSdkPath, 'node_modules'),
];

module.exports = config;
