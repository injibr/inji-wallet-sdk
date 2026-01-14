import {
  VCSDKConfig,
  BackupResult,
  RestoreResult
} from '../types';
import { StorageServicePlatform as StorageService } from './StorageService_Platform';
import { CredentialService } from './CredentialService';
import { CryptoUtil } from '../utils/crypto/CryptoUtil';
import { AdapterFactory, IFileSystemAdapter } from '../platform';

interface BackupData {
  version: string;
  timestamp: string;
  appId: string;
  credentials: any[];
  metadata: any;
  checksum: string;
}

export class BackupService {
  private config: VCSDKConfig;
  private storageService: StorageService | null = null;
  private credentialService: CredentialService | null = null;
  private cryptoUtil: CryptoUtil;
  private fileSystemAdapter: IFileSystemAdapter | null = null;

  constructor(config: VCSDKConfig) {
    this.config = config;
    this.cryptoUtil = new CryptoUtil();
  }

  async init(storageService: StorageService, credentialService: CredentialService): Promise<void> {
    this.storageService = storageService;
    this.credentialService = credentialService;

    try {
      // Initialize file system adapter
      this.fileSystemAdapter = await AdapterFactory.getFileSystemAdapter();

      // Setup automatic backups if enabled
      if (this.config.storage?.backup?.automatic) {
        await this.scheduleAutomaticBackups();
      }

      console.log('Backup service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize backup service:', error);
      throw error;
    }
  }

  async createBackup(): Promise<BackupResult> {
    if (!this.storageService || !this.credentialService) {
      throw new Error('Services not initialized');
    }

    try {
      const backupId = `backup-${Date.now()}`;
      const timestamp = new Date().toISOString();

      console.log('Creating backup...');

      // Get all credentials
      const credentials = await this.credentialService.getCredentials();
      
      // Get storage metadata
      const storageStats = await this.storageService.getStorageStats();
      
      // Create backup data
      const backupData: BackupData = {
        version: '1.0.0',
        timestamp,
        appId: this.config.appId,
        credentials,
        metadata: {
          credentialCount: credentials.length,
          storageStats,
          backupConfig: this.config.storage?.backup,
        },
        checksum: '', // Will be calculated after serialization
      };

      // Serialize and calculate checksum
      const serializedData = JSON.stringify(backupData);
      backupData.checksum = await this.cryptoUtil.calculateHash(serializedData);

      // Encrypt backup if enabled
      let finalBackupData = JSON.stringify(backupData);
      if (this.config.storage?.backup?.encryptBackups) {
        const encryptionKey = await this.cryptoUtil.generateEncryptionKey();
        finalBackupData = await this.cryptoUtil.encrypt(finalBackupData, encryptionKey);
      }

      // Save backup
      const backupPath = await this.saveBackup(backupId, finalBackupData);
      
      // Upload to cloud if configured
      if (this.config.storage?.backup?.provider !== 'custom') {
        await this.uploadToCloud(backupId, finalBackupData);
      }

      const result: BackupResult = {
        success: true,
        backupId,
        timestamp,
        size: finalBackupData.length,
      };

      console.log(`Backup created successfully: ${backupId}`);
      return result;
    } catch (error) {
      console.error('Failed to create backup:', error);
      
      return {
        success: false,
        backupId: `failed-${Date.now()}`,
        timestamp: new Date().toISOString(),
        size: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async restoreFromBackup(backupData: any): Promise<RestoreResult> {
    if (!this.storageService || !this.credentialService) {
      throw new Error('Services not initialized');
    }

    try {
      console.log('Starting backup restoration...');

      // Parse backup data
      let parsedBackup: BackupData;
      if (typeof backupData === 'string') {
        // Try to decrypt if needed
        if (this.config.storage?.backup?.encryptBackups) {
          const encryptionKey = await this.cryptoUtil.generateEncryptionKey();
          backupData = await this.cryptoUtil.decrypt(backupData, encryptionKey);
        }
        parsedBackup = JSON.parse(backupData);
      } else {
        parsedBackup = backupData;
      }

      // Validate backup
      await this.validateBackup(parsedBackup);

      // Clear existing data (with user confirmation in real app)
      await this.storageService.clearAllData();

      // Restore credentials
      let restoredCount = 0;
      const errors: string[] = [];

      for (const credential of parsedBackup.credentials) {
        try {
          await this.credentialService.addCredential({
            type: credential.type,
            issuer: credential.issuer,
            credentialSubject: credential.credentialSubject,
            name: credential.name,
            metadata: credential.metadata,
          });
          restoredCount++;
        } catch (error) {
          const errorMessage = `Failed to restore credential ${credential.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.warn(errorMessage);
          errors.push(errorMessage);
        }
      }

      const result: RestoreResult = {
        success: restoredCount > 0,
        restoredCredentials: restoredCount,
        errors,
      };

      console.log(`Backup restoration completed: ${restoredCount} credentials restored`);
      return result;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      
      return {
        success: false,
        restoredCredentials: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  async listBackups(): Promise<string[]> {
    try {
      // Note: Directory listing not yet implemented in file system adapter
      // For now, return empty list - this can be enhanced later
      console.log('Backup listing not yet implemented with platform adapters');
      return [];
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  async deleteBackup(backupId: string): Promise<boolean> {
    if (!this.fileSystemAdapter) {
      throw new Error('File system adapter not initialized');
    }

    try {
      const backupPath = await this.getBackupPath(backupId);

      if (await this.fileSystemAdapter.fileExists(backupPath)) {
        await this.fileSystemAdapter.deleteFile(backupPath);
        console.log(`Backup deleted: ${backupId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Failed to delete backup ${backupId}:`, error);
      return false;
    }
  }

  private async saveBackup(backupId: string, data: string): Promise<string> {
    if (!this.fileSystemAdapter) {
      throw new Error('File system adapter not initialized');
    }

    const backupPath = await this.getBackupPath(backupId);
    const fullPath = await this.fileSystemAdapter.writeFile(backupPath, data);
    return fullPath;
  }

  private async uploadToCloud(backupId: string, data: string): Promise<void> {
    if (!this.config.storage?.backup?.provider || this.config.storage.backup.provider === 'custom') {
      return;
    }

    try {
      // Mock cloud upload implementation
      console.log(`Uploading backup ${backupId} to ${this.config.storage.backup.provider}...`);
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`Backup uploaded successfully: ${backupId}`);
    } catch (error) {
      console.error('Failed to upload backup to cloud:', error);
      // Don't throw - local backup is still successful
    }
  }

  private async validateBackup(backup: BackupData): Promise<void> {
    if (!backup.version) {
      throw new Error('Invalid backup: missing version');
    }

    if (!backup.appId) {
      throw new Error('Invalid backup: missing app ID');
    }

    if (backup.appId !== this.config.appId) {
      throw new Error(`Backup is for different app: ${backup.appId} (expected ${this.config.appId})`);
    }

    if (!Array.isArray(backup.credentials)) {
      throw new Error('Invalid backup: credentials must be an array');
    }

    // Validate checksum if present
    if (backup.checksum) {
      const backupCopy = { ...backup, checksum: '' };
      const calculatedChecksum = await this.cryptoUtil.calculateHash(JSON.stringify(backupCopy));
      
      if (calculatedChecksum !== backup.checksum) {
        throw new Error('Backup integrity check failed: checksum mismatch');
      }
    }
  }

  private async scheduleAutomaticBackups(): Promise<void> {
    const schedule = this.config.storage?.backup?.schedule || 'daily';
    
    // In a real implementation, this would set up proper background scheduling
    console.log(`Automatic backups scheduled: ${schedule}`);
  }

  private async getBackupDirectory(): Promise<string> {
    if (!this.fileSystemAdapter) {
      throw new Error('File system adapter not initialized');
    }
    return 'vc-sdk-backups';
  }

  private async getBackupPath(backupId: string): Promise<string> {
    const backupDir = await this.getBackupDirectory();
    return `${backupDir}/${backupId}.json`;
  }

  async cleanup(): Promise<void> {
    this.storageService = null;
    this.credentialService = null;
    console.log('Backup service cleaned up');
  }
}