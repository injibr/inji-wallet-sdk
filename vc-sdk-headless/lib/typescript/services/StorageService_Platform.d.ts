import { VCSDKConfig, VC, StorageStats, ExportData } from '../types';
/**
 * Platform-aware storage service that works across Expo and React Native CLI
 */
export declare class StorageServicePlatform {
    private config;
    private adapter;
    private indexKey;
    constructor(config: VCSDKConfig);
    init(): Promise<void>;
    setupEncryption(): Promise<void>;
    storeCredential(credential: VC): Promise<string>;
    getCredential(id: string): Promise<VC | null>;
    getAllCredentials(): Promise<VC[]>;
    getCredentials(filters?: any): Promise<VC[]>;
    deleteCredential(id: string): Promise<boolean>;
    clearAllCredentials(): Promise<void>;
    getStorageStats(): Promise<StorageStats>;
    exportData(): Promise<ExportData>;
    importData(exportData: ExportData): Promise<number>;
    /**
     * Store sensitive data using secure storage
     */
    storeSecureData(key: string, value: string): Promise<void>;
    /**
     * Retrieve sensitive data from secure storage
     */
    getSecureData(key: string): Promise<string | null>;
    /**
     * Remove sensitive data from secure storage
     */
    removeSecureData(key: string): Promise<void>;
    private getCredentialIndex;
    private updateCredentialIndex;
    private removeFromCredentialIndex;
}
//# sourceMappingURL=StorageService_Platform.d.ts.map