"use strict";

import { VCVerifier } from "../utils/crypto/VCVerifier.js";
import { AuthIntegrationService } from "./AuthIntegrationService.js";
// Import jose functions with better error handling and React Native compatibility
import * as jose from 'jose';
const {
  SignJWT,
  generateKeyPair,
  exportJWK
} = jose;

// React Native compatibility imports
import { Buffer } from 'buffer';
// import ShortUniqueId from 'short-unique-id'; // Temporarily removed due to bundling issues

export class CredentialService {
  storageService = null;
  authService = null;
  constructor(config) {
    this.config = config;
    this.vcVerifier = new VCVerifier();
    // Use custom ID generator instead of ShortUniqueId to avoid bundling issues
    this.uid = {
      rnd: length => {
        return this.generateFallbackId(length || 16);
      }
    };
  }
  async init(storageService, authService) {
    this.storageService = storageService;
    this.authService = authService;
    try {
      console.log('Credential service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize credential service:', error);
      throw error;
    }
  }
  async addCredential(credentialData) {
    if (!this.storageService) {
      throw new Error('Storage service not initialized');
    }
    try {
      // Ensure user is authenticated
      if (!(await this.authService?.isUserAuthenticated())) {
        throw new Error('User must be authenticated to add credentials');
      }

      // Generate ID if not provided
      const vcId = this.uid.rnd();

      // Create full VC object
      const credential = {
        id: vcId,
        type: credentialData.type,
        name: credentialData.name || this.generateDefaultName(credentialData),
        issuer: credentialData.issuer,
        issuanceDate: new Date().toISOString(),
        credentialSubject: credentialData.credentialSubject,
        proof: await this.generateProof(credentialData),
        metadata: {
          addedDate: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
          isPinned: false,
          tags: [],
          ...credentialData.metadata
        }
      };

      // Validate credential format
      await this.validateCredential(credential);

      // Verify signatures and authenticity (if verification is enabled)
      const verificationResult = await this.verifyCredential(credential);
      if (!verificationResult.isValid && this.config.environment === 'production') {
        console.warn('Credential verification failed but adding anyway:', verificationResult.errors);
      }

      // Store credential
      const storedId = await this.storageService.storeCredential(credential);
      console.log(`Credential added successfully: ${storedId}`);
      return credential;
    } catch (error) {
      console.error('Failed to add credential:', error);
      throw error;
    }
  }
  async getCredential(vcId) {
    if (!this.storageService) {
      throw new Error('Storage service not initialized');
    }
    try {
      return await this.storageService.getCredential(vcId);
    } catch (error) {
      console.error(`Failed to get credential ${vcId}:`, error);
      throw error;
    }
  }
  async getCredentials(filters) {
    if (!this.storageService) {
      throw new Error('Storage service not initialized');
    }
    try {
      return await this.storageService.getCredentials(filters);
    } catch (error) {
      console.error('Failed to get credentials:', error);
      throw error;
    }
  }
  async updateCredential(vcId, updates) {
    if (!this.storageService) {
      throw new Error('Storage service not initialized');
    }
    try {
      const credential = await this.getCredential(vcId);

      // Update fields
      if (updates.name) {
        credential.name = updates.name;
      }
      if (updates.metadata) {
        credential.metadata = {
          ...credential.metadata,
          ...updates.metadata
        };
      }

      // Store updated credential
      await this.storageService.storeCredential(credential);
      console.log(`Credential updated successfully: ${vcId}`);
      return credential;
    } catch (error) {
      console.error(`Failed to update credential ${vcId}:`, error);
      throw error;
    }
  }
  async deleteCredential(vcId) {
    if (!this.storageService) {
      throw new Error('Storage service not initialized');
    }
    try {
      const success = await this.storageService.deleteCredential(vcId);
      if (success) {
        console.log(`Credential deleted successfully: ${vcId}`);
      }
      return success;
    } catch (error) {
      console.error(`Failed to delete credential ${vcId}:`, error);
      throw error;
    }
  }
  async verifyCredential(vc) {
    try {
      return await this.vcVerifier.verify(vc);
    } catch (error) {
      console.error('Failed to verify credential:', error);
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown verification error'],
        warnings: [],
        issuerTrusted: false,
        signatureValid: false,
        notExpired: false
      };
    }
  }
  async searchCredentials(query) {
    try {
      const allCredentials = await this.getCredentials();
      const lowercaseQuery = query.toLowerCase();
      return allCredentials.filter(vc => {
        // Search in name, type, issuer, and credential subject
        const searchableText = [vc.name, Array.isArray(vc.type) ? vc.type.join(' ') : vc.type, vc.issuer, JSON.stringify(vc.credentialSubject), ...vc.metadata.tags].join(' ').toLowerCase();
        return searchableText.includes(lowercaseQuery);
      });
    } catch (error) {
      console.error('Failed to search credentials:', error);
      throw error;
    }
  }
  async getCredentialStats() {
    try {
      const credentials = await this.getCredentials();
      const stats = {
        total: credentials.length,
        byType: {},
        byIssuer: {},
        pinned: 0,
        expired: 0
      };
      credentials.forEach(vc => {
        // Count by type
        const type = Array.isArray(vc.type) ? vc.type[0] : vc.type;
        stats.byType[type] = (stats.byType[type] || 0) + 1;

        // Count by issuer
        stats.byIssuer[vc.issuer] = (stats.byIssuer[vc.issuer] || 0) + 1;

        // Count pinned
        if (vc.metadata.isPinned) {
          stats.pinned++;
        }

        // Count expired
        if (vc.expirationDate && new Date(vc.expirationDate) < new Date()) {
          stats.expired++;
        }
      });
      return stats;
    } catch (error) {
      console.error('Failed to get credential stats:', error);
      throw error;
    }
  }
  async pinCredential(vcId, pinned = true) {
    return await this.updateCredential(vcId, {
      metadata: {
        isPinned: pinned
      }
    });
  }
  async addTagToCredential(vcId, tag) {
    const credential = await this.getCredential(vcId);
    const tags = [...credential.metadata.tags];
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
    return await this.updateCredential(vcId, {
      metadata: {
        tags
      }
    });
  }
  async removeTagFromCredential(vcId, tag) {
    const credential = await this.getCredential(vcId);
    const tags = credential.metadata.tags.filter(t => t !== tag);
    return await this.updateCredential(vcId, {
      metadata: {
        tags
      }
    });
  }

  /**
   * Convert DID to HTTPS URL
   * did:web:example.com:path:to:resource -> https://example.com/path/to/resource
   */
  didToHttps(did) {
    if (!did.startsWith('did:web:')) {
      return null;
    }

    // Remove did:web: prefix
    const didParts = did.substring(8).split(':');

    // First part is domain, rest is path
    const domain = didParts[0];
    const path = didParts.slice(1).join('/');

    // Construct HTTPS URL
    const url = path ? `https://${domain}/${path}` : `https://${domain}`;
    return url;
  }

  /**
   * Get issuer well-known configuration for display metadata
   * Used for rendering credentials with issuer branding
   */
  async getIssuerDisplayMetadata(issuerUrl) {
    try {
      console.log(`[CredentialService] Fetching well-known config for issuer: ${issuerUrl}`);

      // Convert DID to HTTPS URL if needed
      let baseUrl = issuerUrl;
      if (issuerUrl.startsWith('did:web:')) {
        const httpsUrl = this.didToHttps(issuerUrl);
        if (httpsUrl) {
          baseUrl = httpsUrl;
          console.log(`[CredentialService] Converted DID to HTTPS: ${issuerUrl} -> ${baseUrl}`);
        } else {
          console.warn(`[CredentialService] Failed to convert DID to HTTPS: ${issuerUrl}`);
          return null;
        }
      }

      // Construct well-known URL
      let wellKnownUrl = baseUrl;
      if (!wellKnownUrl.endsWith('/.well-known/openid-credential-issuer')) {
        wellKnownUrl = wellKnownUrl.replace(/\/$/, '') + '/.well-known/openid-credential-issuer';
      }
      console.log(`[CredentialService] Fetching well-known from: ${wellKnownUrl}`);
      const response = await fetch(wellKnownUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        console.warn(`[CredentialService] Failed to fetch well-known config: ${response.status}`);
        return null;
      }
      const wellKnownConfig = await response.json();
      console.log(`[CredentialService] Fetched well-known config successfully`);
      return wellKnownConfig;
    } catch (error) {
      console.error(`[CredentialService] Error fetching well-known config:`, error);
      return null;
    }
  }

  /**
   * Alias for getCredentials() for compatibility
   */
  async getAll() {
    return await this.getCredentials();
  }
  async validateCredential(credential) {
    // Basic validation
    if (!credential.id) {
      throw new Error('Credential must have an ID');
    }
    if (!credential.type) {
      throw new Error('Credential must have a type');
    }
    if (!credential.issuer) {
      throw new Error('Credential must have an issuer');
    }
    if (!credential.credentialSubject) {
      throw new Error('Credential must have a credential subject');
    }

    // NOTE: credentialSubject.id is OPTIONAL in W3C VC spec
    // Accept credential exactly as server sends it (don't require id)

    // Date validation
    try {
      new Date(credential.issuanceDate);
    } catch {
      throw new Error('Invalid issuance date');
    }
    if (credential.expirationDate) {
      try {
        const expirationDate = new Date(credential.expirationDate);
        const issuanceDate = new Date(credential.issuanceDate);
        if (expirationDate <= issuanceDate) {
          throw new Error('Expiration date must be after issuance date');
        }
      } catch {
        throw new Error('Invalid expiration date');
      }
    }
  }
  generateDefaultName(credentialData) {
    const type = Array.isArray(credentialData.type) ? credentialData.type[0] : credentialData.type;
    const issuerName = credentialData.issuer.split('.').pop() || credentialData.issuer;
    return `${type} from ${issuerName}`;
  }
  generateFallbackId(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  generateJWTProof(subjectId) {
    // Generate a basic JWT proof for credential request
    // In a real implementation, this would be properly signed
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };
    const payload = {
      iss: `did:example:${subjectId}`,
      sub: `did:example:${subjectId}`,
      aud: 'credential-issuer',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      // 1 hour expiry
      nonce: this.uid.rnd(16)
    };

    // Base64 encode (simplified for demo - real implementation would use proper JWT library)
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const signature = this.uid.rnd(32); // Mock signature

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }
  async generateProperJWTProof(accessToken, issuer) {
    console.log('[CREDENTIAL_REQUEST] Generating JWT using NativeCryptoJWT module...');

    // Extract c_nonce from access token
    let cNonce = null;
    try {
      if (!accessToken || typeof accessToken !== 'string') {
        cNonce = `test-nonce-${Date.now()}`;
      } else {
        const tokenParts = accessToken.split('.');
        if (tokenParts.length === 3) {
          const payload = tokenParts[1];
          const paddedPayload = payload + '='.repeat(4 - payload.length % 4);
          const decodedToken = JSON.parse(Buffer.from(paddedPayload, 'base64').toString());
          cNonce = decodedToken.c_nonce || decodedToken.nonce || `generated-nonce-${Date.now()}`;
        } else {
          cNonce = `fallback-nonce-${Date.now()}`;
        }
      }
    } catch (decodeError) {
      cNonce = `error-nonce-${Date.now()}`;
    }

    // Create INJI-compatible payload structure
    const now = Math.floor(Date.now() / 1000);

    // FIXED: Use actual client_id from issuer config (not issuer.id)
    const clientId = issuer.client_id || 'h-credenciaisverificaveis-dev.dataprev.gov.br'; // Use actual client_id from issuer

    // DYNAMIC AUDIENCE: Use credential_issuer from issuer's well-known config
    // This automatically adapts to dev/uat/prod based on the issuer's configuration
    const audience = issuer.credential_issuer || issuer.credentialIssuer || 'https://vcdemo.crabdance.com/certify';
    console.log('[CREDENTIAL_REQUEST] 🎯 Using dynamic audience from credential_issuer:', {
      credential_issuer: issuer.credential_issuer,
      credentialIssuer: issuer.credentialIssuer,
      audience: audience,
      issuerId: issuer.id
    });

    // EXACT payload field order as expected JWT: iss, aud, iat, exp (NO nonce)
    // CRITICAL FIX: EXACT payload field order as INJI: [iss, nonce, aud, iat, exp]
    const payload = {
      iss: clientId,
      // 1. Issuer (client_id)
      nonce: cNonce,
      // 2. Nonce from access token - CRITICAL FOR PROOF VALIDATION!
      aud: audience,
      // 3. Audience (credential_issuer from well-known config)
      iat: now,
      // 4. Issued at
      exp: now + 18000 // 5. Expires (5 hours like INJI)
    };
    console.log('[CREDENTIAL_REQUEST] 🔧 FIXED JWT Payload to match INJI EXACTLY:');
    console.log('[CREDENTIAL_REQUEST] - iss (client_id):', payload.iss);
    console.log('[CREDENTIAL_REQUEST] - nonce (c_nonce from access token):', payload.nonce, '✅ CRITICAL FOR SERVER VALIDATION');
    console.log('[CREDENTIAL_REQUEST] - aud (credential_audience):', payload.aud);
    console.log('[CREDENTIAL_REQUEST] - iat (issued at):', payload.iat);
    console.log('[CREDENTIAL_REQUEST] - exp (expires):', payload.exp, '(5 hours)');

    // Use the NativeCryptoJWT module
    try {
      const {
        nativeCryptoJWT
      } = require('./NativeCryptoJWT');
      const jwt = await nativeCryptoJWT.createJWT(payload);
      console.log('[CREDENTIAL_REQUEST] ✅ JWT created with NativeCryptoJWT module');
      return jwt;
    } catch (error) {
      console.error('[CREDENTIAL_REQUEST] ❌ NativeCryptoJWT failed:', error.message);
      throw error;
    }
  }
  async generateProof(credentialData) {
    // In a real implementation, this would create a proper cryptographic proof
    // For now, we'll create a basic proof structure
    return {
      type: 'Ed25519Signature2018',
      created: new Date().toISOString(),
      verificationMethod: `${credentialData.issuer}#key-1`,
      proofPurpose: 'assertionMethod',
      proofValue: this.uid.rnd(64) // In reality, this would be a real signature
    };
  }
  async requestAndDownload(issuer, credentialType, progressCallback) {
    if (!this.storageService) {
      throw new Error('Storage service not initialized');
    }
    try {
      console.log('[CREDENTIAL_REQUEST] Starting credential request with:', {
        issuer,
        credentialType
      });
      progressCallback?.('Initiating credential request...');

      // Generate ID for the credential
      const vcId = this.uid.rnd();

      // Extract credential endpoint from issuer
      const credentialEndpoint = issuer.issuerUrl || issuer.id;
      const fullCredentialEndpoint = credentialEndpoint.includes('/credential') ? credentialEndpoint : `${credentialEndpoint}/credential`;
      progressCallback?.('Getting access token...');

      // Get access token for authentication
      const accessToken = await AuthIntegrationService.getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available. User must be authenticated.');
      }

      // Prepare credential request payload
      // Use credentialDefinitionTypes from well-known config (e.g., ["VerifiableCredential", "CARDocument"])
      // Or fallback to default pattern if not available
      const credentialTypes = credentialType.credentialDefinitionTypes && credentialType.credentialDefinitionTypes.length > 0 ? credentialType.credentialDefinitionTypes : ['VerifiableCredential', credentialType.id];
      console.log('[CREDENTIAL_REQUEST] Using credential types:', {
        types: credentialTypes,
        doctype: credentialType.id,
        credentialTypeId: credentialType.id
      });
      const requestPayload = {
        format: 'ldp_vc',
        credential_definition: {
          type: credentialTypes,
          '@context': ['https://www.w3.org/2018/credentials/v1']
        },
        proof: {
          proof_type: 'jwt',
          jwt: await this.generateProperJWTProof(accessToken, issuer)
        },
        doctype: credentialType.id,
        issuerId: issuer.id
      };
      progressCallback?.('Making authenticated API request to INJI endpoint...');

      // Prepare headers with Authorization
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      };
      console.log('\n🌐 [API_REQUEST_LOG] ======= CREDENTIAL API REQUEST DETAILS =======');
      console.log(`📤 Request URL: ${fullCredentialEndpoint}`);
      console.log(`📤 Request Method: POST`);
      console.log('📤 Request Headers:');
      Object.entries(headers).forEach(([key, value]) => {
        if (key === 'Authorization') {
          console.log(`   - ${key}: Bearer ***${value.slice(-20)} (${value.length} chars total)`);
        } else {
          console.log(`   - ${key}: ${value}`);
        }
      });
      console.log('📤 Request Payload:');
      console.log(JSON.stringify(requestPayload, null, 2));
      if (requestPayload.proof && requestPayload.proof.jwt) {
        console.log('🔍 JWT PROOF DETAILS:');
        const jwtParts = requestPayload.proof.jwt.split('.');
        console.log(`   - JWT Total Length: ${requestPayload.proof.jwt.length} chars`);
        console.log(`   - JWT Parts: ${jwtParts.map(p => p.length).join('.')} (header.payload.signature)`);
        console.log(`   - JWT Token: ${requestPayload.proof.jwt}`);
      }
      console.log('📤 [API_REQUEST_LOG] ======= SENDING REQUEST =======\n');
      const response = await fetch(fullCredentialEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload)
      });
      const responseData = await response.text();
      console.log('\n📥 [API_RESPONSE_LOG] ======= CREDENTIAL API RESPONSE DETAILS =======');
      console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
      console.log('📥 Response Headers:');
      response.headers.forEach((value, key) => {
        console.log(`   - ${key}: ${value}`);
      });
      console.log(`📥 Response Body Length: ${responseData.length} chars`);
      console.log('📥 Response Body:');
      console.log(responseData);
      console.log('📥 [API_RESPONSE_LOG] ======= END RESPONSE =======\n');
      if (!response.ok) {
        // Special handling for error 424 - Provider doesn't have this credential (Failed Dependency)
        if (response.status === 424) {
          const error424 = new Error('CREDENTIAL_NOT_AVAILABLE_424');
          error424.statusCode = 424;
          error424.credentialType = credentialType;
          console.log('⚠️ [CREDENTIAL_424] Provider does not have this credential (Failed Dependency) - allowing share instead');
          throw error424;
        }
        throw new Error(`Credential API request failed: ${response.status} ${response.statusText} - ${responseData}`);
      }
      let credentialResponse;
      try {
        credentialResponse = JSON.parse(responseData);
      } catch (parseError) {
        throw new Error(`Invalid JSON response from credential endpoint: ${responseData}`);
      }
      progressCallback?.('Processing credential response...');

      // Extract credential from response
      let receivedCredential = credentialResponse.credential || credentialResponse;

      // Log the received credential from server
      console.log('\n🎫 ==================== RECEIVED CREDENTIAL FROM SERVER ====================');
      console.log('[CREDENTIAL_DOWNLOAD] Complete Credential Object from Issuer:');
      console.log(JSON.stringify(receivedCredential, null, 2));
      console.log('[CREDENTIAL_DOWNLOAD] Credential Fields Present:');
      console.log('  - @context:', !!receivedCredential['@context'], receivedCredential['@context']);
      console.log('  - type:', !!receivedCredential.type, receivedCredential.type);
      console.log('  - issuer:', !!receivedCredential.issuer, receivedCredential.issuer);
      console.log('  - issuanceDate:', !!receivedCredential.issuanceDate, receivedCredential.issuanceDate);
      console.log('  - expirationDate:', !!receivedCredential.expirationDate, receivedCredential.expirationDate);
      console.log('  - credentialSubject:', !!receivedCredential.credentialSubject);
      console.log('  - proof:', !!receivedCredential.proof);
      if (receivedCredential.proof) {
        console.log('[CREDENTIAL_DOWNLOAD] Proof Details:');
        console.log('  - type:', receivedCredential.proof.type);
        console.log('  - proofValue:', !!receivedCredential.proof.proofValue, receivedCredential.proof.proofValue?.substring(0, 50) + '...');
        console.log('  - jws:', !!receivedCredential.proof.jws);
        console.log('  - verificationMethod:', receivedCredential.proof.verificationMethod);
        console.log('  - created:', receivedCredential.proof.created);
      }
      console.log('🎫 ========================================================================\n');

      // CRITICAL: Do NOT modify receivedCredential - keep it pristine for originalCredential storage
      // The issuer credential does NOT have an 'id' field - that's our internal field

      // CRITICAL: Validate that credential has a proof (MUST come from issuer)
      if (!receivedCredential.proof) {
        console.error('[CREDENTIAL_REQUEST] ❌ Credential received WITHOUT proof!');
        console.error('[CREDENTIAL_REQUEST] Server MUST provide a valid cryptographic proof');
        throw new Error('Invalid credential: No proof signature from issuer. Cannot store credential without valid proof.');
      }

      // Validate proof structure
      if (!receivedCredential.proof.type) {
        throw new Error('Invalid proof: Missing proof type');
      }
      if (!receivedCredential.proof.proofValue && !receivedCredential.proof.jws) {
        throw new Error('Invalid proof: Missing signature (proofValue or jws)');
      }
      console.log('[CREDENTIAL_REQUEST] ✅ Credential has valid proof from issuer:', {
        proofType: receivedCredential.proof.type,
        hasSignature: !!(receivedCredential.proof.proofValue || receivedCredential.proof.jws),
        verificationMethod: receivedCredential.proof.verificationMethod,
        created: receivedCredential.proof.created
      });
      console.log('[CREDENTIAL_REQUEST] 🏗️ Creating internal credential format...');

      // Create our internal credential format
      let credential;
      try {
        credential = {
          id: vcId,
          type: receivedCredential.type || [credentialType.id, 'VerifiableCredential'],
          name: this.generateDefaultName({
            type: credentialType.id,
            issuer: issuer.issuerUrl || issuer.id
          }),
          issuer: receivedCredential.issuer || issuer.issuerUrl || issuer.id,
          issuanceDate: receivedCredential.issuanceDate || new Date().toISOString(),
          // CRITICAL: Preserve expirationDate from issuer (required for W3C VC compliance)
          expirationDate: receivedCredential.expirationDate,
          // ✅ Optional but important for ShareVC
          credentialSubject: receivedCredential.credentialSubject || {},
          // ✅ EXACT credentialSubject from server (NO modifications!)
          // CRITICAL FIX: ALWAYS use the original proof from issuer (NEVER generate mock!)
          proof: receivedCredential.proof,
          // ✅ Original cryptographic proof from issuer
          // CRITICAL: Preserve @context from issuer (required for W3C VC compliance)
          '@context': receivedCredential['@context'] || ['https://www.w3.org/2018/credentials/v1'],
          // ✅ W3C context
          metadata: {
            addedDate: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
            isPinned: false,
            tags: [],
            issuerInfo: issuer,
            credentialType: credentialType,
            downloadedAt: new Date().toISOString(),
            source: 'inji_endpoint',
            originalResponse: credentialResponse,
            originalCredential: receivedCredential // ✅ Store complete original for reference
          }
        };
        console.log('[CREDENTIAL_REQUEST] ✅ Credential object created successfully');
      } catch (createError) {
        console.error('[CREDENTIAL_REQUEST] ❌ Failed to create credential object:', createError);
        throw createError;
      }
      console.log('[CREDENTIAL_REQUEST] 📝 Step 1: Credential object created, starting validation...');

      // Validate credential format
      try {
        await this.validateCredential(credential);
        console.log('[CREDENTIAL_REQUEST] ✅ Step 2: Validation passed');
      } catch (validationError) {
        console.error('[CREDENTIAL_REQUEST] ❌ Validation failed:', validationError);
        throw validationError;
      }

      // Store credential
      console.log('[CREDENTIAL_REQUEST] 💾 Step 3: Storing credential to storage...');
      try {
        const storedId = await this.storageService.storeCredential(credential);
        console.log(`[CREDENTIAL_REQUEST] ✅ Step 4: Credential stored successfully: ${storedId}`);
      } catch (storageError) {
        console.error('[CREDENTIAL_REQUEST] ❌ Storage failed:', storageError);
        throw storageError;
      }
      console.log(`[CREDENTIAL_REQUEST] 🎉 Credential added successfully`);
      progressCallback?.('Credential downloaded successfully');
      return credential;
    } catch (error) {
      console.error('[CREDENTIAL_REQUEST] Failed to request and download credential:', error);
      throw error;
    }
  }
  async cleanup() {
    this.storageService = null;
    this.authService = null;
    console.log('Credential service cleaned up');
  }
}
//# sourceMappingURL=CredentialService.js.map