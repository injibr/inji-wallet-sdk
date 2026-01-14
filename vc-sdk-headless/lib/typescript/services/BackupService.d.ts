import { VCSDKConfig, BackupResult, RestoreResult } from '../types';
import { StorageServicePlatform as StorageService } from './StorageService_Platform';
import { CredentialService } from './CredentialService';
export declare class BackupService {
    private config;
    private storageService;
    private credentialService;
    private cryptoUtil;
    private fileSystemAdapter;
    constructor(config: VCSDKConfig);
    init(storageService: StorageService, credentialService: CredentialService): Promise<void>;
    createBackup(): Promise<BackupResult>;
    restoreFromBackup(backupData: any): Promise<RestoreResult>;
    listBackups(): Promise<string[]>;
    deleteBackup(backupId: string): Promise<boolean>;
    private saveBackup;
    private uploadToCloud;
    private validateBackup;
    private scheduleAutomaticBackups;
    private getBackupDirectory;
    private getBackupPath;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=BackupService.d.ts.map