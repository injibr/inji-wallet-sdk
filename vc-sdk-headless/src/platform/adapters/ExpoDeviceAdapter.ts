import { IDeviceAdapter } from '../types';

/**
 * Device adapter for Expo environment
 */
export class ExpoDeviceAdapter implements IDeviceAdapter {
  private Device: any;
  private Constants: any;

  constructor() {}

  async initialize(): Promise<void> {
    try {
      this.Device = require('expo-device');
      this.Constants = require('expo-constants').default;
      console.log('[ExpoDeviceAdapter] Initialized with Expo Device and Constants');
    } catch (error) {
      console.error('[ExpoDeviceAdapter] Failed to initialize:', error);
      throw new Error('expo-device and expo-constants are required for device info in Expo');
    }
  }

  async getDeviceId(): Promise<string> {
    if (!this.Constants) {
      await this.initialize();
    }

    try {
      // Expo doesn't provide a true device ID for privacy reasons
      // Use installation ID which is unique per app installation
      return this.Constants.installationId || `expo_${Date.now()}`;
    } catch (error) {
      console.warn('[ExpoDeviceAdapter] Failed to get installation ID:', error);
      // Fallback to a generated ID
      return `expo_device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  async getDeviceName(): Promise<string> {
    if (!this.Device) {
      await this.initialize();
    }

    try {
      return this.Device.deviceName || this.Device.modelName || 'Unknown Device';
    } catch (error) {
      console.warn('[ExpoDeviceAdapter] Failed to get device name:', error);
      return 'Unknown Device';
    }
  }

  getSystemVersion(): string {
    if (!this.Device) {
      // Return a default if not initialized
      return 'Unknown';
    }

    try {
      return this.Device.osVersion || 'Unknown';
    } catch (error) {
      console.warn('[ExpoDeviceAdapter] Failed to get system version:', error);
      return 'Unknown';
    }
  }

  getSystemName(): string {
    if (!this.Device) {
      return 'Unknown';
    }

    try {
      return this.Device.osName || 'Unknown';
    } catch (error) {
      console.warn('[ExpoDeviceAdapter] Failed to get system name:', error);
      return 'Unknown';
    }
  }

  getBuildNumber(): string {
    if (!this.Constants) {
      return 'Unknown';
    }

    try {
      return this.Constants.nativeAppVersion || this.Constants.expoVersion || 'Unknown';
    } catch (error) {
      console.warn('[ExpoDeviceAdapter] Failed to get build number:', error);
      return 'Unknown';
    }
  }

  getAppVersion(): string {
    if (!this.Constants) {
      return 'Unknown';
    }

    try {
      return this.Constants.manifest?.version || this.Constants.manifest2?.extra?.expoClient?.version || '1.0.0';
    } catch (error) {
      console.warn('[ExpoDeviceAdapter] Failed to get app version:', error);
      return '1.0.0';
    }
  }

  /**
   * Get comprehensive device information
   */
  async getDeviceInfo(): Promise<any> {
    if (!this.Device || !this.Constants) {
      await this.initialize();
    }

    try {
      return {
        deviceId: await this.getDeviceId(),
        deviceName: await this.getDeviceName(),
        systemVersion: this.getSystemVersion(),
        systemName: this.getSystemName(),
        buildNumber: this.getBuildNumber(),
        appVersion: this.getAppVersion(),
        // Additional Expo-specific info
        brand: this.Device.brand,
        manufacturer: this.Device.manufacturer,
        modelId: this.Device.modelId,
        modelName: this.Device.modelName,
        designName: this.Device.designName,
        productName: this.Device.productName,
        deviceYearClass: this.Device.deviceYearClass,
        totalMemory: this.Device.totalMemory,
        supportedCpuArchitectures: this.Device.supportedCpuArchitectures,
        platformApiLevel: this.Device.platformApiLevel,
        // Constants info
        installationId: this.Constants.installationId,
        sessionId: this.Constants.sessionId,
        expoVersion: this.Constants.expoVersion,
        statusBarHeight: this.Constants.statusBarHeight,
        platform: this.Constants.platform,
        executionEnvironment: this.Constants.executionEnvironment,
        appOwnership: this.Constants.appOwnership,
      };
    } catch (error) {
      console.error('[ExpoDeviceAdapter] Failed to get comprehensive device info:', error);
      return {
        deviceId: await this.getDeviceId(),
        deviceName: await this.getDeviceName(),
        systemVersion: this.getSystemVersion(),
        systemName: this.getSystemName(),
        buildNumber: this.getBuildNumber(),
        appVersion: this.getAppVersion(),
      };
    }
  }

  /**
   * Check if device supports specific features
   */
  async getDeviceCapabilities(): Promise<{
    hasCamera: boolean;
    hasBiometrics: boolean;
    hasNFC: boolean;
    hasSecureStorage: boolean;
  }> {
    try {
      return {
        hasCamera: true, // Most devices have camera
        hasBiometrics: false, // Would need expo-local-authentication to check
        hasNFC: false, // Expo doesn't have NFC support
        hasSecureStorage: true, // SecureStore is available
      };
    } catch (error) {
      console.warn('[ExpoDeviceAdapter] Failed to get device capabilities:', error);
      return {
        hasCamera: false,
        hasBiometrics: false,
        hasNFC: false,
        hasSecureStorage: false,
      };
    }
  }
}