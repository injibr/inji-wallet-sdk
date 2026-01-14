import {
  IStorageAdapter,
  IFileSystemAdapter,
  ICryptoAdapter,
  IDeviceAdapter,
  INetworkAdapter
} from './types';
import { PlatformDetector } from './PlatformDetector';

// Static imports for all adapters to avoid dynamic import issues with Metro bundler
import { ExpoStorageAdapter } from './adapters/ExpoStorageAdapter';
import { ExpoFileSystemAdapter } from './adapters/ExpoFileSystemAdapter';
import { ExpoCryptoAdapter } from './adapters/ExpoCryptoAdapter';
import { ExpoDeviceAdapter } from './adapters/ExpoDeviceAdapter';
import { ExpoNetworkAdapter } from './adapters/ExpoNetworkAdapter';

/**
 * Factory for creating platform-specific adapters
 */
export class AdapterFactory {
  private static storageAdapter: IStorageAdapter | null = null;
  private static fileSystemAdapter: IFileSystemAdapter | null = null;
  private static cryptoAdapter: ICryptoAdapter | null = null;
  private static deviceAdapter: IDeviceAdapter | null = null;
  private static networkAdapter: INetworkAdapter | null = null;

  /**
   * Get or create storage adapter for current platform
   */
  static async getStorageAdapter(storageId: string): Promise<IStorageAdapter> {
    if (this.storageAdapter) {
      return this.storageAdapter;
    }

    const platformInfo = PlatformDetector.getPlatformInfo();

    if (platformInfo.platform === 'expo') {
      this.storageAdapter = new ExpoStorageAdapter(storageId);
    } else {
      // For native React Native, we'd import the native adapter
      // For now, fall back to Expo adapter as it works in both environments
      this.storageAdapter = new ExpoStorageAdapter(storageId);
    }

    await this.storageAdapter.initialize();
    return this.storageAdapter;
  }

  /**
   * Get or create file system adapter for current platform
   */
  static async getFileSystemAdapter(): Promise<IFileSystemAdapter> {
    if (this.fileSystemAdapter) {
      return this.fileSystemAdapter;
    }

    const platformInfo = PlatformDetector.getPlatformInfo();

    if (platformInfo.platform === 'expo') {
      this.fileSystemAdapter = new ExpoFileSystemAdapter();
    } else {
      // For native React Native, fall back to Expo adapter for now
      this.fileSystemAdapter = new ExpoFileSystemAdapter();
    }

    await this.fileSystemAdapter.initialize();
    return this.fileSystemAdapter;
  }

  /**
   * Get or create crypto adapter for current platform
   */
  static async getCryptoAdapter(): Promise<ICryptoAdapter> {
    if (this.cryptoAdapter) {
      return this.cryptoAdapter;
    }

    const platformInfo = PlatformDetector.getPlatformInfo();

    if (platformInfo.platform === 'expo') {
      this.cryptoAdapter = new ExpoCryptoAdapter();
    } else {
      // For native React Native, fall back to Expo adapter for now
      this.cryptoAdapter = new ExpoCryptoAdapter();
    }

    await this.cryptoAdapter.initialize();
    return this.cryptoAdapter;
  }

  /**
   * Get or create device adapter for current platform
   */
  static async getDeviceAdapter(): Promise<IDeviceAdapter> {
    if (this.deviceAdapter) {
      return this.deviceAdapter;
    }

    const platformInfo = PlatformDetector.getPlatformInfo();

    if (platformInfo.platform === 'expo') {
      this.deviceAdapter = new ExpoDeviceAdapter();
    } else {
      // For native React Native, fall back to Expo adapter for now
      this.deviceAdapter = new ExpoDeviceAdapter();
    }

    await this.deviceAdapter.initialize();
    return this.deviceAdapter;
  }

  /**
   * Get or create network adapter for current platform
   */
  static async getNetworkAdapter(): Promise<INetworkAdapter> {
    if (this.networkAdapter) {
      return this.networkAdapter;
    }

    const platformInfo = PlatformDetector.getPlatformInfo();

    if (platformInfo.platform === 'expo') {
      this.networkAdapter = new ExpoNetworkAdapter();
    } else {
      // For native React Native, fall back to Expo adapter for now
      this.networkAdapter = new ExpoNetworkAdapter();
    }

    await this.networkAdapter.initialize();
    return this.networkAdapter;
  }

  /**
   * Reset all adapters (useful for testing or platform switching)
   */
  static resetAdapters(): void {
    this.storageAdapter = null;
    this.fileSystemAdapter = null;
    this.cryptoAdapter = null;
    this.deviceAdapter = null;
    this.networkAdapter = null;

    // Also reset platform detector cache
    PlatformDetector.resetCache();
  }

  /**
   * Get information about current adapters
   */
  static getAdapterInfo(): {
    platform: string;
    adaptersInitialized: {
      storage: boolean;
      fileSystem: boolean;
      crypto: boolean;
      device: boolean;
      network: boolean;
    };
  } {
    const platformInfo = PlatformDetector.getPlatformInfo();

    return {
      platform: platformInfo.platform,
      adaptersInitialized: {
        storage: this.storageAdapter !== null,
        fileSystem: this.fileSystemAdapter !== null,
        crypto: this.cryptoAdapter !== null,
        device: this.deviceAdapter !== null,
        network: this.networkAdapter !== null,
      },
    };
  }

  /**
   * Pre-initialize all adapters for better performance
   */
  static async preInitializeAdapters(storageId: string): Promise<void> {
    try {
      console.log('[AdapterFactory] Pre-initializing all adapters...');

      await Promise.all([
        this.getStorageAdapter(storageId),
        this.getFileSystemAdapter(),
        this.getCryptoAdapter(),
        this.getDeviceAdapter(),
        this.getNetworkAdapter(),
      ]);

      console.log('[AdapterFactory] All adapters pre-initialized successfully');
    } catch (error) {
      console.error('[AdapterFactory] Failed to pre-initialize adapters:', error);
      throw error;
    }
  }
}