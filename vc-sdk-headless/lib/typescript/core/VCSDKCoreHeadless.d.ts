/**
 * VCSDKCoreHeadless - Headless SDK Core with Event-Based API
 *
 * This is the main entry point for the headless VC SDK.
 * All operations emit events that the host app can listen to and handle UI accordingly.
 */
import { VCSDKConfig, VC } from '../types';
import { CredentialService } from '../services/CredentialService';
import { StorageServicePlatform as StorageService } from '../services/StorageService_Platform';
import { AuthService } from '../services/AuthService';
import { IssuerService } from '../services/IssuerService';
import { ShareVCService } from '../services/ShareVCService';
import { SDKEventEmitter } from '../events';
export interface SDKServices {
    credential: CredentialService;
    storage: StorageService;
    auth: AuthService;
    issuer: IssuerService;
    shareVC: ShareVCService;
}
export declare class VCSDKCoreHeadless {
    private static instance;
    private services;
    private initialized;
    private config;
    events: SDKEventEmitter;
    private constructor();
    static getInstance(): VCSDKCoreHeadless;
    /**
     * Initialize the SDK with configuration
     */
    init(config: VCSDKConfig): Promise<void>;
    private initializeServices;
    private setupSecurity;
    private ensureInitialized;
    /**
     * Get the current SDK configuration
     * Returns null if SDK is not initialized
     */
    getConfig(): VCSDKConfig | null;
    get credentials(): {
        /**
         * Download a credential from an issuer
         * Emits: credential:downloadStarted, credential:downloadProgress,
         *        credential:downloadComplete, credential:downloadError,
         *        credential:notAvailable424, auth:required
         */
        download: (issuer: any, credentialType: any) => Promise<VC | null>;
        /**
         * Get all credentials
         */
        getAll: () => Promise<VC[]>;
        /**
         * Get a single credential by ID
         */
        get: (credentialId: string) => Promise<VC | null>;
        /**
         * Delete a credential
         * Emits: credential:deleted, credential:listUpdated
         */
        delete: (credentialId: string) => Promise<boolean>;
    };
    get issuers(): {
        /**
         * Get all issuers
         * Emits: issuer:listUpdated
         */
        getAll: () => Promise<any[]>;
        /**
         * Get credential types for an issuer
         * Emits: issuer:credentialTypesLoaded
         */
        getCredentialTypes: (issuerId: string) => Promise<any[]>;
        /**
         * Get a single issuer by ID
         */
        get: (issuerId: string) => Promise<any>;
    };
    get auth(): {
        /**
         * Get authorization URL for authentication
         * Note: In headless SDK, the host app should handle authentication
         */
        getAuthUrl: () => Promise<string>;
        /**
         * Complete authentication with token
         * Call this after user completes WebView authentication
         * Emits: auth:complete, auth:error
         */
        completeAuthentication: (token: string) => Promise<void>;
        /**
         * Check if user is authenticated
         */
        isAuthenticated: () => Promise<boolean>;
        /**
         * Logout
         * Emits: auth:logout
         */
        logout: () => Promise<void>;
    };
    get share(): {
        /**
         * Parse a share request URL
         * Emits: share:requestParsed, share:error
         */
        parseRequest: (shareUrl: string) => Promise<{
            verifierInfo: any;
            requestedCredentials: any[];
            authRequest: any;
        }>;
        /**
         * Download missing credentials for sharing
         * Emits: share:downloadStarted, share:downloadProgress, share:downloadComplete,
         *        share:credentialNotAvailable424, auth:required
         */
        downloadCredentials: (requestedCredentials: any[]) => Promise<{
            successCount: number;
            error424Count: number;
            realErrorCount: number;
        }>;
        /**
         * Complete the share flow after user grants consent
         * Emits: share:sharingStarted, share:sharingProgress, share:sharingComplete, share:error
         */
        completeShare: (authRequest: any, requestedCredentials: any[]) => Promise<{
            success: boolean;
            protocolNumber?: string;
        }>;
        /**
         * Decline sharing (user cancelled)
         * Emits: share:userDeclined
         */
        declineShare: () => void;
    };
    get device(): {
        /**
         * Register device with CPF and FCM token
         * Emits: device:registrationStarted, device:registrationComplete, device:registrationError
         */
        register: (cpf: string, fcmToken: string) => Promise<void>;
    };
    get notifications(): {
        /**
         * Handle incoming notification
         * Emits: notification:received, notification:credentialReady
         */
        handleNotification: (notification: any) => void;
    };
}
/**
 * Export singleton instance
 */
export declare const VCSDK: VCSDKCoreHeadless;
//# sourceMappingURL=VCSDKCoreHeadless.d.ts.map