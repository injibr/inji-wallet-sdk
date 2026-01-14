"use strict";

import AsyncStorage from '@react-native-async-storage/async-storage';
import Keychain from 'react-native-keychain';
import { MMKV } from 'react-native-mmkv';
import { CryptoUtil } from "../utils/crypto/CryptoUtil.js";
export class StorageService {
  mmkv = null;
  encryptionKey = null;
  constructor(config) {
    this.config = config;
    this.cryptoUtil = new CryptoUtil();
  }
  async init() {
    try {
      // Initialize MMKV for high-performance storage
      this.mmkv = new MMKV({
        id: `vc-sdk-${this.config.appId}`,
        encryptionKey: await this.getOrCreateEncryptionKey()
      });
      console.log('Storage service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize storage service:', error);
      throw error;
    }
  }
  async setupEncryption() {
    if (!this.config.storage?.encrypted) {
      console.log('Encryption disabled in configuration');
      return;
    }
    try {
      // Generate or retrieve encryption key from hardware keystore
      this.encryptionKey = await this.getOrCreateEncryptionKey();
      console.log('Encryption setup completed');
    } catch (error) {
      console.error('Failed to setup encryption:', error);
      throw error;
    }
  }
  async getOrCreateEncryptionKey() {
    const keyAlias = `vc-sdk-key-${this.config.appId}`;
    try {
      // Try to retrieve existing key
      const credentials = await Keychain.getInternetCredentials(keyAlias);
      if (credentials && credentials.password) {
        return credentials.password;
      }
    } catch (error) {
      console.log('No existing encryption key found, creating new one');
    }

    // Generate new encryption key
    const newKey = await this.cryptoUtil.generateEncryptionKey();

    // Store in hardware keystore
    await Keychain.setInternetCredentials(keyAlias, 'vc-sdk', newKey, {
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS
    });
    return newKey;
  }
  async storeCredential(credential) {
    if (!this.mmkv) {
      throw new Error('Storage not initialized');
    }
    try {
      const vcId = credential.id;
      let dataToStore = JSON.stringify(credential);

      // Encrypt if enabled
      if (this.config.storage?.encrypted && this.encryptionKey) {
        dataToStore = await this.cryptoUtil.encrypt(dataToStore, this.encryptionKey);
      }

      // Store credential
      this.mmkv.set(`vc_${vcId}`, dataToStore);

      // Update index
      await this.updateCredentialIndex(vcId, credential);
      console.log(`Credential stored successfully: ${vcId}`);
      return vcId;
    } catch (error) {
      console.error('Failed to store credential:', error);
      throw error;
    }
  }
  async getCredential(vcId) {
    if (!this.mmkv) {
      throw new Error('Storage not initialized');
    }
    try {
      const key = `vc_${vcId}`;
      let storedData = this.mmkv.getString(key);
      if (!storedData) {
        throw new Error(`Credential not found: ${vcId}`);
      }

      // Decrypt if needed
      if (this.config.storage?.encrypted && this.encryptionKey) {
        storedData = await this.cryptoUtil.decrypt(storedData, this.encryptionKey);
      }
      const credential = JSON.parse(storedData);

      // Update last accessed timestamp
      credential.metadata.lastAccessed = new Date().toISOString();
      await this.storeCredential(credential);
      return credential;
    } catch (error) {
      console.error(`Failed to get credential ${vcId}:`, error);
      throw error;
    }
  }
  async getCredentials(filters) {
    if (!this.mmkv) {
      throw new Error('Storage not initialized');
    }
    try {
      const index = await this.getCredentialIndex();
      let credentialIds = Object.keys(index);

      // Apply filters
      if (filters) {
        credentialIds = this.applyFilters(credentialIds, index, filters);
      }

      // Retrieve all credentials
      const credentials = [];
      for (const vcId of credentialIds) {
        try {
          const credential = await this.getCredential(vcId);
          credentials.push(credential);
        } catch (error) {
          console.warn(`Failed to load credential ${vcId}:`, error);
          // Remove invalid credential from index
          await this.removeFromIndex(vcId);
        }
      }
      return credentials;
    } catch (error) {
      console.error('Failed to get credentials:', error);
      throw error;
    }
  }
  async deleteCredential(vcId) {
    if (!this.mmkv) {
      throw new Error('Storage not initialized');
    }
    try {
      const key = `vc_${vcId}`;

      // Check if credential exists
      if (!this.mmkv.contains(key)) {
        return false;
      }

      // Delete credential
      this.mmkv.delete(key);

      // Remove from index
      await this.removeFromIndex(vcId);
      console.log(`Credential deleted successfully: ${vcId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete credential ${vcId}:`, error);
      throw error;
    }
  }
  async updateCredentialIndex(vcId, credential) {
    try {
      const index = await this.getCredentialIndex();
      index[vcId] = {
        type: credential.type,
        issuer: credential.issuer,
        name: credential.name,
        addedDate: credential.metadata.addedDate,
        isPinned: credential.metadata.isPinned,
        tags: credential.metadata.tags
      };
      await AsyncStorage.setItem(`vc-sdk-index-${this.config.appId}`, JSON.stringify(index));
    } catch (error) {
      console.error('Failed to update credential index:', error);
      throw error;
    }
  }
  async getCredentialIndex() {
    try {
      const indexData = await AsyncStorage.getItem(`vc-sdk-index-${this.config.appId}`);
      return indexData ? JSON.parse(indexData) : {};
    } catch (error) {
      console.error('Failed to get credential index:', error);
      return {};
    }
  }
  async removeFromIndex(vcId) {
    try {
      const index = await this.getCredentialIndex();
      delete index[vcId];
      await AsyncStorage.setItem(`vc-sdk-index-${this.config.appId}`, JSON.stringify(index));
    } catch (error) {
      console.error('Failed to remove from index:', error);
    }
  }
  applyFilters(credentialIds, index, filters) {
    return credentialIds.filter(vcId => {
      const metadata = index[vcId];
      if (!metadata) return false;
      if (filters.type && metadata.type !== filters.type) return false;
      if (filters.issuer && metadata.issuer !== filters.issuer) return false;
      if (filters.isPinned !== undefined && metadata.isPinned !== filters.isPinned) return false;
      if (filters.tags && !filters.tags.some(tag => metadata.tags.includes(tag))) return false;
      return true;
    });
  }
  async getAllData() {
    if (!this.mmkv) {
      throw new Error('Storage not initialized');
    }
    try {
      const allData = {};
      const keys = this.mmkv.getAllKeys();
      for (const key of keys) {
        const value = this.mmkv.getString(key);
        if (value) {
          allData[key] = value;
        }
      }
      return allData;
    } catch (error) {
      console.error('Failed to get all data:', error);
      throw error;
    }
  }
  async restoreAllData(data) {
    if (!this.mmkv) {
      throw new Error('Storage not initialized');
    }
    try {
      // Clear existing data
      await this.clearAllData();

      // Restore data
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          this.mmkv.set(key, value);
        }
      }
      console.log('Data restored successfully');
    } catch (error) {
      console.error('Failed to restore data:', error);
      throw error;
    }
  }
  async clearAllData() {
    if (!this.mmkv) {
      throw new Error('Storage not initialized');
    }
    try {
      this.mmkv.clearAll();

      // Clear index
      await AsyncStorage.removeItem(`vc-sdk-index-${this.config.appId}`);
      console.log('All data cleared successfully');
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }
  async getStorageStats() {
    try {
      const credentials = await this.getCredentials();
      const index = await this.getCredentialIndex();

      // Calculate total size (approximation)
      const totalSize = JSON.stringify(index).length + credentials.reduce((size, vc) => size + JSON.stringify(vc).length, 0);
      return {
        totalSize,
        credentialCount: credentials.length,
        backupCount: 0,
        // TODO: Implement backup counting
        lastBackup: undefined // TODO: Implement last backup tracking
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      throw error;
    }
  }
  async exportData(format) {
    try {
      const credentials = await this.getCredentials();
      let data;
      if (format === 'json') {
        data = JSON.stringify(credentials, null, 2);
      } else {
        // Convert to CSV
        const headers = ['id', 'type', 'issuer', 'name', 'issuanceDate'];
        const csvRows = [headers.join(',')];
        credentials.forEach(vc => {
          const row = [vc.id, Array.isArray(vc.type) ? vc.type.join(';') : vc.type, vc.issuer, vc.name, vc.issuanceDate];
          csvRows.push(row.join(','));
        });
        data = csvRows.join('\n');
      }
      return {
        format,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }
  async cleanup() {
    // Cleanup resources if needed
    this.mmkv = null;
    this.encryptionKey = null;
    console.log('Storage service cleaned up');
  }
}
//# sourceMappingURL=StorageService.js.map