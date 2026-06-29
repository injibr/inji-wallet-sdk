import { VCSDKConfig, VC, StorageStats, ExportData } from '../types';
import { AdapterFactory, IStorageAdapter } from '../platform';

/**
 * Platform-aware storage service that works across Expo and React Native CLI
 */
export class StorageServicePlatform {
  private config: VCSDKConfig;
  private adapter: IStorageAdapter | null = null;
  private indexKey = 'vc_index';

  constructor(config: VCSDKConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    try {
      // Get platform-appropriate storage adapter
      this.adapter = await AdapterFactory.getStorageAdapter(`vc-sdk-${this.config.appId}`);
      console.log('[StorageService] Initialized with platform adapter');
    } catch (error) {
      console.error('[StorageService] Failed to initialize:', error);
      throw error;
    }
  }

  async setupEncryption(): Promise<void> {
    // Platform adapters handle encryption internally
    // This is called by VCSDKCore during initialization
    console.log('[StorageService] Encryption setup handled by platform adapter');
  }

  async storeCredential(credential: VC): Promise<string> {
    if (!this.adapter) {
      throw new Error('Storage not initialized');
    }

    try {
      console.log('[StorageService] 🔧 Step 3a: Starting credential storage...');
      const vcId = credential.id;
      console.log(`[StorageService] 🔧 Step 3b: Credential ID: ${vcId}`);

      const dataToStore = JSON.stringify(credential);
      console.log(`[StorageService] 🔧 Step 3c: Serialized credential (${dataToStore.length} chars)`);

      // Store credential
      console.log('[StorageService] 🔧 Step 3d: Calling adapter.setValue...');
      await this.adapter.setValue(`vc_${vcId}`, dataToStore);
      console.log('[StorageService] ✅ Step 3e: setValue completed');

      // Update index
      console.log('[StorageService] 🔧 Step 3f: Updating credential index...');
      await this.updateCredentialIndex(vcId, credential);
      console.log('[StorageService] ✅ Step 3g: Index updated');

      console.log(`[StorageService] ✅✅ Credential stored successfully: ${vcId}`);
      return vcId;
    } catch (error) {
      console.error('[StorageService] ❌ Failed to store credential:', error);
      throw error;
    }
  }

  async getCredential(id: string): Promise<VC | null> {
    if (!this.adapter) {
      throw new Error('Storage not initialized');
    }

    try {
      const data = await this.adapter.getValue(`vc_${id}`);
      if (!data) {
        return null;
      }

      const credential = JSON.parse(data);
      console.log(`[StorageService] Credential retrieved: ${id}`);
      return credential;
    } catch (error) {
      console.error('[StorageService] Failed to get credential:', error);
      return null;
    }
  }

  async getAllCredentials(): Promise<VC[]> {
    if (!this.adapter) {
      throw new Error('Storage not initialized');
    }

    try {
      const index = await this.getCredentialIndex();
      const credentials: VC[] = [];

      for (const vcId of Object.keys(index)) {
        const credential = await this.getCredential(vcId);
        if (credential) {
          credentials.push(credential);
        }
      }

      console.log(`[StorageService] Retrieved ${credentials.length} credentials`);
      return credentials;
    } catch (error) {
      console.error('[StorageService] Failed to get all credentials:', error);
      return [];
    }
  }

  async getCredentials(filters?: any): Promise<VC[]> {
    // For now, just delegate to getAllCredentials
    // In a full implementation, this would apply filters
    return await this.getAllCredentials();
  }

  async deleteCredential(id: string): Promise<boolean> {
    if (!this.adapter) {
      throw new Error('Storage not initialized');
    }

    try {
      // Remove credential data
      await this.adapter.removeValue(`vc_${id}`);

      // Update index
      await this.removeFromCredentialIndex(id);

      console.log(`[StorageService] Credential deleted: ${id}`);
      return true;
    } catch (error) {
      console.error('[StorageService] Failed to delete credential:', error);
      return false;
    }
  }

  async clearAllCredentials(): Promise<void> {
    if (!this.adapter) {
      throw new Error('Storage not initialized');
    }

    try {
      const index = await this.getCredentialIndex();

      // Remove all credential data
      for (const vcId of Object.keys(index)) {
        await this.adapter.removeValue(`vc_${vcId}`);
      }

      // Clear index
      await this.adapter.removeValue(this.indexKey);

      console.log('[StorageService] All credentials cleared');
    } catch (error) {
      console.error('[StorageService] Failed to clear credentials:', error);
      throw error;
    }
  }

  async getStorageStats(): Promise<StorageStats> {
    if (!this.adapter) {
      throw new Error('Storage not initialized');
    }

    try {
      const index = await this.getCredentialIndex();
      const credentialCount = Object.keys(index).length;

      // Calculate approximate storage usage
      const keys = await this.adapter.getAllKeys();
      let usedSpace = 0;

      for (const key of keys) {
        const value = await this.adapter.getValue(key);
        if (value) {
          usedSpace += value.length;
        }
      }

      return {
        credentialCount,
        usedSpace,
        totalSpace: 10 * 1024 * 1024, // 10MB estimate
        isEncrypted: true, // Always encrypted with adapters
        lastBackup: index.lastBackup || null,
      };
    } catch (error) {
      console.error('[StorageService] Failed to get storage stats:', error);
      return {
        credentialCount: 0,
        usedSpace: 0,
        totalSpace: 0,
        isEncrypted: false,
        lastBackup: null,
      };
    }
  }

  async exportData(): Promise<ExportData> {
    if (!this.adapter) {
      throw new Error('Storage not initialized');
    }

    try {
      const credentials = await this.getAllCredentials();
      const index = await this.getCredentialIndex();

      const exportData: ExportData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        appId: this.config.appId,
        credentials,
        metadata: {
          index,
          totalCredentials: credentials.length,
          exportedAt: new Date().toISOString(),
        },
      };

      console.log(`[StorageService] Exported ${credentials.length} credentials`);
      return exportData;
    } catch (error) {
      console.error('[StorageService] Failed to export data:', error);
      throw error;
    }
  }

  async importData(exportData: ExportData): Promise<number> {
    if (!this.adapter) {
      throw new Error('Storage not initialized');
    }

    try {
      let importedCount = 0;

      for (const credential of exportData.credentials) {
        try {
          await this.storeCredential(credential);
          importedCount++;
        } catch (error) {
          console.warn(`[StorageService] Failed to import credential ${credential.id}:`, error);
        }
      }

      console.log(`[StorageService] Imported ${importedCount} credentials`);
      return importedCount;
    } catch (error) {
      console.error('[StorageService] Failed to import data:', error);
      throw error;
    }
  }

  /**
   * Store sensitive data using secure storage
   */
  async storeSecureData(key: string, value: string): Promise<void> {
    if (!this.adapter) {
      throw new Error('Storage not initialized');
    }

    await this.adapter.setSecureValue(key, value);
  }

  /**
   * Retrieve sensitive data from secure storage
   */
  async getSecureData(key: string): Promise<string | null> {
    if (!this.adapter) {
      throw new Error('Storage not initialized');
    }

    return await this.adapter.getSecureValue(key);
  }

  /**
   * Remove sensitive data from secure storage
   */
  async removeSecureData(key: string): Promise<void> {
    if (!this.adapter) {
      throw new Error('Storage not initialized');
    }

    await this.adapter.removeSecureValue(key);
  }

  // Private helper methods

  private async getCredentialIndex(): Promise<any> {
    if (!this.adapter) {
      return {};
    }

    try {
      const indexData = await this.adapter.getValue(this.indexKey);
      return indexData ? JSON.parse(indexData) : {};
    } catch (error) {
      console.warn('[StorageService] Failed to get credential index:', error);
      return {};
    }
  }

  private async updateCredentialIndex(vcId: string, credential: VC): Promise<void> {
    if (!this.adapter) {
      return;
    }

    try {
      const index = await this.getCredentialIndex();
      index[vcId] = {
        id: vcId,
        type: credential.type || [],
        issuer: credential.issuer,
        issuanceDate: credential.issuanceDate,
        addedAt: new Date().toISOString(),
      };

      await this.adapter.setValue(this.indexKey, JSON.stringify(index));
    } catch (error) {
      console.error('[StorageService] Failed to update credential index:', error);
    }
  }

  private async removeFromCredentialIndex(vcId: string): Promise<void> {
    if (!this.adapter) {
      return;
    }

    try {
      const index = await this.getCredentialIndex();
      delete index[vcId];
      await this.adapter.setValue(this.indexKey, JSON.stringify(index));
    } catch (error) {
      console.error('[StorageService] Failed to remove from credential index:', error);
    }
  }
}