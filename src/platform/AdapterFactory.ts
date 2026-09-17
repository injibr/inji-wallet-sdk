import { IStorageAdapter } from './types';
import { PlatformDetector } from './PlatformDetector';
import { ExpoStorageAdapter } from './adapters/ExpoStorageAdapter';

export class AdapterFactory {
  private static storageAdapter: IStorageAdapter | null = null;

  static async getStorageAdapter(storageId: string): Promise<IStorageAdapter> {
    if (!this.storageAdapter) {
      this.storageAdapter = new ExpoStorageAdapter(storageId);
      await this.storageAdapter.initialize();
    }
    return this.storageAdapter;
  }

  static resetAdapters(): void {
    this.storageAdapter = null;
    PlatformDetector.resetCache();
  }
}
