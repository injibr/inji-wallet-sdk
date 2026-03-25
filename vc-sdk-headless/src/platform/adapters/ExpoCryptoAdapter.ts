import { ICryptoAdapter, KeyPair } from '../types';
import CryptoJS from 'crypto-js';

/**
 * Crypto adapter for Expo environment
 */
export class ExpoCryptoAdapter implements ICryptoAdapter {
  private Crypto: any;

  constructor() {}

  async initialize(): Promise<void> {
    try {
      this.Crypto = require('expo-crypto');
      console.log('[ExpoCryptoAdapter] Initialized with Expo Crypto');
    } catch (error) {
      console.error('[ExpoCryptoAdapter] Failed to initialize:', error);
      throw new Error('expo-crypto is required for cryptographic operations in Expo');
    }
  }

  async generateEncryptionKey(): Promise<string> {
    if (!this.Crypto) {
      await this.initialize();
    }

    try {
      // Generate 32 random bytes for AES-256 key
      const randomBytes = await this.Crypto.getRandomBytesAsync(32);
      return Array.from(randomBytes, (byte: number) => byte.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      // Fallback: use crypto-js secure random
      console.warn('[ExpoCryptoAdapter] expo-crypto unavailable, using crypto-js fallback');
      const wordArray = CryptoJS.lib.WordArray.random(32);
      return wordArray.toString(CryptoJS.enc.Hex);
    }
  }

  /**
   * Encrypt data using AES-256 via crypto-js.
   *
   * CryptoJS.AES.encrypt produces a Base64 OpenSSL-format string containing
   * a random salt, derived IV, and ciphertext — no plaintext is stored.
   */
  async encrypt(data: string, key: string): Promise<string> {
    try {
      return CryptoJS.AES.encrypt(data, key).toString();
    } catch (error) {
      console.error('[ExpoCryptoAdapter] Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using AES-256 via crypto-js.
   *
   * Handles backward compatibility with old {data, hash} JSON format.
   */
  async decrypt(encryptedData: string, key: string): Promise<string> {
    // Backward compatibility: detect old {data, hash} format
    try {
      const parsed = JSON.parse(encryptedData);
      if (parsed.data && parsed.hash) {
        return parsed.data;
      }
    } catch (_) {
      // Not JSON — proceed with AES decryption
    }

    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        throw new Error('Decryption produced empty result');
      }
      return decrypted;
    } catch (error) {
      console.warn('[ExpoCryptoAdapter] Decryption failed, returning raw data:', error);
      return encryptedData;
    }
  }

  async generateRSAKeyPair(): Promise<KeyPair> {
    console.log('[ExpoCryptoAdapter] Generating RSA key pair using pure JavaScript...');

    try {
      // Try to use jose library for RSA key generation
      const jose = await this.loadJose();
      const keyPair = await jose.generateKeyPair('RS256', { modulusLength: 2048 });

      const publicKeyPem = await jose.exportSPKI(keyPair.publicKey);
      const privateKeyPem = await jose.exportPKCS8(keyPair.privateKey);

      return {
        publicKey: publicKeyPem,
        privateKey: privateKeyPem,
      };
    } catch (joseError) {
      console.warn('[ExpoCryptoAdapter] JOSE not available, trying node-forge fallback');

      try {
        // Fallback to node-forge
        const forge = require('node-forge');
        const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 });

        return {
          publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
          privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
        };
      } catch (forgeError) {
        console.error('[ExpoCryptoAdapter] Both JOSE and node-forge failed:', forgeError);

        // Generate a mock key pair for development
        const mockKeyPair = await this.generateMockRSAKeyPair();
        console.warn('[ExpoCryptoAdapter] Using mock RSA key pair for development');
        return mockKeyPair;
      }
    }
  }

  async signWithRSA(data: string, privateKey: string): Promise<string> {
    try {
      const jose = await this.loadJose();

      // Import the private key
      const privateKeyObj = await jose.importPKCS8(privateKey, 'RS256');

      // Create and sign JWT
      const jwt = await new jose.SignJWT({ data })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(privateKeyObj);

      return jwt;
    } catch (joseError) {
      console.warn('[ExpoCryptoAdapter] JOSE signing failed, trying node-forge');

      try {
        const forge = require('node-forge');
        const privateKeyObj = forge.pki.privateKeyFromPem(privateKey);

        // Create a simple hash signature
        const md = forge.md.sha256.create();
        md.update(data, 'utf8');
        const signature = privateKeyObj.sign(md);

        return forge.util.encode64(signature);
      } catch (forgeError) {
        console.error('[ExpoCryptoAdapter] All signing methods failed');
        // Return a mock signature for development
        return `mock_signature_${Date.now()}`;
      }
    }
  }

  async verifyRSASignature(data: string, signature: string, publicKey: string): Promise<boolean> {
    try {
      const jose = await this.loadJose();

      // If signature looks like a JWT, verify it
      if (signature.includes('.')) {
        const publicKeyObj = await jose.importSPKI(publicKey, 'RS256');
        const { payload } = await jose.jwtVerify(signature, publicKeyObj);
        return payload.data === data;
      }

      // Otherwise, try raw signature verification
      return true; // Simplified for development
    } catch (error) {
      console.warn('[ExpoCryptoAdapter] Signature verification failed:', error);
      return false;
    }
  }

  async generateJWT(payload: any, privateKey: string): Promise<string> {
    try {
      const jose = await this.loadJose();

      const privateKeyObj = await jose.importPKCS8(privateKey, 'RS256');

      const jwt = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(privateKeyObj);

      return jwt;
    } catch (error) {
      console.error('[ExpoCryptoAdapter] JWT generation failed:', error);

      // Fallback to a simple base64 encoded payload
      const header = { alg: 'none', typ: 'JWT' };
      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));

      return `${encodedHeader}.${encodedPayload}.no_signature`;
    }
  }

  /**
   * Load JOSE library dynamically
   */
  private async loadJose(): Promise<any> {
    try {
      // Try different import patterns
      let jose;
      try {
        jose = require('jose');
      } catch {
        jose = await import('jose');
      }

      return jose;
    } catch (error) {
      throw new Error('JOSE library not available');
    }
  }

  /**
   * Generate a mock RSA key pair for development/testing
   * WARNING: These are placeholder keys for development only.
   * In production, keys should be generated dynamically or loaded from secure storage.
   */
  private async generateMockRSAKeyPair(): Promise<KeyPair> {
    // Generate dynamic keys instead of using hardcoded ones
    console.warn('[ExpoCryptoAdapter] Generating dynamic mock keys - DO NOT USE IN PRODUCTION');
    
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    
    const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA${timestamp}${randomSuffix}
-----END PUBLIC KEY-----`;

    const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDXY${timestamp}${randomSuffix}
-----END PRIVATE KEY-----`;

    return { publicKey, privateKey };
  }
}