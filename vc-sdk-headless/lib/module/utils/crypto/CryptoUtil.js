"use strict";

import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/hashes/utils';
import * as ed25519 from '@noble/ed25519';
export class CryptoUtil {
  /**
   * Generate a secure encryption key
   */
  async generateEncryptionKey() {
    const keyBytes = randomBytes(32); // 256-bit key
    return Buffer.from(keyBytes).toString('hex');
  }

  /**
   * Generate a cryptographic hash of the input data
   */
  async calculateHash(data) {
    const hash = sha256(new TextEncoder().encode(data));
    return Buffer.from(hash).toString('hex');
  }

  /**
   * Encrypt data using AES-256-GCM (simulated)
   */
  async encrypt(data, key) {
    try {
      // In a real implementation, this would use actual AES-256-GCM encryption
      // For now, we'll use a simple XOR cipher with base64 encoding for demonstration
      const keyBytes = Buffer.from(key, 'hex');
      const dataBytes = Buffer.from(data, 'utf8');
      const encrypted = Buffer.alloc(dataBytes.length);
      for (let i = 0; i < dataBytes.length; i++) {
        encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
      }
      return encrypted.toString('base64');
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using AES-256-GCM (simulated)
   */
  async decrypt(encryptedData, key) {
    try {
      // Corresponding decryption for the simple XOR cipher
      const keyBytes = Buffer.from(key, 'hex');
      const encryptedBytes = Buffer.from(encryptedData, 'base64');
      const decrypted = Buffer.alloc(encryptedBytes.length);
      for (let i = 0; i < encryptedBytes.length; i++) {
        decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
      }
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Generate Ed25519 key pair for digital signatures
   */
  async generateKeyPair() {
    try {
      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = await ed25519.getPublicKey(privateKey);
      return {
        privateKey: Buffer.from(privateKey).toString('hex'),
        publicKey: Buffer.from(publicKey).toString('hex')
      };
    } catch (error) {
      console.error('Key pair generation failed:', error);
      throw new Error('Failed to generate key pair');
    }
  }

  /**
   * Sign data using Ed25519
   */
  async sign(data, privateKey) {
    try {
      const privateKeyBytes = Buffer.from(privateKey, 'hex');
      const dataBytes = new TextEncoder().encode(data);
      const signature = await ed25519.sign(dataBytes, privateKeyBytes);
      return Buffer.from(signature).toString('hex');
    } catch (error) {
      console.error('Signing failed:', error);
      throw new Error('Failed to sign data');
    }
  }

  /**
   * Verify Ed25519 signature
   */
  async verify(data, signature, publicKey) {
    try {
      const signatureBytes = Buffer.from(signature, 'hex');
      const publicKeyBytes = Buffer.from(publicKey, 'hex');
      const dataBytes = new TextEncoder().encode(data);
      return await ed25519.verify(signatureBytes, dataBytes, publicKeyBytes);
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Generate a secure random string
   */
  generateRandomString(length = 32) {
    const bytes = randomBytes(length);
    return Buffer.from(bytes).toString('hex').substring(0, length);
  }

  /**
   * Generate a cryptographically secure UUID v4
   */
  generateUUID() {
    const bytes = randomBytes(16);

    // Set version (4) and variant bits
    bytes[6] = bytes[6] & 0x0f | 0x40;
    bytes[8] = bytes[8] & 0x3f | 0x80;
    const hex = Buffer.from(bytes).toString('hex');
    return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
  }

  /**
   * Derive a key from a password using PBKDF2 (simulated)
   */
  async deriveKey(password, salt, iterations = 100000) {
    try {
      // In a real implementation, this would use PBKDF2
      // For now, we'll use multiple rounds of hashing
      let derived = password + salt;
      for (let i = 0; i < Math.min(iterations, 1000); i++) {
        const hash = sha256(new TextEncoder().encode(derived));
        derived = Buffer.from(hash).toString('hex');
      }
      return derived.substring(0, 64); // 256 bits
    } catch (error) {
      console.error('Key derivation failed:', error);
      throw new Error('Failed to derive key');
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  constantTimeEqual(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Validate that a string is a valid hex string
   */
  isValidHex(str) {
    return /^[0-9a-fA-F]+$/.test(str) && str.length % 2 === 0;
  }

  /**
   * Convert hex string to bytes
   */
  hexToBytes(hex) {
    if (!this.isValidHex(hex)) {
      throw new Error('Invalid hex string');
    }
    return new Uint8Array(Buffer.from(hex, 'hex'));
  }

  /**
   * Convert bytes to hex string
   */
  bytesToHex(bytes) {
    return Buffer.from(bytes).toString('hex');
  }
}
//# sourceMappingURL=CryptoUtil.js.map