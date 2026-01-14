/**
 * ShareVCService - OpenID4VP Protocol Implementation for VC Sharing
 * Pure JavaScript/TypeScript implementation for Expo compatibility
 * Supports manual URL input (no QR scanning required)
 */
import { VCSDKConfig, VP, VC, ShareResult } from '../types';
import { CredentialService } from './CredentialService';
export interface PresentationDefinition {
    id: string;
    input_descriptors: InputDescriptor[];
    format?: Record<string, any>;
    purpose?: string;
}
export interface InputDescriptor {
    id: string;
    name?: string;
    purpose?: string;
    format?: Record<string, any>;
    constraints: {
        fields?: FieldConstraint[];
    };
}
export interface FieldConstraint {
    path: string[];
    filter?: {
        type?: string;
        pattern?: string;
        const?: any;
    };
}
export interface AuthorizationRequest {
    client_id: string;
    redirect_uri: string;
    response_type: string;
    scope?: string;
    nonce?: string;
    state?: string;
    presentation_definition?: PresentationDefinition;
    presentation_definition_uri?: string;
    response_mode?: string;
    client_metadata?: {
        client_name?: string;
        logo_uri?: string;
    };
}
export interface VerifierInfo {
    name: string;
    clientId: string;
    purpose?: string;
    logoUri?: string;
}
export interface MatchedCredentials {
    [inputDescriptorId: string]: VC[];
}
export declare class ShareVCService {
    private config;
    private credentialService;
    private keyPair;
    constructor(config: VCSDKConfig);
    init(credentialService: CredentialService): Promise<void>;
    /**
     * Parse OpenID4VP authorization request from URL
     * Supports both direct presentation_definition and presentation_definition_uri
     */
    parseAuthorizationRequest(url: string): Promise<AuthorizationRequest>;
    /**
     * Fetch presentation definition from URI
     */
    private fetchPresentationDefinition;
    /**
     * Extract verifier information from authorization request
     */
    getVerifierInfo(authRequest: AuthorizationRequest): VerifierInfo;
    /**
     * Match user's credentials against presentation definition
     * Using the same logic as Inji's OpenID4VP implementation
     */
    matchCredentials(presentationDef: PresentationDefinition, userCredentials: VC[]): Promise<MatchedCredentials>;
    /**
     * Check if VC format and proof type match the request
     * Based on Inji's implementation
     */
    private areVCFormatAndProofTypeMatchingRequest;
    /**
     * Check if VC matches request constraints using JSONPath
     * Based on Inji's implementation
     */
    private isVCMatchingRequestConstraints;
    /**
     * Construct Verifiable Presentation with selected credentials
     * Signs with Ed25519 key pair using jose
     */
    constructVerifiablePresentation(selectedVCs: MatchedCredentials, authRequest: AuthorizationRequest): Promise<VP>;
    /**
     * Send Verifiable Presentation to verifier's redirect URI
     */
    sendVerifiablePresentation(vp: VP, authRequest: AuthorizationRequest): Promise<ShareResult>;
    /**
     * Get holder DID (simplified version)
     */
    private getHolderDID;
    /**
     * Generate UUID v4
     */
    private generateUUID;
    /**
     * Base64URL encode helper
     */
    private base64UrlEncode;
    /**
     * Cleanup service
     */
    cleanup(): Promise<void>;
}
//# sourceMappingURL=ShareVCService.d.ts.map