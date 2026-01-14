import { VCSDKConfig, VC, StorageStats, ExportData } from '../types';
export declare class StorageService {
    private config;
    private mmkv;
    private cryptoUtil;
    private encryptionKey;
    constructor(config: VCSDKConfig);
    init(): Promise<void>;
    setupEncryption(): Promise<void>;
    private getOrCreateEncryptionKey;
    storeCredential(credential: VC): Promise<string>;
    getCredential(vcId: string): Promise<VC>;
    getCredentials(filters?: any): Promise<VC[]>;
    deleteCredential(vcId: string): Promise<boolean>;
    private updateCredentialIndex;
    private getCredentialIndex;
    private removeFromIndex;
    private applyFilters;
    getAllData(): Promise<Record<string, any>>;
    restoreAllData(data: Record<string, any>): Promise<void>;
    clearAllData(): Promise<void>;
    getStorageStats(): Promise<StorageStats>;
    exportData(format: 'json' | 'csv'): Promise<ExportData>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=StorageService.d.ts.map