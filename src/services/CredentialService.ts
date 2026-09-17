import { VCSDKConfig, VC, VerificationResult } from '../types';
import { StorageServicePlatform as StorageService } from './StorageService_Platform';
import { AuthService } from './AuthService';
import { VCVerifier } from '../utils/crypto/VCVerifier';
import { AuthIntegrationService } from './AuthIntegrationService';
import { Buffer } from 'buffer';

export class CredentialService {
  private config: VCSDKConfig;
  private storageService: StorageService | null = null;
  private authService: AuthService | null = null;
  private vcVerifier: VCVerifier;
  private uid: { rnd: (length?: number) => string };

  constructor(config: VCSDKConfig) {
    this.config = config;
    this.vcVerifier = new VCVerifier();
    this.uid = { rnd: (length = 16) => this.generateId(length) };
  }

  async init(storageService: StorageService, authService: AuthService): Promise<void> {
    this.storageService = storageService;
    this.authService = authService;
  }

  async getAll(): Promise<VC[]> {
    return this.getCredentials();
  }

  async getCredentials(): Promise<VC[]> {
    if (!this.storageService) throw new Error('Storage service not initialized');
    return this.storageService.getCredentials();
  }

  async getCredential(vcId: string): Promise<VC> {
    if (!this.storageService) throw new Error('Storage service not initialized');
    return this.storageService.getCredential(vcId);
  }

  async deleteCredential(vcId: string): Promise<boolean> {
    if (!this.storageService) throw new Error('Storage service not initialized');
    const success = await this.storageService.deleteCredential(vcId);
    if (success) console.log(`[CredentialService] Deleted: ${vcId}`);
    return success;
  }

  async verifyCredential(vc: VC): Promise<VerificationResult> {
    try {
      return await this.vcVerifier.verify(vc);
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown verification error'],
        warnings: [],
        issuerTrusted: false,
        signatureValid: false,
        notExpired: false,
      };
    }
  }

  async requestAndDownload(
    issuer: any,
    credentialType: any,
    progressCallback?: (progress: string) => void,
    accessToken?: string,
  ): Promise<VC> {
    if (!this.storageService) throw new Error('Storage service not initialized');

    console.log('[CredentialService] requestAndDownload start', { issuerId: issuer?.id, credentialTypeId: credentialType?.id, format: credentialType?.format });
    progressCallback?.('Initiating credential request...');

    const vcId = this.uid.rnd();
    const fullCredentialEndpoint = issuer.credential_endpoint || `${issuer.issuerUrl}/v1/certify/issuance/credential`;
    console.log('[CredentialService] Credential endpoint:', fullCredentialEndpoint);

    progressCallback?.('Getting access token...');

    const resolvedToken = accessToken || await AuthIntegrationService.getAccessToken();
    if (!resolvedToken) {
      console.error('[CredentialService] No access token available');
      throw new Error('No access token available. User must be authenticated.');
    }
    console.log('[CredentialService] Access token resolved, length:', resolvedToken.length);

    const isMsoMdoc = credentialType.format === 'mso_mdoc' || credentialType.fullConfig?.format === 'mso_mdoc';
    console.log('[CredentialService] Format:', isMsoMdoc ? 'mso_mdoc' : 'ldp_vc');

    let requestPayload: any;
    let credentialContext: string[] | undefined;

    if (isMsoMdoc) {
      requestPayload = {
        format: 'mso_mdoc',
        doctype: credentialType.doctype || credentialType.fullConfig?.doctype || credentialType.id,
        proof: {
          proof_type: 'jwt',
          jwt: await this.generateProperJWTProof(resolvedToken, issuer),
        },
      };
    } else {
      const credentialTypes = credentialType.credentialDefinitionTypes?.length > 0
        ? credentialType.credentialDefinitionTypes
        : ['VerifiableCredential', credentialType.id];

      credentialContext = credentialType.fullConfig?.credential_definition?.['@context'];
      if (!credentialContext?.length) {
        throw new Error(`Missing @context in credential_definition for type: ${credentialType.id}`);
      }

      requestPayload = {
        format: 'ldp_vc',
        credential_definition: { type: credentialTypes, '@context': credentialContext },
        proof: {
          proof_type: 'jwt',
          jwt: await this.generateProperJWTProof(resolvedToken, issuer),
        },
        doctype: credentialType.id,
        issuerId: issuer.id,
      };
    }

    console.log('[CredentialService] Request payload:', JSON.stringify(requestPayload));
    progressCallback?.('Making authenticated API request...');

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${resolvedToken}`,
    };

    const response = await fetch(fullCredentialEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestPayload),
    });

    const responseData = await response.text();
    console.log('[CredentialService] Response status:', response.status, '| body length:', responseData.length);
    console.log('[CredentialService] Response body:', responseData);

    if (!response.ok) {
      if (response.status === 424) {
        console.warn('[CredentialService] 424 - credential not available at provider');
        const error424 = Object.assign(new Error('CREDENTIAL_NOT_AVAILABLE_424'), { statusCode: 424, credentialType });
        throw error424;
      }
      console.error('[CredentialService] API error:', response.status, responseData);
      throw new Error(`Credential API request failed: ${response.status} ${response.statusText} - ${responseData}`);
    }

    let credentialResponse: any;
    try {
      credentialResponse = JSON.parse(responseData);
    } catch {
      throw new Error(`Invalid JSON response from credential endpoint: ${responseData}`);
    }

    progressCallback?.('Processing credential response...');
    console.log('[CredentialService] Parsed credential response keys:', Object.keys(credentialResponse));

    const receivedCredential = credentialResponse.credential || credentialResponse;

    if (isMsoMdoc) {
      const mdocString = typeof receivedCredential === 'string' ? receivedCredential : credentialResponse.credential;
      if (!mdocString || typeof mdocString !== 'string') {
        throw new Error('Invalid mso_mdoc response: expected base64url string');
      }
      const credential: VC = {
        id: vcId,
        type: ['mso_mdoc', credentialType.doctype || credentialType.fullConfig?.doctype || credentialType.id],
        name: credentialType.name || credentialType.id,
        issuer: issuer.issuerUrl || issuer.id,
        issuanceDate: new Date().toISOString(),
        credentialSubject: {},
        proof: { type: 'mso_mdoc' } as any,
        metadata: {
          addedDate: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
          isPinned: false,
          tags: [],
          issuerInfo: issuer,
          credentialType,
          downloadedAt: new Date().toISOString(),
          source: 'inji_endpoint',
          mdocData: mdocString,
          originalResponse: credentialResponse,
        } as any,
      };
      await this.storageService.storeCredential(credential);
      progressCallback?.('Credential downloaded successfully');
      return credential;
    }

    console.log('[CredentialService] Validating proof on received credential...');
    if (!receivedCredential.proof) {
      console.error('[CredentialService] No proof on credential:', JSON.stringify(receivedCredential).slice(0, 300));
      throw new Error('Invalid credential: No proof signature from issuer.');
    }
    if (!receivedCredential.proof.type) {
      console.error('[CredentialService] Proof missing type:', receivedCredential.proof);
      throw new Error('Invalid proof: Missing proof type');
    }
    if (!receivedCredential.proof.proofValue && !receivedCredential.proof.jws) {
      console.error('[CredentialService] Proof missing signature:', receivedCredential.proof);
      throw new Error('Invalid proof: Missing signature (proofValue or jws)');
    }
    console.log('[CredentialService] Proof valid, type:', receivedCredential.proof.type);

    const credential: VC = {
      id: vcId,
      type: receivedCredential.type || [credentialType.id, 'VerifiableCredential'],
      name: credentialType.name || credentialType.id,
      issuer: receivedCredential.issuer || issuer.issuerUrl || issuer.id,
      issuanceDate: receivedCredential.issuanceDate || new Date().toISOString(),
      expirationDate: receivedCredential.expirationDate,
      credentialSubject: receivedCredential.credentialSubject || {},
      proof: receivedCredential.proof,
      '@context': receivedCredential['@context'] || credentialContext,
      metadata: {
        addedDate: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        isPinned: false,
        tags: [],
        issuerInfo: issuer,
        credentialType,
        downloadedAt: new Date().toISOString(),
        source: 'inji_endpoint',
        originalResponse: credentialResponse,
        originalCredential: receivedCredential,
      } as any,
    };

    console.log('[CredentialService] Validating and storing credential id:', vcId);
    await this.validateCredential(credential);
    await this.storageService.storeCredential(credential);

    progressCallback?.('Credential downloaded successfully');
    console.log('[CredentialService] requestAndDownload complete, id:', vcId);
    return credential;
  }

  async cleanup(): Promise<void> {
    this.storageService = null;
    this.authService = null;
  }

  private async generateProperJWTProof(accessToken: string, issuer: any): Promise<string> {
    let decodedToken: any = null;
    try {
      const parts = accessToken?.split('.');
      if (parts?.length === 3) {
        const p = parts[1];
        decodedToken = JSON.parse(Buffer.from(p + '='.repeat(4 - p.length % 4), 'base64').toString());
      }
    } catch (_) {}

    const cNonce = decodedToken?.c_nonce || decodedToken?.nonce || null;
    const clientId = issuer.client_id || decodedToken?.aud || 'h-credenciaisverificaveis-dev.dataprev.gov.br';
    const audience = issuer.credential_issuer || issuer.credentialIssuer || 'https://vcdemo.crabdance.com/certify';

    console.log('[CredentialService] generateProperJWTProof', { clientId, audience, hasCNonce: !!cNonce });

    const now = Math.floor(Date.now() / 1000);
    const payload: any = { iss: clientId, aud: audience, iat: now, exp: now + 18000 };
    if (cNonce) payload.nonce = cNonce;

    console.log('[CredentialService] JWT proof payload:', JSON.stringify(payload));

    const { nativeCryptoJWT } = require('./NativeCryptoJWT');
    const jwt = nativeCryptoJWT.createJWT(payload);
    console.log('[CredentialService] JWT proof created, length:', jwt?.length);
    return jwt;
  }

  private async validateCredential(credential: VC): Promise<void> {
    if (!credential.id) throw new Error('Credential must have an ID');
    if (!credential.type) throw new Error('Credential must have a type');
    if (!credential.issuer) throw new Error('Credential must have an issuer');
    if (!credential.credentialSubject) throw new Error('Credential must have a credential subject');

    new Date(credential.issuanceDate); // throws if invalid

    if (credential.expirationDate) {
      const exp = new Date(credential.expirationDate);
      const iss = new Date(credential.issuanceDate);
      if (exp <= iss) throw new Error('Expiration date must be after issuance date');
    }
  }

  private generateId(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  }
}
