"use strict";

import EventEmitter3 from 'eventemitter3';
import { API } from "../utils/api.js";
export class IssuerService extends EventEmitter3 {
  trustedIssuers = new Map();
  issuerEndpoints = new Map();
  authTokens = new Map();
  constructor(config) {
    super();
    this.config = config;
  }
  async init() {
    console.log('[IssuerService] Initializing issuer service');
    try {
      await this.loadIssuersFromAPI();
      console.log('[IssuerService] Successfully initialized issuer service');
    } catch (error) {
      console.error('[IssuerService] Failed to initialize:', error);
      // No fallback issuers - API must be working
      throw error;
    }
  }
  async loadIssuersFromAPI() {
    console.log('[IssuerService] Loading issuers from API');
    try {
      const baseUrl = this.config.network?.baseUrl;
      const issuersResponse = await API.fetchIssuers(baseUrl);
      console.log('[IssuerService] Received issuers from API:', issuersResponse.length);
      for (const issuer of issuersResponse) {
        const issuerInfo = {
          id: issuer.issuer_id || issuer.id,
          name: issuer.display?.[0]?.name || issuer.name,
          description: `Credential issuer: ${issuer.display?.[0]?.name || issuer.name}`,
          logoUrl: issuer.display?.[0]?.logo?.url || '',
          website: '',
          issuerUrl: issuer.credential_issuer_host || issuer.credential_issuer,
          trustLevel: 'high',
          authenticationMethods: [{
            type: 'oauth',
            name: 'OIDC Authentication',
            description: 'OpenID Connect authentication',
            config: {
              clientId: 'vc-sdk-client',
              scope: 'openid profile',
              redirectUri: 'vc-sdk://auth/callback'
            }
          }],
          supportedCredentialTypes: [],
          // Will be populated from well-known config
          metadata: {
            protocol: issuer.protocol,
            enabled: issuer.enabled,
            order: issuer.order
          }
        };
        this.trustedIssuers.set(issuerInfo.id, issuerInfo);
        this.issuerEndpoints.set(issuerInfo.id, issuerInfo.issuerUrl);

        // Load well-known configuration for each issuer
        try {
          await this.loadIssuerWellKnownConfig(issuerInfo);
        } catch (error) {
          console.warn(`[IssuerService] Failed to load well-known config for ${issuerInfo.id}:`, error);
        }
      }
      this.emit('issuersLoaded', Array.from(this.trustedIssuers.values()));
    } catch (error) {
      console.error('[IssuerService] Failed to load issuers from API:', error);
      throw error;
    }
  }
  async loadIssuerWellKnownConfig(issuerInfo) {
    try {
      const wellKnownConfig = await API.fetchIssuerWellknownConfig(issuerInfo.id, issuerInfo.issuerUrl);
      console.log(`[IssuerService] Well-known config for ${issuerInfo.id}:`, {
        credentialIssuer: wellKnownConfig.credential_issuer,
        credentialEndpoint: wellKnownConfig.credential_endpoint,
        configKeys: Object.keys(wellKnownConfig.credential_configurations_supported || {})
      });

      // CRITICAL: Store credential_issuer from well-known config for JWT aud claim
      issuerInfo.credential_issuer = wellKnownConfig.credential_issuer;
      issuerInfo.credential_endpoint = wellKnownConfig.credential_endpoint;
      console.log(`[IssuerService] ✅ Stored credential_issuer for JWT aud:`, issuerInfo.credential_issuer);

      // Parse credential types from well-known config
      if (wellKnownConfig.credential_configurations_supported) {
        const credentialTypes = Object.entries(wellKnownConfig.credential_configurations_supported).map(([typeId, config]) => {
          // Extract the credential_definition.type array (e.g., ["VerifiableCredential", "CCIR"])
          const credentialDefinitionTypes = config.credential_definition?.type || [];
          console.log(`[IssuerService] Credential type ${typeId}:`, {
            definitionTypes: credentialDefinitionTypes,
            display: config.display?.[0]?.name
          });
          return {
            id: typeId,
            name: config.display?.[0]?.name || typeId,
            description: config.display?.[0]?.description || `Credential type: ${typeId}`,
            schema: config.credential_definition?.credentialSubject || {},
            fields: [],
            display: config.display?.[0] || {},
            // Store the credential_definition.type array for use in credential processing
            credentialDefinitionTypes: credentialDefinitionTypes
          };
        });
        issuerInfo.supportedCredentialTypes = credentialTypes;
        console.log(`[IssuerService] Loaded ${credentialTypes.length} credential types for ${issuerInfo.id}`);

        // Update the stored issuer info
        this.trustedIssuers.set(issuerInfo.id, issuerInfo);
      }
    } catch (error) {
      console.warn(`[IssuerService] Failed to load well-known config for ${issuerInfo.id}:`, error);
    }
  }
  initializeFallbackIssuers() {
    // Initialize with some trusted issuers
    const mockIssuers = [{
      id: 'gov-dmv',
      name: 'Department of Motor Vehicles',
      description: 'Official government issuer for driver licenses and vehicle registrations',
      logoUrl: 'https://example.com/dmv-logo.png',
      website: 'https://dmv.gov',
      issuerUrl: 'https://issuer.dmv.gov',
      trustLevel: 'high',
      authenticationMethods: [{
        type: 'oauth',
        name: 'Government ID Login',
        description: 'Login using your government ID credentials',
        config: {
          clientId: 'dmv-mobile-app',
          scope: 'dmv_records profile',
          redirectUri: 'vc-sdk://auth/callback',
          authorizationUrl: 'https://auth.dmv.gov/oauth/authorize',
          tokenUrl: 'https://auth.dmv.gov/oauth/token'
        }
      }, {
        type: 'biometric',
        name: 'Biometric Verification',
        description: 'Verify your identity using biometrics',
        config: {
          requiredBiometrics: ['face', 'fingerprint'],
          livenessCheck: true,
          threshold: 0.85
        }
      }],
      supportedCredentialTypes: [{
        id: 'driver-license',
        name: 'Driver License',
        description: 'Official driver license credential',
        schema: 'https://schema.org/DriversLicense',
        category: 'Government ID',
        requiredFields: ['firstName', 'lastName', 'dateOfBirth', 'licenseNumber', 'address'],
        optionalFields: ['restrictions', 'endorsements', 'organDonor'],
        icon: '🚗',
        estimatedTime: '5-10 minutes',
        documentRequirements: ['Current driver license', 'Proof of identity (passport or birth certificate)', 'Proof of residence']
      }, {
        id: 'vehicle-registration',
        name: 'Vehicle Registration',
        description: 'Vehicle registration credential',
        schema: 'https://schema.org/VehicleRegistration',
        category: 'Government ID',
        requiredFields: ['vehicleId', 'ownerName', 'registrationNumber', 'make', 'model', 'year'],
        optionalFields: ['color', 'fuelType', 'emissions'],
        icon: '🚙',
        estimatedTime: '3-5 minutes',
        documentRequirements: ['Vehicle registration document', 'Proof of ownership', 'Insurance documentation']
      }],
      metadata: {
        jurisdiction: 'State Government',
        certificationLevel: 'Level 4',
        regulatoryCompliance: ['REAL ID Act', 'State Privacy Laws'],
        lastUpdated: '2024-01-15',
        supportedStandards: ['W3C VC', 'OpenID4VCI', 'DIF PE']
      }
    }, {
      id: 'university-edu',
      name: 'State University',
      description: 'Educational credentials and academic achievements',
      logoUrl: 'https://example.com/university-logo.png',
      website: 'https://university.edu',
      issuerUrl: 'https://credentials.university.edu',
      trustLevel: 'high',
      authenticationMethods: [{
        type: 'oauth',
        name: 'Student Portal Login',
        description: 'Login using your student portal credentials',
        config: {
          clientId: 'student-portal',
          scope: 'academic_records profile',
          redirectUri: 'vc-sdk://auth/callback',
          authorizationUrl: 'https://portal.university.edu/oauth/authorize',
          tokenUrl: 'https://portal.university.edu/oauth/token'
        }
      }, {
        type: 'pin',
        name: 'Student ID + PIN',
        description: 'Authenticate using student ID and PIN',
        config: {
          pinLength: 6,
          maxAttempts: 3
        }
      }],
      supportedCredentialTypes: [{
        id: 'degree-diploma',
        name: 'Degree Diploma',
        description: 'Academic degree credential',
        schema: 'https://schema.org/EducationalCredential',
        category: 'Education',
        requiredFields: ['studentName', 'studentId', 'degree', 'major', 'graduationDate', 'institution'],
        optionalFields: ['gpa', 'honors', 'minors', 'thesis'],
        icon: '🎓',
        estimatedTime: '2-3 minutes',
        documentRequirements: ['Valid student ID', 'Academic transcript', 'Graduation verification']
      }, {
        id: 'academic-transcript',
        name: 'Academic Transcript',
        description: 'Official academic transcript',
        schema: 'https://schema.org/Transcript',
        category: 'Education',
        requiredFields: ['studentName', 'studentId', 'courses', 'grades', 'gpa'],
        optionalFields: ['semester', 'credits', 'dean', 'registrar'],
        icon: '📜',
        estimatedTime: '1-2 minutes',
        documentRequirements: ['Student ID verification', 'Academic records access authorization']
      }],
      metadata: {
        accreditation: 'Regional Accreditation Board',
        establishedYear: '1965',
        studentCount: '25000',
        lastUpdated: '2024-01-10',
        supportedStandards: ['W3C VC', 'OpenBadges', 'CLR']
      }
    }];
    mockIssuers.forEach(issuer => {
      this.trustedIssuers.set(issuer.id, issuer);
      this.issuerEndpoints.set(issuer.id, issuer.issuerUrl);
    });
  }
  async discoverIssuers(options = {}) {
    try {
      let issuers = Array.from(this.trustedIssuers.values());

      // Apply filters
      if (options.category) {
        issuers = issuers.filter(issuer => issuer.supportedCredentialTypes.some(type => type.category === options.category));
      }
      if (options.trustLevel) {
        issuers = issuers.filter(issuer => issuer.trustLevel === options.trustLevel);
      }

      // Sort by trust level (high first)
      issuers.sort((a, b) => {
        const trustOrder = {
          high: 3,
          medium: 2,
          low: 1
        };
        return trustOrder[b.trustLevel] - trustOrder[a.trustLevel];
      });
      this.emit('issuersDiscovered', {
        count: issuers.length,
        options
      });
      return issuers;
    } catch (error) {
      this.emit('error', {
        operation: 'discoverIssuers',
        error
      });
      throw error;
    }
  }
  async getIssuerById(issuerId) {
    return this.trustedIssuers.get(issuerId) || null;
  }
  async getIssuerInfo(issuerId) {
    return this.getIssuerById(issuerId);
  }
  async getCredentialTypes(issuerId) {
    const issuer = this.trustedIssuers.get(issuerId);
    if (!issuer) {
      throw new Error(`Issuer not found: ${issuerId}`);
    }
    return issuer.supportedCredentialTypes;
  }
  async authenticateWithIssuer(issuerId, authMethod, credentials) {
    try {
      const issuer = this.trustedIssuers.get(issuerId);
      if (!issuer) {
        throw new Error(`Issuer not found: ${issuerId}`);
      }
      this.emit('authenticationStarted', {
        issuerId,
        method: authMethod.type
      });

      // Simulate authentication process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock successful authentication
      const authResult = {
        success: true,
        token: `auth_token_${Date.now()}`,
        refreshToken: `refresh_token_${Date.now()}`,
        user: {
          id: `user_${Date.now()}`,
          name: credentials.username || 'John Doe',
          email: credentials.email || 'john.doe@example.com'
        }
      };

      // Store auth token
      this.authTokens.set(issuerId, authResult.token);
      this.emit('authenticationSuccess', {
        issuerId,
        user: authResult.user
      });
      return authResult;
    } catch (error) {
      const authResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
      this.emit('authenticationFailed', {
        issuerId,
        error: authResult.error
      });
      return authResult;
    }
  }
  async requestCredential(issuerId, options) {
    try {
      const issuer = this.trustedIssuers.get(issuerId);
      if (!issuer) {
        throw new Error(`Issuer not found: ${issuerId}`);
      }
      const authToken = this.authTokens.get(issuerId);
      if (!authToken || authToken !== options.authToken) {
        throw new Error('Invalid or expired authentication token');
      }
      this.emit('issuanceStarted', {
        issuerId,
        credentialType: options.credentialType.id,
        transactionId: `txn_${Date.now()}`
      });

      // Simulate credential issuance process
      const stages = ['validating', 'processing', 'signing', 'finalizing'];
      for (let i = 0; i < stages.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        this.emit('issuanceProgress', {
          stage: stages[i],
          progress: (i + 1) / stages.length * 100
        });
      }

      // Create issued credential
      const credential = {
        '@context': ['https://www.w3.org/2018/credentials/v1', 'https://www.w3.org/2018/credentials/examples/v1'],
        id: `urn:vc:${issuerId}:${Date.now()}`,
        type: ['VerifiableCredential', options.credentialType.name.replace(/\s+/g, '')],
        name: options.credentialType.name,
        issuer: issuer.issuerUrl,
        issuanceDate: new Date().toISOString(),
        expirationDate: this.calculateExpirationDate(options.credentialType),
        credentialSubject: {
          id: `did:example:${Date.now()}`,
          ...options.credentialData.credentialSubject
        },
        proof: {
          type: 'Ed25519Signature2020',
          created: new Date().toISOString(),
          verificationMethod: `${issuer.issuerUrl}#key-1`,
          proofPurpose: 'assertionMethod',
          proofValue: `z${this.generateMockProof()}`
        },
        metadata: {
          issuerName: issuer.name,
          credentialType: options.credentialType.id,
          category: options.credentialType.category,
          issuanceMethod: 'mobile_app',
          trustLevel: issuer.trustLevel,
          ...options.additionalMetadata
        }
      };
      const issuanceResult = {
        success: true,
        credential,
        transactionId: `txn_${Date.now()}`,
        deliveryInfo: {
          method: options.deliveryMethod || 'immediate',
          estimatedDelivery: 'immediate'
        }
      };
      this.emit('issuanceComplete', {
        issuerId,
        credentialId: credential.id,
        credentialType: options.credentialType.id
      });
      return issuanceResult;
    } catch (error) {
      const issuanceResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Credential issuance failed'
      };
      this.emit('issuanceFailed', {
        issuerId,
        error: issuanceResult.error
      });
      return issuanceResult;
    }
  }
  async verifyIssuerTrust(issuerId) {
    const issuer = this.trustedIssuers.get(issuerId);
    if (!issuer) {
      return {
        isTrusted: false,
        trustLevel: 'low',
        certifications: [],
        lastVerified: new Date().toISOString()
      };
    }
    return {
      isTrusted: true,
      trustLevel: issuer.trustLevel,
      certifications: issuer.metadata?.regulatoryCompliance || [],
      lastVerified: issuer.metadata?.lastUpdated || new Date().toISOString()
    };
  }
  async refreshAuthToken(issuerId, refreshToken) {
    try {
      // Simulate token refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newToken = `refreshed_token_${Date.now()}`;
      this.authTokens.set(issuerId, newToken);
      return newToken;
    } catch (error) {
      this.emit('tokenRefreshFailed', {
        issuerId,
        error
      });
      return null;
    }
  }
  async revokeAuthToken(issuerId) {
    this.authTokens.delete(issuerId);
    this.emit('tokenRevoked', {
      issuerId
    });
  }
  calculateExpirationDate(credentialType) {
    // Different credential types have different expiration periods
    const expirationPeriods = {
      'driver-license': 5 * 365 * 24 * 60 * 60 * 1000,
      // 5 years
      'passport': 10 * 365 * 24 * 60 * 60 * 1000,
      // 10 years
      'degree-diploma': undefined,
      // Never expires
      'vaccination-record': 2 * 365 * 24 * 60 * 60 * 1000,
      // 2 years
      'employee-id': 1 * 365 * 24 * 60 * 60 * 1000 // 1 year
    };
    const period = expirationPeriods[credentialType.id];
    if (period === undefined) return undefined;
    const expirationDate = new Date(Date.now() + period);
    return expirationDate.toISOString();
  }
  generateMockProof() {
    // Generate a mock proof value for demonstration
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Utility methods
  getAuthToken(issuerId) {
    return this.authTokens.get(issuerId);
  }
  getAllTrustedIssuers() {
    return Array.from(this.trustedIssuers.values());
  }
  addTrustedIssuer(issuer) {
    this.trustedIssuers.set(issuer.id, issuer);
    this.issuerEndpoints.set(issuer.id, issuer.issuerUrl);
    this.emit('issuerAdded', {
      issuerId: issuer.id,
      issuerName: issuer.name
    });
  }
  removeTrustedIssuer(issuerId) {
    this.trustedIssuers.delete(issuerId);
    this.issuerEndpoints.delete(issuerId);
    this.authTokens.delete(issuerId);
    this.emit('issuerRemoved', {
      issuerId
    });
  }
}
//# sourceMappingURL=IssuerService.js.map