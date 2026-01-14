import { VCSDKConfig, VC, VerificationResult, AuthResult, BackupResult, RestoreResult, User, CredentialInput, CredentialFilters, ShareResult, SharingRecipient, SharingRecord, StorageStats, ExportData, SDKEvents, BackupData } from '../types';
import { CredentialService } from '../services/CredentialService';
import { StorageServicePlatform as StorageService } from '../services/StorageService_Platform';
import { AuthService } from '../services/AuthService';
import { SharingService } from '../services/SharingService';
import { BackupService } from '../services/BackupService';
import { IssuerService } from '../services/IssuerService';
import { EventEmitter } from 'events';
export interface SDKServices {
    credential: CredentialService;
    storage: StorageService;
    auth: AuthService;
    sharing: SharingService;
    backup: BackupService;
    issuer: IssuerService;
}
export declare class VCSDKCore extends EventEmitter {
    private static instance;
    private services;
    private machine;
    private initialized;
    private config;
    private constructor();
    static getInstance(): VCSDKCore;
    init(config: VCSDKConfig): Promise<void>;
    private initializeServices;
    private initializeStateMachine;
    private setupSecurity;
    get credentials(): {
        add: (credentialData: CredentialInput) => Promise<VC>;
        getAll: (filters?: CredentialFilters) => Promise<VC[]>;
        get: (vcId: string) => Promise<VC>;
        update: (vcId: string, updates: any) => Promise<VC>;
        delete: (vcId: string) => Promise<boolean>;
        verify: (vc: VC) => Promise<VerificationResult>;
        search: (query: string) => Promise<VC[]>;
        getStats: () => Promise<import("../types").CredentialStats>;
        requestAndDownload: (issuer: any, credentialType: any, progressCallback?: (progress: string) => void) => Promise<VC>;
    };
    get auth(): {
        authenticate: () => Promise<AuthResult>;
        isAuthenticated: () => Promise<boolean>;
        logout: () => Promise<void>;
        setupBiometrics: () => Promise<boolean>;
        getCurrentUser: () => Promise<User | null>;
    };
    get sharing(): {
        shareViaQR: (credentialIds: string[], recipient: SharingRecipient) => Promise<string>;
        shareViaBluetooth: (credentialIds: string[], deviceId: string) => Promise<ShareResult>;
        shareViaNetwork: (credentialIds: string[], endpoint: string) => Promise<ShareResult>;
        receiveCredential: (sharingData: string) => Promise<VC>;
        getHistory: () => Promise<SharingRecord[]>;
        /**
         * Initiate ShareVC flow from external app
         * @param url - OpenID4VP authorization request URL
         * @returns Promise that resolves when ShareVC screen is shown
         */
        initiateShareVC: (url: string) => Promise<void>;
    };
    get issuers(): {
        getAll: () => Promise<import("../machines/issuer/IssuerMachine").IssuerInfo[]>;
        getById: (issuerId: string) => Promise<import("../machines/issuer/IssuerMachine").IssuerInfo>;
        getCredentialTypes: (issuerId: string) => Promise<import("../machines/issuer/IssuerMachine").CredentialType[]>;
        refresh: () => Promise<void>;
    };
    get storage(): {
        backup: () => Promise<BackupResult>;
        restore: (backupData: BackupData) => Promise<RestoreResult>;
        getStats: () => Promise<StorageStats>;
        clear: () => Promise<void>;
        export: (format: "json" | "csv") => Promise<ExportData>;
    };
    on<K extends keyof SDKEvents>(event: K, listener: SDKEvents[K]): this;
    off<K extends keyof SDKEvents>(event: K, listener: SDKEvents[K]): this;
    emit<K extends keyof SDKEvents>(event: K, ...args: Parameters<SDKEvents[K]>): boolean;
    isInitialized(): boolean;
    getConfig(): VCSDKConfig | null;
    getServices(): SDKServices | null;
    private ensureInitialized;
    destroy(): Promise<void>;
}
export declare const VCSDK: VCSDKCore;
interface BackupData {
    version: string;
    timestamp: string;
    credentials: VC[];
    metadata: any;
}
export {};
//# sourceMappingURL=VCSDKCore.d.ts.map