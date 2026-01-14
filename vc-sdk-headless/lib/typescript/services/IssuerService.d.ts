import EventEmitter3 from 'eventemitter3';
import type { IssuerInfo, CredentialType, AuthMethod } from '../machines/issuer/IssuerMachine';
import type { CredentialInput, VC, VCSDKConfig } from '../types';
export interface IssuerDiscoveryOptions {
    category?: string;
    trustLevel?: 'high' | 'medium' | 'low';
    location?: string;
    features?: string[];
}
export interface AuthenticationResult {
    success: boolean;
    token?: string;
    refreshToken?: string;
    user?: {
        id: string;
        name: string;
        email?: string;
    };
    error?: string;
}
export interface IssuanceOptions {
    credentialType: CredentialType;
    credentialData: CredentialInput;
    authToken: string;
    deliveryMethod?: 'immediate' | 'email' | 'sms';
    additionalMetadata?: Record<string, any>;
}
export interface IssuanceResult {
    success: boolean;
    credential?: VC;
    transactionId?: string;
    deliveryInfo?: {
        method: string;
        destination?: string;
        estimatedDelivery?: string;
    };
    error?: string;
}
export declare class IssuerService extends EventEmitter3 {
    private trustedIssuers;
    private issuerEndpoints;
    private authTokens;
    private config;
    constructor(config: VCSDKConfig);
    init(): Promise<void>;
    private loadIssuersFromAPI;
    private loadIssuerWellKnownConfig;
    private initializeFallbackIssuers;
    discoverIssuers(options?: IssuerDiscoveryOptions): Promise<IssuerInfo[]>;
    getIssuerById(issuerId: string): Promise<IssuerInfo | null>;
    getIssuerInfo(issuerId: string): Promise<IssuerInfo | null>;
    getCredentialTypes(issuerId: string): Promise<CredentialType[]>;
    authenticateWithIssuer(issuerId: string, authMethod: AuthMethod, credentials: any): Promise<AuthenticationResult>;
    requestCredential(issuerId: string, options: IssuanceOptions): Promise<IssuanceResult>;
    verifyIssuerTrust(issuerId: string): Promise<{
        isTrusted: boolean;
        trustLevel: 'high' | 'medium' | 'low';
        certifications: string[];
        lastVerified: string;
    }>;
    refreshAuthToken(issuerId: string, refreshToken: string): Promise<string | null>;
    revokeAuthToken(issuerId: string): Promise<void>;
    private calculateExpirationDate;
    private generateMockProof;
    getAuthToken(issuerId: string): string | undefined;
    getAllTrustedIssuers(): IssuerInfo[];
    addTrustedIssuer(issuer: IssuerInfo): void;
    removeTrustedIssuer(issuerId: string): void;
}
//# sourceMappingURL=IssuerService.d.ts.map