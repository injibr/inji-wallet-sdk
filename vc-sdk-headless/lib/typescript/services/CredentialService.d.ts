import { VCSDKConfig, VC, CredentialInput, CredentialFilters, VerificationResult, CredentialStats, CredentialUpdate } from '../types';
import { StorageServicePlatform as StorageService } from './StorageService_Platform';
import { AuthService } from './AuthService';
export declare class CredentialService {
    private config;
    private storageService;
    private authService;
    private vcVerifier;
    private uid;
    constructor(config: VCSDKConfig);
    init(storageService: StorageService, authService: AuthService): Promise<void>;
    addCredential(credentialData: CredentialInput): Promise<VC>;
    getCredential(vcId: string): Promise<VC>;
    getCredentials(filters?: CredentialFilters): Promise<VC[]>;
    updateCredential(vcId: string, updates: CredentialUpdate): Promise<VC>;
    deleteCredential(vcId: string): Promise<boolean>;
    verifyCredential(vc: VC): Promise<VerificationResult>;
    searchCredentials(query: string): Promise<VC[]>;
    getCredentialStats(): Promise<CredentialStats>;
    pinCredential(vcId: string, pinned?: boolean): Promise<VC>;
    addTagToCredential(vcId: string, tag: string): Promise<VC>;
    removeTagFromCredential(vcId: string, tag: string): Promise<VC>;
    /**
     * Convert DID to HTTPS URL
     * did:web:example.com:path:to:resource -> https://example.com/path/to/resource
     */
    private didToHttps;
    /**
     * Get issuer well-known configuration for display metadata
     * Used for rendering credentials with issuer branding
     */
    getIssuerDisplayMetadata(issuerUrl: string): Promise<any>;
    /**
     * Alias for getCredentials() for compatibility
     */
    getAll(): Promise<VC[]>;
    private validateCredential;
    private generateDefaultName;
    private generateFallbackId;
    private generateJWTProof;
    private generateProperJWTProof;
    private generateProof;
    requestAndDownload(issuer: any, credentialType: any, progressCallback?: (progress: string) => void): Promise<VC>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=CredentialService.d.ts.map