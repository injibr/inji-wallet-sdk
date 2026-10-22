import { VCSDKConfig, VC, VerificationResult } from '../types';
import { StorageServicePlatform as StorageService } from './StorageService_Platform';
import { AuthService } from './AuthService';
import { VCVerifier } from '../utils/crypto/VCVerifier';
import { AuthIntegrationService } from './AuthIntegrationService';
import { Buffer } from 'buffer';
import { NativeModules, NativeEventEmitter } from 'react-native';

const SD_JWT_FORMATS = ['vc+sd-jwt', 'dc+sd-jwt'] as const;
type SdJwtFormat = (typeof SD_JWT_FORMATS)[number];
const isSdJwt = (f: string): f is SdJwtFormat => SD_JWT_FORMATS.includes(f as SdJwtFormat);

export class CredentialService {
  private config: VCSDKConfig;
  private storageService: StorageService | null = null;
  private authService: AuthService | null = null;
  private vcVerifier: VCVerifier;

  constructor(config: VCSDKConfig) {
    this.config = config;
    this.vcVerifier = new VCVerifier();
  }

  async init(storageService: StorageService, authService: AuthService): Promise<void> {
    this.storageService = storageService;
    this.authService = authService;
  }

  async getAll(): Promise<VC[]> {
    if (!this.storageService) throw new Error('Storage not initialized');
    return this.storageService.getCredentials();
  }

  async getCredential(vcId: string): Promise<VC> {
    if (!this.storageService) throw new Error('Storage not initialized');
    return this.storageService.getCredential(vcId);
  }

  async deleteCredential(vcId: string): Promise<boolean> {
    if (!this.storageService) throw new Error('Storage not initialized');
    return this.storageService.deleteCredential(vcId);
  }

  async verifyCredential(vc: VC): Promise<VerificationResult> {
    try {
      return await this.vcVerifier.verify(vc);
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
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
    if (!this.storageService) throw new Error('Storage not initialized');

    progressCallback?.('Getting access token...');
    const token = accessToken || (await AuthIntegrationService.getAccessToken());
    if (!token) throw new Error('No access token available. User must be authenticated.');

    const format: string = credentialType.format ?? credentialType.fullConfig?.format ?? 'ldp_vc';
    const endpoint = issuer.credential_endpoint ?? `${issuer.issuerUrl}/v1/certify/issuance/credential`;
    const proof = { proof_type: 'jwt', jwt: await this.buildJWTProof(token, issuer) };

    progressCallback?.('Building request...');
    const payload = this.buildRequestPayload(format, credentialType, proof);

    progressCallback?.('Requesting credential...');
    const raw = await this.postCredential(endpoint, token, payload);

    progressCallback?.('Processing response...');
    const credential = this.buildVC(this.generateId(), format, raw, issuer, credentialType);

    if (format === 'ldp_vc') await this.validateLdpVc(credential);
    await this.storageService.storeCredential(credential);
    progressCallback?.('Done.');
    return credential;
  }

  async downloadFromOffer(
    credentialOfferUrl: string,
    clientId: string,
    redirectUri: string,
    progressCallback?: (progress: string) => void,
  ): Promise<VC> {
    if (!this.storageService) throw new Error('Storage not initialized');
    const { InjiVciClient } = NativeModules;
    if (!InjiVciClient) throw new Error('InjiVciClient native module not available');

    const emitter = new NativeEventEmitter(InjiVciClient);
    const listeners = VCI_EVENTS.map(name =>
      emitter.addListener(name, (data: any) => {
        progressCallback?.(`VCI: ${name}`);
        console.log(`[CredentialService] VCI ${name}`, data);
      })
    );

    try {
      progressCallback?.('Requesting credential from offer...');
      const responseJson: string = await InjiVciClient.requestCredentialByOffer(
        credentialOfferUrl,
        JSON.stringify({ clientId, redirectUri }),
        'JsonWebSignature2020',
      );

      const { credential: raw, credentialConfigurationId = '', credentialIssuer = '' } = JSON.parse(responseJson);
      const credential = this.buildVCFromRaw(this.generateId(), raw, credentialConfigurationId, credentialIssuer);
      await this.storageService.storeCredential(credential);
      progressCallback?.('Done.');
      return credential;
    } finally {
      listeners.forEach(l => l.remove());
    }
  }

  async cleanup(): Promise<void> {
    this.storageService = null;
    this.authService = null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildRequestPayload(format: string, credentialType: any, proof: any): any {
    if (format === 'mso_mdoc') {
      return {
        format: 'mso_mdoc',
        doctype: credentialType.doctype ?? credentialType.fullConfig?.doctype ?? credentialType.id,
        claims: credentialType.claims ?? credentialType.credentialSubject ?? {},
        proof,
      };
    }

    if (isSdJwt(format)) {
      return {
        format,
        vct: credentialType.vct ?? credentialType.fullConfig?.vct ?? credentialType.id,
        claims: credentialType.claims ?? credentialType.credentialSubject ?? {},
        proof,
      };
    }

    // ldp_vc
    const types = credentialType.credentialDefinitionTypes?.length
      ? credentialType.credentialDefinitionTypes
      : ['VerifiableCredential', credentialType.id];

    const context = credentialType.fullConfig?.credential_definition?.['@context'];
    if (!context?.length) throw new Error(`Missing @context for type: ${credentialType.id}`);

    return {
      format: 'ldp_vc',
      credential_definition: {
        type: types,
        '@context': context,
        credentialSubject: credentialType.credentialSubject ?? {},
      },
      proof,
      doctype: credentialType.id,
      issuerId: credentialType.issuerId,
    };
  }

  private async postCredential(endpoint: string, token: string, payload: any): Promise<any> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await response.text();

    if (!response.ok) {
      if (response.status === 424) {
        throw Object.assign(new Error('CREDENTIAL_NOT_AVAILABLE_424'), { statusCode: 424 });
      }
      throw new Error(`Credential request failed: ${response.status} - ${body}`);
    }

    try {
      return JSON.parse(body);
    } catch {
      throw new Error(`Invalid JSON from credential endpoint: ${body}`);
    }
  }

  private buildVC(id: string, format: string, response: any, issuer: any, credentialType: any): VC {
    const raw = response.credential ?? response;
    const now = new Date().toISOString();
    const baseMeta = {
      addedDate: now,
      lastAccessed: now,
      isPinned: false,
      tags: [],
      issuerInfo: issuer,
      credentialType,
      downloadedAt: now,
      source: 'inji_endpoint',
      originalResponse: response,
    };

    if (format === 'mso_mdoc') {
      if (typeof raw !== 'string') throw new Error('Invalid mso_mdoc: expected base64url string');
      return {
        id, name: credentialType.name ?? credentialType.id,
        type: ['mso_mdoc', credentialType.doctype ?? credentialType.id],
        issuer: issuer.issuerUrl ?? issuer.id,
        issuanceDate: now,
        credentialSubject: {},
        proof: { type: 'mso_mdoc' } as any,
        metadata: { ...baseMeta, mdocData: raw } as any,
      };
    }

    if (isSdJwt(format)) {
      if (typeof raw !== 'string') throw new Error(`Invalid ${format}: expected compact SD-JWT string`);
      const claims = decodeSdJwtPayload(raw);
      return {
        id, name: credentialType.name ?? credentialType.id,
        type: [format, credentialType.vct ?? credentialType.id],
        issuer: claims.iss ?? issuer.issuerUrl ?? issuer.id,
        issuanceDate: claims.iat ? new Date(claims.iat * 1000).toISOString() : now,
        expirationDate: claims.exp ? new Date(claims.exp * 1000).toISOString() : undefined,
        credentialSubject: claims,
        proof: { type: format } as any,
        metadata: { ...baseMeta, sdJwtCompact: raw, pathToDisclosures: buildPathToDisclosures(raw) } as any,
      };
    }

    // ldp_vc
    if (!raw.proof?.type) throw new Error('Invalid credential: missing proof');
    if (!raw.proof.proofValue && !raw.proof.jws) throw new Error('Invalid proof: missing signature');
    return {
      id, name: credentialType.name ?? credentialType.id,
      type: raw.type ?? [credentialType.id, 'VerifiableCredential'],
      issuer: raw.issuer ?? issuer.issuerUrl ?? issuer.id,
      issuanceDate: raw.issuanceDate ?? now,
      expirationDate: raw.expirationDate,
      credentialSubject: raw.credentialSubject ?? {},
      proof: raw.proof,
      '@context': raw['@context'],
      metadata: { ...baseMeta, originalCredential: raw } as any,
    };
  }

  private buildVCFromRaw(id: string, raw: any, configId: string, credentialIssuer: string): VC {
    const now = new Date().toISOString();
    const baseMeta = {
      addedDate: now, lastAccessed: now, isPinned: false, tags: [],
      downloadedAt: now, source: 'credential_offer', credentialConfigurationId: configId,
      originalResponse: raw,
    };

    if (typeof raw === 'string' && raw.includes('~')) {
      const claims = decodeSdJwtPayload(raw);
      return {
        id, name: configId,
        type: ['vc+sd-jwt', configId],
        issuer: claims.iss ?? credentialIssuer,
        issuanceDate: claims.iat ? new Date(claims.iat * 1000).toISOString() : now,
        expirationDate: claims.exp ? new Date(claims.exp * 1000).toISOString() : undefined,
        credentialSubject: claims,
        proof: { type: 'vc+sd-jwt' } as any,
        metadata: { ...baseMeta, sdJwtCompact: raw, pathToDisclosures: buildPathToDisclosures(raw) } as any,
      };
    }

    if (typeof raw === 'string') {
      return {
        id, name: configId,
        type: ['mso_mdoc', configId],
        issuer: credentialIssuer,
        issuanceDate: now,
        credentialSubject: {},
        proof: { type: 'mso_mdoc' } as any,
        metadata: { ...baseMeta, mdocData: raw } as any,
      };
    }

    return {
      id, name: configId,
      type: raw.type ?? ['VerifiableCredential', configId],
      issuer: raw.issuer ?? credentialIssuer,
      issuanceDate: raw.issuanceDate ?? now,
      expirationDate: raw.expirationDate,
      credentialSubject: raw.credentialSubject ?? {},
      proof: raw.proof,
      '@context': raw['@context'],
      metadata: { ...baseMeta, originalCredential: raw } as any,
    };
  }

  private async validateLdpVc(credential: VC): Promise<void> {
    if (!credential.id) throw new Error('Credential must have an ID');
    if (!credential.type) throw new Error('Credential must have a type');
    if (!credential.issuer) throw new Error('Credential must have an issuer');
    if (!credential.credentialSubject) throw new Error('Credential must have a credentialSubject');
    new Date(credential.issuanceDate);
    if (credential.expirationDate && new Date(credential.expirationDate) <= new Date(credential.issuanceDate)) {
      throw new Error('Expiration date must be after issuance date');
    }
  }

  private async buildJWTProof(accessToken: string, issuer: any): Promise<string> {
    let decoded: any = null;
    try {
      const p = accessToken.split('.')[1];
      decoded = JSON.parse(Buffer.from(p + '='.repeat(4 - p.length % 4), 'base64').toString());
    } catch (_) {}

    const now = Math.floor(Date.now() / 1000);
    const payload: any = {
      iss: issuer.client_id ?? decoded?.aud ?? 'h-credenciaisverificaveis-dev.dataprev.gov.br',
      aud: issuer.credential_issuer ?? issuer.credentialIssuer ?? 'https://vcdemo.crabdance.com/certify',
      iat: now,
      exp: now + 18000,
    };
    if (decoded?.c_nonce ?? decoded?.nonce) payload.nonce = decoded.c_nonce ?? decoded.nonce;

    const { nativeCryptoJWT } = require('./NativeCryptoJWT');
    return nativeCryptoJWT.createJWT(payload);
  }

  private generateId(length = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}

// ---------------------------------------------------------------------------
// Module-level helpers
// ---------------------------------------------------------------------------

const VCI_EVENTS = [
  'onRequestAuthCode', 'onRequestProof', 'onRequestTokenResponse',
  'onRequestTxCode', 'onCheckIssuerTrust', 'onPresentationRequest', 'onRequestSignedVPToken',
];

function decodeSdJwtPayload(compact: string): Record<string, any> {
  try {
    const p = compact.split('~')[0].split('.')[1];
    return JSON.parse(Buffer.from(p + '='.repeat(4 - p.length % 4), 'base64').toString());
  } catch (_) {
    return {};
  }
}

/**
 * Parses SD-JWT disclosures and builds a map of claim path → disclosure hash(es).
 * Each disclosure is base64url(json([salt, key, value])) or base64url(json([salt, value])).
 * Returns: { "$.cpf": ["disc_hash"], "$.address": ["disc_hash"], ... }
 */
export function buildPathToDisclosures(compact: string): Record<string, string[]> {
  const parts = compact.split('~').filter(Boolean);
  // parts[0] is the JWT; rest are disclosures (last may be KB-JWT if it has 2 dots)
  const disclosureParts = parts.slice(1).filter(p => p.split('.').length < 3);

  const map: Record<string, string[]> = {};

  for (const disc of disclosureParts) {
    try {
      const pad = disc + '='.repeat(4 - disc.length % 4);
      const decoded: any[] = JSON.parse(Buffer.from(pad, 'base64').toString());
      // [salt, key, value] = object claim; [salt, value] = array element
      if (decoded.length === 3 && typeof decoded[1] === 'string') {
        const path = `$.${decoded[1]}`;
        if (!map[path]) map[path] = [];
        map[path].push(disc);
      }
    } catch (_) {}
  }

  return map;
}
