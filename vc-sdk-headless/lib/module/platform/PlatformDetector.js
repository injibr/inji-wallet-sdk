"use strict";

/**
 * Detects the current platform and provides environment information
 */
export class PlatformDetector {
  static cachedInfo = null;

  /**
   * Get comprehensive platform information
   */
  static getPlatformInfo() {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }
    const platform = this.detectPlatform();
    const isExpoGo = this.isExpoGo();
    const isExpoManaged = this.isExpoManaged();
    this.cachedInfo = {
      platform,
      isExpoGo,
      isExpoManaged,
      supportsSecureStorage: this.supportsSecureStorage(platform),
      supportsBiometrics: this.supportsBiometrics(platform),
      supportsFileSystem: this.supportsFileSystem(platform)
    };
    return this.cachedInfo;
  }

  /**
   * Detect the current platform type
   */
  static detectPlatform() {
    try {
      // Check for Expo constants first
      const Constants = require('expo-constants').default;
      return 'expo';
    } catch {
      // Check for web environment
      if (typeof window !== 'undefined' && window.navigator) {
        return 'web';
      }
      // Default to native React Native
      return 'native';
    }
  }

  /**
   * Check if running in Expo Go app
   */
  static isExpoGo() {
    try {
      const Constants = require('expo-constants').default;
      return Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
    } catch {
      return false;
    }
  }

  /**
   * Check if running in Expo managed workflow
   */
  static isExpoManaged() {
    try {
      const Constants = require('expo-constants').default;
      return Constants.executionEnvironment === 'standalone' || Constants.executionEnvironment === 'storeClient' || this.isExpoGo();
    } catch {
      return false;
    }
  }

  /**
   * Check if platform supports secure storage
   */
  static supportsSecureStorage(platform) {
    switch (platform) {
      case 'expo':
        return this.hasModule('expo-secure-store');
      case 'native':
        return this.hasModule('react-native-keychain');
      case 'web':
        return false;
      // Use localStorage fallback
      default:
        return false;
    }
  }

  /**
   * Check if platform supports biometric authentication
   */
  static supportsBiometrics(platform) {
    switch (platform) {
      case 'expo':
        return this.hasModule('expo-local-authentication');
      case 'native':
        return this.hasModule('react-native-keychain');
      // Keychain supports biometrics
      case 'web':
        return false;
      default:
        return false;
    }
  }

  /**
   * Check if platform supports file system operations
   */
  static supportsFileSystem(platform) {
    switch (platform) {
      case 'expo':
        return this.hasModule('expo-file-system');
      case 'native':
        return this.hasModule('react-native-fs');
      case 'web':
        return false;
      // Use browser download fallback
      default:
        return false;
    }
  }

  /**
   * Check if a module is available
   */
  static hasModule(moduleName) {
    try {
      switch (moduleName) {
        case 'expo-secure-store':
          require('expo-secure-store');
          return true;
        case 'expo-local-authentication':
          require('expo-local-authentication');
          return true;
        case 'expo-file-system':
          require('expo-file-system');
          return true;
        case 'react-native-keychain':
          require('react-native-keychain');
          return true;
        case 'react-native-fs':
          require('react-native-fs');
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Get debug information about the current environment
   */
  static getDebugInfo() {
    const info = this.getPlatformInfo();
    try {
      const Constants = require('expo-constants').default;
      return {
        ...info,
        expoVersion: Constants.expoVersion,
        executionEnvironment: Constants.executionEnvironment,
        appOwnership: Constants.appOwnership,
        deviceName: Constants.deviceName,
        platform: Constants.platform
      };
    } catch {
      return {
        ...info,
        reactNative: true,
        expoConstants: false
      };
    }
  }

  /**
   * Reset cached platform info (useful for testing)
   */
  static resetCache() {
    this.cachedInfo = null;
  }
}
//# sourceMappingURL=PlatformDetector.js.map