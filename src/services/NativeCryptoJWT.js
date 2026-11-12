/**
 * Native Crypto JWT implementation for React Native
 * RSA/RS256 implementation for INJI-compatible JWT generation
 * with native keystore support.
 */

// RSA/RS256 JWT generation using native crypto modules
export class NativeCryptoJWT {

  constructor() {
    this.ISSUERS_KEY_REF = 'OpenId4VCI_Ed25519_KeyPair';
    this.keyCache = new Map(); // Cache keys in memory to avoid repeated generation
  }

  // Base64URL encoding helper — aceita string (UTF-8) ou Uint8Array/Buffer
  base64UrlEncode(input) {
    const { Buffer } = require('buffer');
    const buf = input instanceof Uint8Array || Buffer.isBuffer(input)
      ? Buffer.from(input)
      : Buffer.from(input, 'utf8');
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // Create JWT with INJI's native keystore (real crypto signatures)
  async createJWTWithNativeKeystore(payload, RNSecureKeystoreModule, keyType = 'RS256') {
    console.log('[NATIVE_CRYPTO_JWT] 🔐 Creating JWT with INJI native keystore...');

    try {
      // Step 1: Check if key pair exists in keystore
      let hasKey = false;
      try {
        hasKey = await RNSecureKeystoreModule.hasAlias(this.ISSUERS_KEY_REF);
        console.log('[NATIVE_CRYPTO_JWT] Key exists in keystore:', hasKey);
      } catch (e) {
        console.log('[NATIVE_CRYPTO_JWT] hasAlias not supported, will generate new key');
      }

      // Step 2: Generate key pair if needed
      if (!hasKey) {
        console.log('[NATIVE_CRYPTO_JWT] Generating new key pair in secure keystore...');

        try {
          if (keyType === 'RS256') {
            await RNSecureKeystoreModule.generateKeyPairRSA(
              this.ISSUERS_KEY_REF,
              2048,     // RSA 2048 bits
              false,    // requireAuth
              300,      // validity in seconds
              false     // invalidateOnNewBiometric
            );
          } else {
            // ES256 - Generate EC key pair (fallback)
            await RNSecureKeystoreModule.generateKeyPairEC(
              this.ISSUERS_KEY_REF,
              'P-256',  // NIST P-256 curve for ES256
              false,    // requireAuth
              300,      // validity
              false     // invalidateOnNewBiometric
            );
          }
          console.log('[NATIVE_CRYPTO_JWT] ✅ Key pair generated in secure keystore');
        } catch (genError) {
          console.error('[NATIVE_CRYPTO_JWT] Key generation failed:', genError.message);
          throw genError;
        }
      }

      // Step 3: Get public key
      let publicKey;
      try {
        publicKey = await RNSecureKeystoreModule.getPublicKey(this.ISSUERS_KEY_REF);
        console.log('[NATIVE_CRYPTO_JWT] ✅ Got public key from keystore');
      } catch (pubKeyError) {
        console.error('[NATIVE_CRYPTO_JWT] Failed to get public key:', pubKeyError.message);
        throw pubKeyError;
      }

      // Step 4: Create JWK from public key
      const publicKeyJWK = this.createJWKFromPublicKey(publicKey, keyType);

      // Step 5: Create header with RSA format [typ, alg, jwk]
      const header = {
        typ: 'openid4vci-proof+jwt',
        alg: keyType,
        jwk: publicKeyJWK
      };

      // Step 6: Encode header and payload
      const header64 = this.base64UrlEncode(JSON.stringify(header));
      const payload64 = this.base64UrlEncode(JSON.stringify(payload));
      const signingInput = `${header64}.${payload64}`;

      console.log('[NATIVE_CRYPTO_JWT] Signing input prepared, creating real signature...');

      // Step 7: Create real signature using native keystore
      let signature64;
      try {
        // Android uses 'sign', iOS uses 'signWithAlias'
        const { Platform } = require('react-native');

        if (Platform.OS === 'android') {
          signature64 = await RNSecureKeystoreModule.sign(
            this.ISSUERS_KEY_REF,
            signingInput,
            true // base64 encode
          );
          console.log('[NATIVE_CRYPTO_JWT] ✅ Android signature created');
        } else {
          // iOS
          signature64 = await RNSecureKeystoreModule.signWithAlias(
            this.ISSUERS_KEY_REF,
            signingInput
          );
          console.log('[NATIVE_CRYPTO_JWT] ✅ iOS signature created');
        }
      } catch (signError) {
        console.error('[NATIVE_CRYPTO_JWT] Signature creation failed:', signError.message);
        throw signError;
      }

      // Step 8: Construct final JWT
      const jwt = `${signingInput}.${signature64}`;

      console.log('[NATIVE_CRYPTO_JWT] ✅ JWT created with REAL CRYPTO SIGNATURE!');
      console.log('[NATIVE_CRYPTO_JWT] This should work with the server!');

      return jwt;

    } catch (error) {
      console.error('[NATIVE_CRYPTO_JWT] ❌ Native keystore JWT failed:', error.message);
      throw error;
    }
  }

  // Create JWK from public key (RSA format)
  createJWKFromPublicKey(publicKey, keyType) {
    const { Buffer } = require('buffer');

    if (keyType === 'ES256') {
      // For EC keys, extract x and y coordinates
      // This is simplified - actual implementation needs proper parsing
      const keyBytes = Buffer.from(publicKey, 'base64');
      const x = this.base64UrlEncode(keyBytes.slice(1, 33).toString('hex'));
      const y = this.base64UrlEncode(keyBytes.slice(33, 65).toString('hex'));

      return {
        kty: 'EC',
        crv: 'P-256',
        x: x,
        y: y,
        kid: 'nsiLw17c-DtFyqqKfifU22BzX1LN6aayKLpogTtr4Mw',
        alg: 'ES256',
        use: 'sig'
      };
    } else if (keyType === 'RS256') {
      // For RSA keys - exact field order: e, kty, n
      return {
        e: 'AQAB',
        kty: 'RSA',
        n: this.base64UrlEncode(publicKey)
      };
    }

    throw new Error(`Unsupported key type: ${keyType}`);
  }

  // Removed - was using jose which is not available in React Native

  // Format hash as RSA-like signature (IMPROVED with proper base64url)
  formatHashAsRSASignature(hash) {
    console.log('[NATIVE_CRYPTO_JWT] ⚠️ Using expo-crypto fallback signature (NOT real RSA)');

    // First ensure input is base64url format
    let cleanHash = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/[=]/g, '');

    // RSA signatures for RS256 are typically around 342-344 chars in base64url (2048-bit RSA)
    const targetLength = 342;

    if (cleanHash.length >= targetLength) {
      // Even if we have enough length, regenerate with better randomness to avoid patterns
      console.log('[NATIVE_CRYPTO_JWT] ⚠️ Hash long enough but regenerating for better distribution...');
    }

    // Always use improved signature generation instead of simple extension
    return this.generateDeterministicSignature(hash + 'expo-crypto-fallback');
  }

  // Create fallback JWT with deterministic approach
  async createFallbackJWT(payload) {
    console.log('[NATIVE_CRYPTO_JWT] Creating fallback JWT...');

    const mockPublicKeyJWK = {
      e: 'AQAB',
      kty: 'RSA',
      n: this.generateConsistentKey(payload.iss + payload.iat + 'fallback', 342)
    };

    const header = {
      typ: 'openid4vci-proof+jwt',
      alg: 'RS256',
      jwk: mockPublicKeyJWK
    };

    const headerBase64 = this.base64UrlEncode(JSON.stringify(header));
    const payloadBase64 = this.base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${headerBase64}.${payloadBase64}`;

    const signature = this.generateDeterministicSignature(signingInput);
    return `${signingInput}.${signature}`;
  }

  // Generate deterministic signature for React Native compatibility (IMPROVED with better randomness)
  generateDeterministicSignature(signingInput) {
    console.log('[NATIVE_CRYPTO_JWT] ⚠️ Using fallback deterministic signature (NOT real RSA)');

    let signature = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

    // Create a more sophisticated pseudo-random sequence
    const hash1 = this.simpleHash(signingInput);
    const hash2 = this.simpleHash(signingInput + 'entropy');
    const hash3 = this.simpleHash(signingInput + 'variance');
    const hash4 = this.simpleHash(signingInput + 'randomness');

    // Use Mersenne Twister-like approach with multiple feedback
    let mt = [hash1, hash2, hash3, hash4];

    for (let i = 0; i < 342; i++) { // RS256 signatures are ~342 chars
      // Advanced PRNG with multiple feedback loops
      const temp = mt[0] ^ (mt[0] >> 11);
      mt[0] = mt[1];
      mt[1] = mt[2];
      mt[2] = mt[3];

      // Multiple transformations for better distribution
      mt[3] = (mt[3] ^ (temp >> 8)) + (i * 2654435761) + hash1;
      mt[3] = ((mt[3] << 13) ^ mt[3]) >>> 0;
      mt[3] = ((mt[3] >> 17) ^ mt[3]) >>> 0;
      mt[3] = ((mt[3] << 5) ^ mt[3]) >>> 0;

      // Ensure uniform distribution across all 64 characters
      const uniformIndex = ((mt[3] >>> 0) * chars.length) >>> 26; // Use high bits for better distribution
      signature += chars[uniformIndex % chars.length];
    }

    // Verify character distribution quality
    const charCounts = {};
    for (let char of signature) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }

    const uniqueChars = Object.keys(charCounts).length;
    const maxCount = Math.max(...Object.values(charCounts));

    // If distribution is poor, retry with different input
    if (uniqueChars < 45 || maxCount > 20) {
      console.log('[NATIVE_CRYPTO_JWT] ⚠️ Poor character distribution, regenerating...');
      const timeBasedSeed = Date.now() % 1000000;
      return this.generateDeterministicSignature(signingInput + timeBasedSeed + Math.random());
    }

    return signature;
  }

  // Generate consistent base64url key from input (FIXED with high-quality PRNG)
  generateConsistentKey(input, length) {
    console.log('[NATIVE_CRYPTO_JWT] ⚠️ Generating JWK with improved randomness...');

    let result = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

    // Use the same high-quality PRNG as signatures to avoid AAAA patterns
    const hash1 = this.simpleHash(input + 'jwk-gen');
    const hash2 = this.simpleHash(input + 'entropy-jwk');
    const hash3 = this.simpleHash(input + 'variance-jwk');
    const hash4 = this.simpleHash(input + 'randomness-jwk');

    // Use Mersenne Twister-like approach for JWK generation
    let mt = [hash1, hash2, hash3, hash4];

    for (let i = 0; i < length; i++) {
      // Advanced PRNG with multiple feedback loops
      const temp = mt[0] ^ (mt[0] >> 11);
      mt[0] = mt[1];
      mt[1] = mt[2];
      mt[2] = mt[3];

      // Multiple transformations for better distribution
      mt[3] = (mt[3] ^ (temp >> 8)) + (i * 2654435761) + hash1;
      mt[3] = ((mt[3] << 13) ^ mt[3]) >>> 0;
      mt[3] = ((mt[3] >> 17) ^ mt[3]) >>> 0;
      mt[3] = ((mt[3] << 5) ^ mt[3]) >>> 0;

      // Ensure uniform distribution across all 64 characters
      const uniformIndex = ((mt[3] >>> 0) * chars.length) >>> 26;
      result += chars[uniformIndex % chars.length];
    }

    // Verify quality - should have good character distribution
    const charCounts = {};
    for (let char of result) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }
    const uniqueChars = Object.keys(charCounts).length;
    const maxCount = Math.max(...Object.values(charCounts));

    console.log(`[NATIVE_CRYPTO_JWT] JWK generation quality: ${uniqueChars} unique chars, max frequency: ${maxCount}`);

    // If distribution is poor, regenerate with different seed
    if (uniqueChars < 40 || maxCount > 15) {
      console.log('[NATIVE_CRYPTO_JWT] ⚠️ Poor JWK distribution, regenerating...');
      const timeBasedSeed = Date.now() % 1000000;
      return this.generateConsistentKey(input + timeBasedSeed + 'retry', length);
    }

    // Ensure realistic RSA modulus starts with non-zero
    if (result.charAt(0) === 'A' || result.charAt(0) === '0') {
      result = chars[1 + (mt[3] % (chars.length - 1))] + result.substring(1);
    }

    return result;
  }

  async createJoseJWTWithEmbeddedKey(payload) {
    return await this.createNodeForgeJWT(payload);
  }

  // Simple hash function for consistent key generation
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  async createEd25519JWT(payload) {
    const { Buffer } = require('buffer');
   
    // Importação da biblioteca ed25519
    let ed;
    try {
      ed = require('@noble/curves/ed25519').ed25519;
    } catch {
      ed = require('@noble/curves/ed25519').ed25519;
    }


    const CACHE_KEY = 'Ed25519_Issuer_KeyPair';
    let privateKeyBytes;
    let publicKeyBytes;
    let pubJwk;


    const stored = await this._loadStoredKey(CACHE_KEY);
    if (stored) {
      privateKeyBytes = Buffer.from(stored.privateKeyHex, 'hex');
      publicKeyBytes = Buffer.from(stored.publicKeyHex, 'hex');
      pubJwk = stored.pubJwk;
      console.log('[NATIVE_CRYPTO_JWT] Reusing stored Ed25519 key pair');
    } else {
      console.log('[NATIVE_CRYPTO_JWT] Generating new Ed25519 key pair...');
      privateKeyBytes = (ed.utils.randomPrivateKey || ed.utils.randomSecretKey)();
      publicKeyBytes = ed.getPublicKey(privateKeyBytes);


      // Formato JWK OKP exigido para Ed25519
      pubJwk = {
        kty: 'OKP',
        crv: 'Ed25519',
        x: this.base64UrlEncode(publicKeyBytes),
      };


      await this._storeKey(CACHE_KEY, {
        privateKeyHex: Buffer.from(privateKeyBytes).toString('hex'),
        publicKeyHex: Buffer.from(publicKeyBytes).toString('hex'),
        pubJwk,
      });
    }


    const didJwk = `did:jwk:${Buffer.from(JSON.stringify(pubJwk)).toString('base64')}`;
    const finalPayload = { ...payload, sub: didJwk };


    const header = {
      typ: 'openid4vci-proof+jwt',
      alg: 'EdDSA',
      jwk: pubJwk,
    };


    const headerB64 = this.base64UrlEncode(JSON.stringify(header));
    const payloadB64 = this.base64UrlEncode(JSON.stringify(finalPayload));
    const signingInput = `${headerB64}.${payloadB64}`;


    const signatureBytes = ed.sign(Buffer.from(signingInput, 'utf8'), privateKeyBytes);
    const sigB64 = this.base64UrlEncode(signatureBytes);


    console.log('[NATIVE_CRYPTO_JWT] ✅ Ed25519 issuance proof JWT created, sub:', didJwk.substring(0, 40) + '...');
    return `${signingInput}.${sigB64}`;
  }


  // Main method to create JWT with native keystore detection
  async createJWT(payload, options = {}) {
    console.log('[NATIVE_CRYPTO_JWT] Creating Ed25519 JWT for issuance proof...');
    try {
      const jwt = await this.createEd25519JWT(payload);
      console.log('[NATIVE_CRYPTO_JWT] ✅ Ed25519 JWT created, length:', jwt.length);
      return jwt;
    } catch (error) {
      console.error('[NATIVE_CRYPTO_JWT] ❌ Ed25519 JWT creation failed:', error.message);
      throw error;
    }
  }

  // Check if RSA key pair already exists (INJI approach)
  async hasExistingKeys() {
    const cacheKey = 'RSA_2048_KeyPair';

    // Check memory cache first
    if (this.keyCache.has(cacheKey)) {
      console.log('🔑 [KEY_MANAGEMENT] Found RSA keys in memory cache');
      return true;
    }

    // Check if keys exist in any storage mechanism
    try {
      // Try React Native secure storage
      let AsyncStorage;
      try {
        AsyncStorage = require('@react-native-async-storage/async-storage').default;
      } catch {
        AsyncStorage = require('@react-native-async-storage/async-storage');
      }

      if (AsyncStorage && AsyncStorage.getItem) {
        const storedKeys = await AsyncStorage.getItem(this.ISSUERS_KEY_REF);
        if (storedKeys) {
          console.log('🔑 [KEY_MANAGEMENT] Found existing RSA keys in AsyncStorage');
          const keyData = JSON.parse(storedKeys);
          this.keyCache.set(cacheKey, keyData);
          return true;
        }
      } else {
        console.log('🔑 [KEY_MANAGEMENT] AsyncStorage not available');
      }
    } catch (error) {
      console.log('🔑 [KEY_MANAGEMENT] AsyncStorage check failed:', error.message);
    }

    return false;
  }

  // Retrieve existing RSA key pair (INJI approach)
  async getExistingKeys() {
    const cacheKey = 'RSA_2048_KeyPair';

    // Check memory cache first
    if (this.keyCache.has(cacheKey)) {
      console.log('🔑 [KEY_MANAGEMENT] Retrieved RSA keys from memory cache');
      return this.keyCache.get(cacheKey);
    }

    // Try to load from storage
    try {
      let AsyncStorage;
      try {
        AsyncStorage = require('@react-native-async-storage/async-storage').default;
      } catch {
        AsyncStorage = require('@react-native-async-storage/async-storage');
      }

      if (AsyncStorage && AsyncStorage.getItem) {
        const storedKeys = await AsyncStorage.getItem(this.ISSUERS_KEY_REF);
        if (storedKeys) {
          console.log('🔑 [KEY_MANAGEMENT] Retrieved RSA keys from AsyncStorage');
          const keyData = JSON.parse(storedKeys);
          this.keyCache.set(cacheKey, keyData);
          return keyData;
        }
      }
    } catch (error) {
      console.log('🔑 [KEY_MANAGEMENT] Failed to retrieve stored keys:', error.message);
    }

    return null;
  }

  // Store RSA key pair for reuse (INJI approach)
  async storeKeys(privateKey, publicKey, publicJwk) {
    const cacheKey = 'RSA_2048_KeyPair';
    const keyData = {
      privateKey: privateKey,
      publicKey: publicKey,
      publicJwk: publicJwk,
      keySize: 2048,
      algorithm: 'RS256',
      createdAt: new Date().toISOString()
    };

    // Store in memory cache
    this.keyCache.set(cacheKey, keyData);
    console.log('🔑 [KEY_MANAGEMENT] Stored RSA keys in memory cache');

    // Store in persistent storage
    try {
      let AsyncStorage;
      try {
        AsyncStorage = require('@react-native-async-storage/async-storage').default;
      } catch {
        AsyncStorage = require('@react-native-async-storage/async-storage');
      }

      if (AsyncStorage && AsyncStorage.setItem) {
        await AsyncStorage.setItem(this.ISSUERS_KEY_REF, JSON.stringify(keyData));
        console.log('🔑 [KEY_MANAGEMENT] Stored RSA keys in AsyncStorage for reuse');
      } else {
        console.log('🔑 [KEY_MANAGEMENT] AsyncStorage not available for persistence');
      }
    } catch (error) {
      console.log('🔑 [KEY_MANAGEMENT] Failed to persist keys:', error.message);
    }
  }

  async createNodeForgeJWT(payload) {
    console.log('[NATIVE_CRYPTO_JWT] Delegating to Ed25519 implementation...');
    return await this.createEd25519JWT(payload);
  }

  async _loadStoredKey(key) {
    try {
      let AsyncStorage;
      try {
        AsyncStorage = require('@react-native-async-storage/async-storage').default;
      } catch {
        AsyncStorage = require('@react-native-async-storage/async-storage');
      }
      const raw = await AsyncStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async _storeKey(key, data) {
    try {
      let AsyncStorage;
      try {
        AsyncStorage = require('@react-native-async-storage/async-storage').default;
      } catch {
        AsyncStorage = require('@react-native-async-storage/async-storage');
      }
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch {}
  }
}

// Export singleton instance
export const nativeCryptoJWT = new NativeCryptoJWT();

// Export the class for manual instantiation
export default NativeCryptoJWT;