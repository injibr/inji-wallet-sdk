import EventEmitter3 from 'eventemitter3';
import type { VC, VCSDKConfig } from '../types';
import { API } from '../utils/api';
import type { IssuerResponse } from '../utils/request';

export interface IssuerInfo {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  website?: string;
  issuerUrl: string;
  trustLevel: 'high' | 'medium' | 'low';
  authenticationMethods: AuthMethod[];
  credential_issuer?: string;
  credential_endpoint?: string;
  supportedCredentialTypes: CredentialType[];
  metadata: Record<string, any>;
}

export interface CredentialType {
  id: string;
  name: string;
  description: string;
  schema: any;
  fields?: any[];
  display?: any;
  credentialDefinitionTypes?: string[];
  format?: string;
  doctype?: string;
  fullConfig?: any;
  category?: string;
  requiredFields?: string[];
  optionalFields?: string[];
  icon?: string;
  estimatedTime?: string;
  documentRequirements?: string[];
}

export interface AuthMethod {
  type: 'oauth' | 'biometric' | 'otp' | 'pin' | 'certificate';
  name: string;
  description: string;
  config: Record<string, any>;
}

export class IssuerService extends EventEmitter3 {
  private trustedIssuers: Map<string, IssuerInfo> = new Map();
  private config: VCSDKConfig;

  constructor(config: VCSDKConfig) {
    super();
    this.config = config;
  }

  async init(): Promise<void> {
    console.log('[IssuerService] Initializing issuer service');
    try {
      await this.loadIssuersFromAPI();
      console.log('[IssuerService] Successfully initialized issuer service');
    } catch (error) {
      console.error('[IssuerService] Failed to initialize:', error);
      throw error;
    }
  }

  private async loadIssuersFromAPI(): Promise<void> {
    const baseUrl = this.config.network?.baseUrl;
    const issuersResponse: IssuerResponse[] = await API.fetchIssuers(baseUrl);

    console.log('[IssuerService] Received issuers from API:', issuersResponse.length);

    for (const issuer of issuersResponse) {
      const issuerInfo: IssuerInfo = {
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
            redirectUri: 'vc-sdk://auth/callback',
          },
        }],
        supportedCredentialTypes: [],
        metadata: {
          protocol: issuer.protocol,
          enabled: issuer.enabled,
          order: issuer.order,
        },
      };

      this.trustedIssuers.set(issuerInfo.id, issuerInfo);

      try {
        await this.loadIssuerWellKnownConfig(issuerInfo);
      } catch (error) {
        console.warn(`[IssuerService] Failed to load well-known config for ${issuerInfo.id}:`, error);
      }
    }

    this.emit('issuersLoaded', Array.from(this.trustedIssuers.values()));
  }

  private async loadIssuerWellKnownConfig(issuerInfo: IssuerInfo): Promise<void> {
    try {
      const wellKnownConfig = await API.fetchIssuerWellknownConfig(
        issuerInfo.id,
        issuerInfo.issuerUrl,
      );

      issuerInfo.credential_issuer = wellKnownConfig.credential_issuer;
      issuerInfo.credential_endpoint = wellKnownConfig.credential_endpoint;

      if (wellKnownConfig.credential_configurations_supported) {
        issuerInfo.supportedCredentialTypes = Object.entries(
          wellKnownConfig.credential_configurations_supported,
        ).map(([typeId, config]: [string, any]) => ({
          id: typeId,
          name: config.display?.[0]?.name || typeId,
          description: config.display?.[0]?.description || `Credential type: ${typeId}`,
          schema: config.credential_definition?.credentialSubject || {},
          fields: [],
          display: config.display?.[0] || {},
          credentialDefinitionTypes: config.credential_definition?.type || [],
          format: config.format,
          doctype: config.doctype || typeId,
          fullConfig: config,
        }));

        this.trustedIssuers.set(issuerInfo.id, issuerInfo);
        console.log(`[IssuerService] Loaded ${issuerInfo.supportedCredentialTypes.length} credential types for ${issuerInfo.id}`);
      }
    } catch (error) {
      console.warn(`[IssuerService] Failed to load well-known config for ${issuerInfo.id}:`, error);
    }
  }

  getAllTrustedIssuers(): IssuerInfo[] {
    return Array.from(this.trustedIssuers.values());
  }

  async getIssuerById(issuerId: string): Promise<IssuerInfo | null> {
    return this.trustedIssuers.get(issuerId) || null;
  }

  async getCredentialTypes(issuerId: string): Promise<CredentialType[]> {
    const issuer = this.trustedIssuers.get(issuerId);
    if (!issuer) throw new Error(`Issuer not found: ${issuerId}`);
    return issuer.supportedCredentialTypes;
  }
}
