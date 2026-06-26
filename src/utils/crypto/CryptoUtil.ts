import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/hashes/utils';
import * as ed25519 from '@noble/ed25519';
import CryptoJS from 'crypto-js';

export class CryptoUtil {
  /**
   * Generate a secure encryption key
   */
  async generateEncryptionKey(): Promise<string> {
    const keyBytes = randomBytes(32); // 256-bit key
    return Buffer.from(keyBytes).toString('hex');
  }

  /**
   * Generate a cryptographic hash of the input data
   */
  async calculateHash(data: string): Promise<string> {
    const hash = sha256(new TextEncoder().encode(data));
    return Buffer.from(hash).toString('hex');
  }

  /**
   * Encrypt data using AES-256 (crypto-js).
   *
   * Uses CryptoJS.AES which applies AES-256-CBC with a random IV
   * derived from the passphrase via OpenSSL-compatible key derivation.
   * The output is a Base64 string containing the salt, IV, and ciphertext.
   */
  async encrypt(data: string, key: string): Promise<string> {
    try {
      const ciphertext = CryptoJS.AES.encrypt(data, key).toString();
      return ciphertext;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using AES-256 (crypto-js).
   */
  async decrypt(encryptedData: string, key: string): Promise<string> {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        throw new Error('Decryption produced empty result — key mismatch or corrupted data');
      }
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Generate Ed25519 key pair for digital signatures
   */
  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    try {
      const privateKey = ed25519.utils.randomPrivateKey();
      const publicKey = await ed25519.getPublicKey(privateKey);
      
      return {
        privateKey: Buffer.from(privateKey).toString('hex'),
        publicKey: Buffer.from(publicKey).toString('hex'),
      };
    } catch (error) {
      console.error('Key pair generation failed:', error);
      throw new Error('Failed to generate key pair');
    }
  }

  /**
   * Sign data using Ed25519
   */
  async sign(data: string, privateKey: string): Promise<string> {
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
  async verify(data: string, signature: string, publicKey: string): Promise<boolean> {
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
  generateRandomString(length: number = 32): string {
    const bytes = randomBytes(length);
    return Buffer.from(bytes).toString('hex').substring(0, length);
  }

  /**
   * Generate a cryptographically secure UUID v4
   */
  generateUUID(): string {
    const bytes = randomBytes(16);
    
    // Set version (4) and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    
    const hex = Buffer.from(bytes).toString('hex');
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20, 32),
    ].join('-');
  }

  /**
   * Derive a key from a password using PBKDF2 (crypto-js).
   *
   * Produces a 256-bit key using HMAC-SHA256 with the specified iteration count.
   */
  async deriveKey(password: string, salt: string, iterations: number = 100000): Promise<string> {
    try {
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32, // 256-bit key (8 words of 32 bits)
        iterations: iterations,
        hasher: CryptoJS.algo.SHA256,
      });
      return key.toString(CryptoJS.enc.Hex);
    } catch (error) {
      console.error('Key derivation failed:', error);
      throw new Error('Failed to derive key');
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  constantTimeEqual(a: string, b: string): boolean {
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
  isValidHex(str: string): boolean {
    return /^[0-9a-fA-F]+$/.test(str) && str.length % 2 === 0;
  }

  /**
   * Convert hex string to bytes
   */
  hexToBytes(hex: string): Uint8Array {
    if (!this.isValidHex(hex)) {
      throw new Error('Invalid hex string');
    }
    return new Uint8Array(Buffer.from(hex, 'hex'));
  }

  /**
   * Convert bytes to hex string
   */
  bytesToHex(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('hex');
  }
}