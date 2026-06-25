/**
 * Expo config plugin for vc-sdk-headless
 * Configures Android build: Maven repos, project include, dependency, and package registration.
 */
const {
  withProjectBuildGradle,
  withSettingsGradle,
  withMainApplication,
  withAppBuildGradle,
} = require('@expo/config-plugins');

function withVcSdkHeadless(config) {
  // 1. Add Maven repos and flatDir to root build.gradle
  config = withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes('repo.danubetech.com')) {
      contents = contents.replace(
        /(allprojects\s*\{[\s\S]*?repositories\s*\{)/,
        `$1\n        maven { url 'https://repo.danubetech.com/repository/maven-public/' }\n        flatDir { dirs project(':vc-sdk-headless').projectDir.toString() + '/libs' }`
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  // 2. Include vc-sdk-headless project in settings.gradle
  config = withSettingsGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes(':vc-sdk-headless')) {
      contents += `\ninclude ':vc-sdk-headless'\nproject(':vc-sdk-headless').projectDir = new File(rootProject.projectDir, '../node_modules/vc-sdk-headless/android')\n`;
    }

    config.modResults.contents = contents;
    return config;
  });

  // 3. Add implementation dependency in app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes("project(':vc-sdk-headless')")) {
      contents = contents.replace(
        /(dependencies\s*\{)/,
        `$1\n    implementation project(':vc-sdk-headless')`
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  // 4. Register VcSdkHeadlessPackage in MainApplication
  config = withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes('VcSdkHeadlessPackage')) {
      // Add import
      contents = contents.replace(
        /(import com\.facebook\.react\.defaults\.DefaultReactNativeHost)/,
        `$1\nimport com.vcsdkheadless.VcSdkHeadlessPackage`
      );

      // Add to packages list
      contents = contents.replace(
        /(PackageList\(this\)\.packages\.apply\s*\{[\s\S]*?\/\/.*\n)/,
        `$1              add(VcSdkHeadlessPackage())\n`
      );
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
}

module.exports = withVcSdkHeadless;
