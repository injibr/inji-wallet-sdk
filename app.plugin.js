/**
 * Expo config plugin for vc-sdk-headless
 * Configures Android build: Maven repos and flatDir for AAR dependencies.
 * Module registration and linking are handled by React Native autolinking.
 */
const { withProjectBuildGradle } = require('@expo/config-plugins');
const path = require('path');

function withVcSdkHeadless(config) {
  config = withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes('repo.danubetech.com')) {
      // __dirname is the root of this package (where app.plugin.js lives)
      const libsPath = path.join(__dirname, 'android', 'libs').replace(/\\/g, '/');

      contents = contents.replace(
        /(allprojects\s*\{[\s\S]*?repositories\s*\{)/,
        `$1\n        maven { url 'https://repo.danubetech.com/repository/maven-public/' }\n        flatDir { dirs '${libsPath}' }`
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
}

module.exports = withVcSdkHeadless;
