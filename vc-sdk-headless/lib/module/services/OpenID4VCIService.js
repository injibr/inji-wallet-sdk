"use strict";

/**
 * OpenID4VCI Service - Implements proper OpenID for Verifiable Credential Issuance flow
 * This service follows the same pattern that INJI uses for discovering issuer capabilities
 * and validating authorization servers before making credential requests.
 */

class OpenID4VCIService {
  constructor(baseUrl = 'https://vcdemo.crabdance.com') {
    this.baseUrl = baseUrl;
    this.issuerCache = new Map();
    this.wellKnownCache = new Map();
  }

  /**
   * Step 1: Discover issuer capabilities via well-known endpoint
   * This is what INJI does first before any credential requests
   */
  async discoverIssuerCapabilities(issuer) {
    console.log('[OpenID4VCI] Discovering capabilities for issuer:', issuer.issuer_id);
    try {
      // FIXED: Use INJI-style URL construction if wellknown_endpoint is wrong
      let wellKnownUrl = issuer.wellknown_endpoint;

      // Check if the wellknown_endpoint looks like old VC SDK format and fix it
      if (wellKnownUrl && (wellKnownUrl.includes('version=') || !wellKnownUrl.includes('issuer_id='))) {
        console.log('[OpenID4VCI] Detected old VC SDK URL format, converting to INJI style');
        const credentialIssuerHost = issuer.credential_issuer_host || issuer.credential_issuer;
        const wellknownPath = `/.well-known/openid-credential-issuer?issuer_id=${issuer.issuer_id}`;
        wellKnownUrl = `${credentialIssuerHost}${wellknownPath}`;
        console.log('[OpenID4VCI] URL conversion:', {
          issuerId: issuer.issuer_id,
          oldUrl: issuer.wellknown_endpoint,
          newUrl: wellKnownUrl,
          credentialIssuerHost
        });
      }

      // Check cache first
      if (this.wellKnownCache.has(wellKnownUrl)) {
        console.log('[OpenID4VCI] Using cached well-known data for:', wellKnownUrl);
        return this.wellKnownCache.get(wellKnownUrl);
      }
      console.log('\n🌐 [WELL_KNOWN_REQUEST_LOG] ======= WELL-KNOWN CONFIG REQUEST =======');
      console.log(`📤 Request URL: ${wellKnownUrl}`);
      console.log(`📤 Request Method: GET`);
      console.log('📤 Request Headers: Content-Type: application/json, Accept: application/json');
      console.log('📤 [WELL_KNOWN_REQUEST_LOG] ======= SENDING REQUEST =======\n');
      const response = await fetch(wellKnownUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      console.log('\n📥 [WELL_KNOWN_RESPONSE_LOG] ======= WELL-KNOWN CONFIG RESPONSE =======');
      console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
      console.log('📥 Response Headers:');
      response.headers.forEach((value, key) => {
        console.log(`   - ${key}: ${value}`);
      });
      if (!response.ok) {
        console.log('❌ [WELL_KNOWN_RESPONSE_LOG] Request failed');
        console.log('📥 [WELL_KNOWN_RESPONSE_LOG] ======= END FAILED RESPONSE =======\n');
        throw new Error(`Well-known endpoint failed: HTTP ${response.status}`);
      }
      const wellKnownData = await response.json();
      console.log('📥 Response Body:');
      console.log(JSON.stringify(wellKnownData, null, 2));
      console.log('📥 [WELL_KNOWN_RESPONSE_LOG] ======= END RESPONSE =======\n');

      // Validate required OpenID4VCI fields
      const requiredFields = ['credential_issuer', 'credential_configurations_supported', 'credential_endpoint'];
      for (const field of requiredFields) {
        if (!wellKnownData[field]) {
          throw new Error(`Missing required field in well-known: ${field}`);
        }
      }
      console.log('[OpenID4VCI] Well-known discovery successful:', {
        issuer: wellKnownData.credential_issuer,
        supportedCredentials: Object.keys(wellKnownData.credential_configurations_supported || {}),
        hasAuthorizationServer: !!wellKnownData.authorization_server,
        credentialEndpoint: wellKnownData.credential_endpoint
      });

      // Cache the result
      this.wellKnownCache.set(wellKnownUrl, wellKnownData);
      return wellKnownData;
    } catch (error) {
      console.error('[OpenID4VCI] Issuer capability discovery failed:', error);
      throw new Error(`Failed to discover issuer capabilities: ${error.message}`);
    }
  }

  /**
   * Step 2: Validate authorization server configuration
   * INJI checks this before attempting any authenticated operations
   */
  async validateAuthorizationServer(wellKnownData) {
    console.log('[OpenID4VCI] Validating authorization server configuration');
    try {
      if (!wellKnownData.authorization_server) {
        console.log('[OpenID4VCI] No authorization server specified - using pre-configured auth');
        return {
          isValid: true,
          usePreConfiguredAuth: true,
          authServer: 'https://sso.staging.acesso.gov.br'
        };
      }
      const authServerUrl = wellKnownData.authorization_server;
      console.log('[OpenID4VCI] Checking authorization server:', authServerUrl);

      // Discover authorization server metadata
      const authMetadataUrl = `${authServerUrl}/.well-known/oauth-authorization-server`;
      console.log('\n🌐 [AUTH_METADATA_REQUEST_LOG] ======= AUTH SERVER METADATA REQUEST =======');
      console.log(`📤 Request URL: ${authMetadataUrl}`);
      console.log(`📤 Request Method: GET`);
      console.log('📤 Request Headers: Content-Type: application/json, Accept: application/json');
      console.log('📤 [AUTH_METADATA_REQUEST_LOG] ======= SENDING REQUEST =======\n');
      const response = await fetch(authMetadataUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      console.log('\n📥 [AUTH_METADATA_RESPONSE_LOG] ======= AUTH SERVER METADATA RESPONSE =======');
      console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
      console.log('📥 Response Headers:');
      response.headers.forEach((value, key) => {
        console.log(`   - ${key}: ${value}`);
      });
      if (!response.ok) {
        console.log('⚠️ [AUTH_METADATA_RESPONSE_LOG] Auth server metadata unavailable, using pre-configured');
        console.log('📥 [AUTH_METADATA_RESPONSE_LOG] ======= END RESPONSE =======\n');
        console.warn('[OpenID4VCI] Authorization server metadata unavailable, using pre-configured auth');
        return {
          isValid: true,
          usePreConfiguredAuth: true,
          authServer: 'https://sso.staging.acesso.gov.br'
        };
      }
      const authMetadata = await response.json();
      console.log('📥 Response Body:');
      console.log(JSON.stringify(authMetadata, null, 2));
      console.log('📥 [AUTH_METADATA_RESPONSE_LOG] ======= END RESPONSE =======\n');
      console.log('[OpenID4VCI] Authorization server validation successful:', {
        issuer: authMetadata.issuer,
        hasTokenEndpoint: !!authMetadata.token_endpoint,
        hasAuthorizationEndpoint: !!authMetadata.authorization_endpoint,
        supportedGrantTypes: authMetadata.grant_types_supported
      });
      return {
        isValid: true,
        usePreConfiguredAuth: false,
        authServer: authServerUrl,
        metadata: authMetadata
      };
    } catch (error) {
      console.warn('[OpenID4VCI] Authorization server validation failed, using pre-configured auth:', error.message);
      return {
        isValid: true,
        usePreConfiguredAuth: true,
        authServer: 'https://sso.staging.acesso.gov.br'
      };
    }
  }

  /**
   * Step 3: Get available credential configurations
   * This matches INJI's approach to discovering what credentials are available
   */
  async getAvailableCredentials(issuer) {
    console.log('[OpenID4VCI] Getting available credentials for issuer:', issuer.issuer_id);
    try {
      const wellKnownData = await this.discoverIssuerCapabilities(issuer);
      const authValidation = await this.validateAuthorizationServer(wellKnownData);
      const credentialConfigs = wellKnownData.credential_configurations_supported || {};
      const availableCredentials = [];
      for (const [configId, config] of Object.entries(credentialConfigs)) {
        const credentialInfo = {
          id: configId,
          name: config.display?.[0]?.name || configId,
          description: config.credential_definition?.type?.join(', ') || 'Verifiable Credential',
          format: config.format || 'ldp_vc',
          cryptographicBindingMethods: config.cryptographic_binding_methods_supported || [],
          credentialSigningAlg: config.credential_signing_alg_values_supported || [],
          proofTypes: config.proof_types_supported || {},
          display: config.display || [],
          fullConfig: config
        };

        // Check if this credential type is supported
        if (this.isCredentialTypeSupported(credentialInfo)) {
          availableCredentials.push(credentialInfo);
        } else {
          console.warn('[OpenID4VCI] Credential type not supported:', configId);
        }
      }
      console.log('[OpenID4VCI] Available credentials discovered:', {
        issuer: issuer.issuer_id,
        totalConfigs: Object.keys(credentialConfigs).length,
        supportedCredentials: availableCredentials.length,
        authServerValid: authValidation.isValid
      });
      return {
        credentials: availableCredentials,
        wellKnown: wellKnownData,
        authValidation: authValidation
      };
    } catch (error) {
      console.error('[OpenID4VCI] Failed to get available credentials:', error);
      throw error;
    }
  }

  /**
   * Step 4: Validate credential request before sending
   * INJI performs validation to ensure all required data is present
   */
  async validateCredentialRequest(issuer, credentialType, individualData) {
    console.log('[OpenID4VCI] Validating credential request');
    try {
      // Get issuer capabilities
      const capabilities = await this.getAvailableCredentials(issuer);

      // Check if credential type is available
      const availableCredential = capabilities.credentials.find(cred => cred.id === credentialType.id);
      if (!availableCredential) {
        throw new Error(`Credential type ${credentialType.id} not available from issuer ${issuer.issuer_id}`);
      }

      // Validate individual data format
      const requiredFields = ['individualId', 'individualIdType', 'otp'];
      for (const field of requiredFields) {
        if (!individualData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate Individual ID format
      if (individualData.individualIdType === 'UIN' && !/^\d{16}$/.test(individualData.individualId)) {
        throw new Error('UIN must be exactly 16 digits');
      }
      if (individualData.individualIdType === 'VID' && !/^\d{16}$/.test(individualData.individualId)) {
        throw new Error('VID must be exactly 16 digits');
      }

      // Validate OTP format
      if (!/^\d{6}$/.test(individualData.otp)) {
        throw new Error('OTP must be exactly 6 digits');
      }
      console.log('[OpenID4VCI] Credential request validation successful');
      return {
        isValid: true,
        credentialConfig: availableCredential,
        issuerCapabilities: capabilities
      };
    } catch (error) {
      console.error('[OpenID4VCI] Credential request validation failed:', error);
      throw error;
    }
  }

  /**
   * Step 5: Prepare authenticated request headers
   * INJI always includes proper authentication for credential requests
   */
  async prepareAuthenticatedHeaders(authValidation) {
    console.log('[OpenID4VCI] Preparing authenticated headers');
    try {
      // Import AsyncStorage for getting auth headers
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const accessToken = await AsyncStorage.getItem('access_token');
      const userName = await AsyncStorage.getItem('user_name');
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-AppId': 'vc-sdk-app',
        'User-Agent': 'INJI-VC-SDK/1.0.0'
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        console.log('[OpenID4VCI] Using authenticated request for user:', userName || 'unknown');
      } else {
        console.warn('[OpenID4VCI] No authentication token available - request may fail');
      }
      return headers;
    } catch (error) {
      console.error('[OpenID4VCI] Failed to prepare authenticated headers:', error);
      throw error;
    }
  }

  /**
   * Helper method to check if a credential type is supported
   */
  isCredentialTypeSupported(credentialInfo) {
    // Check format support
    const supportedFormats = ['ldp_vc', 'jwt_vc_json', 'jwt_vc'];
    if (!supportedFormats.includes(credentialInfo.format)) {
      return false;
    }

    // Check if we have required proof types
    const proofTypes = credentialInfo.proofTypes || {};
    if (Object.keys(proofTypes).length === 0) {
      // No proof types specified - assume supported
      return true;
    }

    // We support jwt proof type
    return !!proofTypes.jwt;
  }

  /**
   * Get issuer from cache or discover capabilities
   */
  async getIssuerWithCapabilities(issuer) {
    const cacheKey = issuer.issuer_id;
    if (this.issuerCache.has(cacheKey)) {
      console.log('[OpenID4VCI] Using cached issuer capabilities for:', cacheKey);
      return this.issuerCache.get(cacheKey);
    }
    const capabilities = await this.getAvailableCredentials(issuer);
    const enrichedIssuer = {
      ...issuer,
      capabilities: capabilities
    };
    this.issuerCache.set(cacheKey, enrichedIssuer);
    return enrichedIssuer;
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.issuerCache.clear();
    this.wellKnownCache.clear();
    console.log('[OpenID4VCI] All caches cleared');
  }
}

// Create singleton instance
const openID4VCIService = new OpenID4VCIService();
export default openID4VCIService;
//# sourceMappingURL=OpenID4VCIService.js.map