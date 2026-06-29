import { PlatformType, PlatformInfo } from './types';

/**
 * Detects the current platform and provides environment information
 */
export class PlatformDetector {
  private static cachedInfo: PlatformInfo | null = null;

  /**
   * Get comprehensive platform information
   */
  static getPlatformInfo(): PlatformInfo {
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
      supportsFileSystem: this.supportsFileSystem(platform),
    };

    return this.cachedInfo;
  }

  /**
   * Detect the current platform type
   */
  static detectPlatform(): PlatformType {
    // Check for web environment
    if (typeof window !== 'undefined' && window.navigator) {
      return 'web';
    }
    try {
      const mod = require('expo-modules-core');
      const core = mod?.default ?? mod;
      if (core && typeof core === 'object') return 'expo';
    } catch {
      // not expo
    }
    return 'native';
  }

  /**
   * Check if running in Expo Go app
   */
  static isExpoGo(): boolean {
    return false;
  }

  /**
   * Check if running in Expo managed workflow
   */
  static isExpoManaged(): boolean {
    return false;
  }

  /**
   * Check if platform supports secure storage
   */
  private static supportsSecureStorage(platform: PlatformType): boolean {
    switch (platform) {
      case 'expo':
        return this.hasModule('expo-secure-store');
      case 'native':
        return this.hasModule('react-native-keychain');
      case 'web':
        return false; // Use localStorage fallback
      default:
        return false;
    }
  }

  /**
   * Check if platform supports biometric authentication
   */
  private static supportsBiometrics(platform: PlatformType): boolean {
    switch (platform) {
      case 'expo':
        return this.hasModule('expo-local-authentication');
      case 'native':
        return this.hasModule('react-native-keychain'); // Keychain supports biometrics
      case 'web':
        return false;
      default:
        return false;
    }
  }

  /**
   * Check if platform supports file system operations
   */
  private static supportsFileSystem(platform: PlatformType): boolean {
    switch (platform) {
      case 'expo':
        return this.hasModule('expo-file-system');
      case 'native':
        return this.hasModule('react-native-fs');
      case 'web':
        return false; // Use browser download fallback
      default:
        return false;
    }
  }

  /**
   * Check if a module is available
   */
  private static hasModule(moduleName: string): boolean {
    try {
      let mod: any;
      switch (moduleName) {
        case 'expo-secure-store':
          mod = require('expo-secure-store');
          break;
        case 'expo-local-authentication':
          mod = require('expo-local-authentication');
          break;
        case 'expo-file-system':
          mod = require('expo-file-system');
          break;
        case 'react-native-keychain':
          mod = require('react-native-keychain');
          break;
        case 'react-native-fs':
          mod = require('react-native-fs');
          break;
        default:
          return false;
      }
      return mod != null && (mod.default ?? mod) != null;
    } catch {
      return false;
    }
  }

  /**
   * Get debug information about the current environment
   */
  static getDebugInfo(): any {
    const info = this.getPlatformInfo();

    try {
      const mod = require('expo-constants');
      const Constants = mod?.default ?? mod;
      if (!Constants) throw new Error('expo-constants not available');
      return {
        ...info,
        expoVersion: Constants.expoVersion,
        executionEnvironment: Constants.executionEnvironment,
        appOwnership: Constants.appOwnership,
        deviceName: Constants.deviceName,
        platform: Constants.platform,
      };
    } catch {
      return {
        ...info,
        reactNative: true,
        expoConstants: false,
      };
    }
  }

  /**
   * Reset cached platform info (useful for testing)
   */
  static resetCache(): void {
    this.cachedInfo = null;
  }
}