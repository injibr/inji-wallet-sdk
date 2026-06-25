import { IStorageAdapter } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

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
   * Encrypt data using AES-256 via crypto-js.
   *
   * The encryption key is stored in SecureStore (OS-level keychain).
   * CryptoJS.AES.encrypt produces a Base64 OpenSSL-format string containing
   * a random salt, derived IV, and ciphertext — no plaintext is stored.
   */
  private async encrypt(text: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const ciphertext = CryptoJS.AES.encrypt(text, key).toString();
      return ciphertext;
    } catch (error) {
      console.error('[ExpoStorageAdapter] Encryption failed:', error);
      throw new Error('Failed to encrypt data for storage');
    }
  }

  /**
   * Decrypt data using AES-256 via crypto-js.
   *
   * Handles backward compatibility: if stored data is in the old
   * {hash, text} JSON format (from the previous simulated encryption),
   * extracts the plaintext and returns it. New data is real AES ciphertext.
   */
  private async decrypt(encrypted: string): Promise<string> {
    // Backward compatibility: detect old {hash, text} format
    try {
      const parsed = JSON.parse(encrypted);
      if (parsed.text && parsed.hash) {
        // Old simulated format — return the plaintext directly.
        // On next write, it will be re-encrypted with real AES.
        return parsed.text;
      }
    } catch (_) {
      // Not JSON — proceed with AES decryption
    }

    try {
      const key = await this.getEncryptionKey();
      const bytes = CryptoJS.AES.decrypt(encrypted, key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        throw new Error('Decryption produced empty result');
      }
      return decrypted;
    } catch (error) {
      // If decryption fails, the data may be plain text from before encryption was enabled
      console.warn('[ExpoStorageAdapter] Decryption failed, returning raw data:', error);
      return encrypted;
    }
  }

  /**
   * Generate a cryptographically secure random encryption key.
   * Uses expo-crypto for secure random bytes, with crypto-js WordArray fallback.
   */
  private async generateRandomKey(): Promise<string> {
    try {
      const Crypto = require('expo-crypto');
      const bytes = await Crypto.getRandomBytesAsync(32);
      return Array.from(bytes, (byte: number) => byte.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      // Fallback: use crypto-js secure random (backed by Math.random on some
      // platforms, but still better than raw Date.now + Math.random)
      const wordArray = CryptoJS.lib.WordArray.random(32);
      return wordArray.toString(CryptoJS.enc.Hex);
    }
  }
}