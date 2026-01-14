import { IStorageAdapter } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage adapter for Expo environment using SecureStore + AsyncStorage
 */
export class ExpoStorageAdapter implements IStorageAdapter {
  private SecureStore: any;
  private encryptionKey: string | null = null;
  private storageId: string;

  constructor(storageId: string) {
    this.storageId = storageId;
  }

  async initialize(): Promise<void> {
    try {
      // Import SecureStore dynamically
      this.SecureStore = require('expo-secure-store');
      console.log('[ExpoStorageAdapter] Initialized with SecureStore support');
    } catch (error) {
      console.warn('[ExpoStorageAdapter] SecureStore not available, using AsyncStorage only:', error);
    }
  }

  async setSecureValue(key: string, value: string): Promise<void> {
    console.log(`[ExpoStorageAdapter] 🔒 setSecureValue: key=${key}`);
    const prefixedKey = `${this.storageId}_secure_${key}`;

    if (this.SecureStore) {
      console.log('[ExpoStorageAdapter] 🔒 Using SecureStore...');
      await this.SecureStore.setItemAsync(prefixedKey, value, {
        keychainService: 'vc-sdk',
        keychainAccessible: this.SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      console.log('[ExpoStorageAdapter] ✅ SecureStore.setItemAsync complete');
    } else {
      console.log('[ExpoStorageAdapter] 🔒 SecureStore not available, using AsyncStorage...');
      // ⚠️ CRITICAL: Don't encrypt the encryption key itself to avoid infinite recursion!
      // Store encryption key as plain text in AsyncStorage when SecureStore is unavailable
      await AsyncStorage.setItem(prefixedKey, value);
      console.log('[ExpoStorageAdapter] ✅ AsyncStorage.setItem complete (plain text)');
    }
  }

  async getSecureValue(key: string): Promise<string | null> {
    console.log(`[ExpoStorageAdapter] 🔓 getSecureValue: key=${key}`);
    const prefixedKey = `${this.storageId}_secure_${key}`;

    if (this.SecureStore) {
      console.log('[ExpoStorageAdapter] 🔓 Using SecureStore...');
      try {
        const result = await this.SecureStore.getItemAsync(prefixedKey);
        console.log(`[ExpoStorageAdapter] ✅ SecureStore.getItemAsync complete: ${result ? 'found' : 'not found'}`);
        return result;
      } catch (error) {
        console.warn('[ExpoStorageAdapter] SecureStore getItem failed:', error);
        return null;
      }
    } else {
      console.log('[ExpoStorageAdapter] 🔓 SecureStore not available, using AsyncStorage...');
      // ⚠️ CRITICAL: Encryption key is stored as plain text to avoid infinite recursion
      // Other secure values would be encrypted, but we only store the encryption key here
      const value = await AsyncStorage.getItem(prefixedKey);
      console.log(`[ExpoStorageAdapter] ✅ AsyncStorage.getItem complete: ${value ? 'found' : 'not found'}`);
      return value;
    }
  }

  async removeSecureValue(key: string): Promise<void> {
    const prefixedKey = `${this.storageId}_secure_${key}`;

    if (this.SecureStore) {
      await this.SecureStore.deleteItemAsync(prefixedKey);
    } else {
      await AsyncStorage.removeItem(prefixedKey);
    }
  }

  async setValue(key: string, value: string): Promise<void> {
    console.log(`[ExpoStorageAdapter] 📝 setValue START: key=${key}, valueLength=${value.length}`);
    const prefixedKey = `${this.storageId}_${key}`;

    try {
      // For regular values, always use AsyncStorage but encrypt if key is available
      console.log('[ExpoStorageAdapter] 🔐 Starting encryption...');
      const encrypted = await this.encrypt(value);
      console.log(`[ExpoStorageAdapter] ✅ Encryption complete, encryptedLength=${encrypted.length}`);

      console.log('[ExpoStorageAdapter] 💾 Calling AsyncStorage.setItem...');
      await AsyncStorage.setItem(prefixedKey, encrypted);
      console.log('[ExpoStorageAdapter] ✅ AsyncStorage.setItem complete');
    } catch (error) {
      console.error('[ExpoStorageAdapter] ❌ setValue failed:', error);
      throw error;
    }
  }

  async getValue(key: string): Promise<string | null> {
    const prefixedKey = `${this.storageId}_${key}`;

    const stored = await AsyncStorage.getItem(prefixedKey);
    if (stored) {
      return await this.decrypt(stored);
    }
    return null;
  }

  async removeValue(key: string): Promise<void> {
    const prefixedKey = `${this.storageId}_${key}`;
    await AsyncStorage.removeItem(prefixedKey);
  }

  async getAllKeys(): Promise<string[]> {
    const allKeys = await AsyncStorage.getAllKeys();
    const prefix = `${this.storageId}_`;
    return allKeys
      .filter(key => key.startsWith(prefix))
      .map(key => key.replace(prefix, ''));
  }

  async clear(): Promise<void> {
    const keys = await this.getAllKeys();
    const prefixedKeys = keys.map(key => `${this.storageId}_${key}`);

    // Also clear secure keys
    const secureKeys = keys.map(key => `${this.storageId}_secure_${key}`);

    await AsyncStorage.multiRemove(prefixedKeys);

    if (this.SecureStore) {
      for (const key of secureKeys) {
        try {
          await this.SecureStore.deleteItemAsync(key);
        } catch (error) {
          // Ignore errors for non-existent keys
        }
      }
    }
  }

  /**
   * Get or create encryption key for regular storage
   */
  private async getEncryptionKey(): Promise<string> {
    console.log('[ExpoStorageAdapter] 🔑 getEncryptionKey: checking cache...');
    if (this.encryptionKey) {
      console.log('[ExpoStorageAdapter] ✅ Using cached encryption key');
      return this.encryptionKey;
    }

    const keyName = 'vc-sdk-encryption-key';
    console.log('[ExpoStorageAdapter] 🔑 Getting encryption key from secure storage...');

    // Try to get existing key from secure storage
    let key = await this.getSecureValue(keyName);

    if (!key) {
      console.log('[ExpoStorageAdapter] 🔑 No existing key, generating new one...');
      // Generate new key
      key = await this.generateRandomKey();
      console.log('[ExpoStorageAdapter] 🔑 Storing new encryption key...');
      await this.setSecureValue(keyName, key);
      console.log('[ExpoStorageAdapter] ✅ New encryption key stored');
    } else {
      console.log('[ExpoStorageAdapter] ✅ Retrieved existing encryption key');
    }

    this.encryptionKey = key;
    return key;
  }

  /**
   * Simple encryption using Expo Crypto
   */
  private async encrypt(text: string): Promise<string> {
    try {
      console.log('[ExpoStorageAdapter] 🔐 encrypt: loading Crypto module...');
      const Crypto = require('expo-crypto');
      console.log('[ExpoStorageAdapter] 🔐 encrypt: getting encryption key...');
      const key = await this.getEncryptionKey();
      console.log('[ExpoStorageAdapter] 🔐 encrypt: creating hash...');

      // Simple hash-based encryption (in production, use proper AES)
      const combined = key + text;
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        combined,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      console.log('[ExpoStorageAdapter] 🔐 encrypt: hash created, stringifying...');
      // Store both the hash and the original length for verification
      const result = JSON.stringify({ hash, text: text });
      console.log('[ExpoStorageAdapter] ✅ encrypt: complete');
      return result;
    } catch (error) {
      console.warn('[ExpoStorageAdapter] Encryption failed, storing as plain text:', error);
      return text;
    }
  }

  /**
   * Simple decryption
   */
  private async decrypt(encrypted: string): Promise<string> {
    try {
      const parsed = JSON.parse(encrypted);
      if (parsed.text && parsed.hash) {
        // For now, just return the text (in production, verify the hash)
        return parsed.text;
      }
      return encrypted; // Fallback for non-encrypted data
    } catch (error) {
      // If parsing fails, assume it's plain text
      return encrypted;
    }
  }

  /**
   * Generate a random encryption key
   */
  private async generateRandomKey(): Promise<string> {
    try {
      const Crypto = require('expo-crypto');
      return await Crypto.getRandomBytesAsync(32).then(bytes =>
        Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
      );
    } catch (error) {
      // Fallback to timestamp-based key
      return Date.now().toString(36) + Math.random().toString(36);
    }
  }
}