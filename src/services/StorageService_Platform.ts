import { VCSDKConfig, VC } from '../types';
import { AdapterFactory, IStorageAdapter } from '../platform';

export class StorageServicePlatform {
  private config: VCSDKConfig;
  private adapter: IStorageAdapter | null = null;
  private indexKey = 'vc_index';

  constructor(config: VCSDKConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    try {
      this.adapter = await AdapterFactory.getStorageAdapter(`vc-sdk-${this.config.appId}`);
      console.log('[StorageService] Initialized with platform adapter');
    } catch (error) {
      console.error('[StorageService] Failed to initialize:', error);
      throw error;
    }
  }

  async setupEncryption(): Promise<void> {
    console.log('[StorageService] Encryption setup handled by platform adapter');
  }

  async storeCredential(credential: VC): Promise<string> {
    if (!this.adapter) throw new Error('Storage not initialized');

    try {
      const vcId = credential.id;
      console.log(`[StorageService] Storing credential: ${vcId}`);
      await this.adapter.setValue(`vc_${vcId}`, JSON.stringify(credential));
      await this.updateCredentialIndex(vcId, credential);
      console.log(`[StorageService] Credential stored: ${vcId}`);
      return vcId;
    } catch (error) {
      console.error('[StorageService] Failed to store credential:', error);
      throw error;
    }
  }

  async getCredential(id: string): Promise<VC | null> {
    if (!this.adapter) throw new Error('Storage not initialized');

    try {
      const data = await this.adapter.getValue(`vc_${id}`);
      if (!data) return null;
      console.log(`[StorageService] Credential retrieved: ${id}`);
      return JSON.parse(data);
    } catch (error) {
      console.error('[StorageService] Failed to get credential:', error);
      return null;
    }
  }

  async getAllCredentials(): Promise<VC[]> {
    if (!this.adapter) throw new Error('Storage not initialized');

    try {
      const index = await this.getCredentialIndex();
      const credentials: VC[] = [];
      for (const vcId of Object.keys(index)) {
        const credential = await this.getCredential(vcId);
        if (credential) credentials.push(credential);
      }
      console.log(`[StorageService] Retrieved ${credentials.length} credentials`);
      return credentials;
    } catch (error) {
      console.error('[StorageService] Failed to get all credentials:', error);
      return [];
    }
  }

  async getCredentials(): Promise<VC[]> {
    return this.getAllCredentials();
  }

  async deleteCredential(id: string): Promise<boolean> {
    if (!this.adapter) throw new Error('Storage not initialized');

    try {
      await this.adapter.removeValue(`vc_${id}`);
      await this.removeFromCredentialIndex(id);
      console.log(`[StorageService] Credential deleted: ${id}`);
      return true;
    } catch (error) {
      console.error('[StorageService] Failed to delete credential:', error);
      return false;
    }
  }

  private async getCredentialIndex(): Promise<any> {
    if (!this.adapter) return {};
    try {
      const indexData = await this.adapter.getValue(this.indexKey);
      return indexData ? JSON.parse(indexData) : {};
    } catch (error) {
      console.warn('[StorageService] Failed to get credential index:', error);
      return {};
    }
  }

  private async updateCredentialIndex(vcId: string, credential: VC): Promise<void> {
    if (!this.adapter) return;
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
    if (!this.adapter) return;
    try {
      const index = await this.getCredentialIndex();
      delete index[vcId];
      await this.adapter.setValue(this.indexKey, JSON.stringify(index));
    } catch (error) {
      console.error('[StorageService] Failed to remove from credential index:', error);
    }
  }
}