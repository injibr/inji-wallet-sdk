import {
  VCSDKConfig,
  VC,
  VP,
  VerificationResult,
  AuthResult,
  BackupResult,
  RestoreResult,
  User,
  CredentialInput,
  CredentialFilters,
  ShareResult,
  SharingRecipient,
  SharingRecord,
  StorageStats,
  ExportData,
  SDKEvents,
  BackupData
} from '../types';
import { CredentialService } from '../services/CredentialService';
import { StorageServicePlatform as StorageService } from '../services/StorageService_Platform';
import { AuthService } from '../services/AuthService';
import { SharingService } from '../services/SharingService';
import { BackupService } from '../services/BackupService';
import { IssuerService } from '../services/IssuerService';
import { notificationService } from '../services/NotificationService';
import { createVCSDKMachine } from '../machines/core/VCSDKMachine';
import { interpret, Interpreter } from 'xstate';
import { EventEmitter } from 'events';

export interface SDKServices {
  credential: CredentialService;
  storage: StorageService;
  auth: AuthService;
  sharing: SharingService;
  backup: BackupService;
  issuer: IssuerService;
}

export class VCSDKCore extends EventEmitter {
  private static instance: VCSDKCore;
  private services: SDKServices | null = null;
  private machine: Interpreter<any> | null = null;
  private initialized: boolean = false;
  private config: VCSDKConfig | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): VCSDKCore {
    if (!VCSDKCore.instance) {
      VCSDKCore.instance = new VCSDKCore();
    }
    return VCSDKCore.instance;
  }

  async init(config: VCSDKConfig): Promise<void> {
    if (this.initialized) {
      console.warn('VC-SDK is already initialized');
      return;
    }

    try {
      this.config = {
        environment: 'production',
//         biometrics: {
//           enabled: true,
//           title: 'Access your digital credentials',
//           fallbackToPasscode: true,
//         },
        storage: {
          encrypted: true,
          backup: {
            provider: 'icloud',
            automatic: true,
            schedule: 'daily',
            encryptBackups: true,
          },
        },
        ui: {
          theme: 'auto',
          animations: true,
        },
        network: {
          baseUrl: 'https://vcdemo.crabdance.com',
          timeout: 30000,
          retries: 3,
          oauth: {
            authorizationUrl: 'https://sso.staging.acesso.gov.br/authorize',
            tokenUrl: 'https://sso.staging.acesso.gov.br/token',
            userInfoUrl: 'https://sso.staging.acesso.gov.br/userinfo/',
            clientId: 'inji-dev',
            clientSecret: process.env.OAUTH_CLIENT_SECRET || '',
            redirectUri: 'http://localhost:3001/redirect',
            scopes: ['openid', 'profile', 'email'],
          },
        },
        ...config,
      };

      // Configure notification service with base URL from config
      if (this.config.network?.notificationBaseUrl) {
        notificationService.setNotificationBaseUrl(this.config.network.notificationBaseUrl);
        console.log('[VCSDKCore] Notification service configured with URL:', this.config.network.notificationBaseUrl);
      }

      await this.initializeServices(this.config);
      await this.initializeStateMachine();
      await this.setupSecurity();
      
      this.initialized = true;
      this.emit('initialized');
      
      console.log(`VC-SDK initialized successfully for app: ${config.appId}`);
    } catch (error) {
      console.error('Failed to initialize VC-SDK:', error);
      this.emit('error', error);
      throw error;
    }
  }

  private async initializeServices(config: VCSDKConfig): Promise<void> {
    this.services = {
      storage: new StorageService(config),
      auth: new AuthService(config),
      credential: new CredentialService(config),
      sharing: new SharingService(config),
      backup: new BackupService(config),
      issuer: new IssuerService(config),
    };

    // Initialize services in dependency order
    await this.services.storage.init();
    await this.services.auth.init(this.services.storage);
    await this.services.issuer.init(); // Initialize issuer service
    await this.services.credential.init(this.services.storage, this.services.auth);
    await this.services.sharing.init(this.services.credential);
    await this.services.backup.init(this.services.storage, this.services.credential);
  }

  private async initializeStateMachine(): Promise<void> {
    if (!this.services) {
      throw new Error('Services not initialized');
    }

    const sdkMachine = createVCSDKMachine(this.services);
    this.machine = interpret(sdkMachine);
    
    this.machine.onTransition((state) => {
      console.log('SDK State:', state.value);
      this.emit('stateChange', state.value);
    });

    this.machine.start();
    this.machine.send({ type: 'INIT', config: this.config });
  }

  private async setupSecurity(): Promise<void> {
    if (!this.services) {
      throw new Error('Services not initialized');
    }

//     // Setup biometric authentication if enabled
//     if (this.config?.biometrics?.enabled) {
//       await this.services.auth.setupBiometrics();
//     }

    // Initialize hardware keystore
    await this.services.storage.setupEncryption();
  }

  // Public API - Credential Management
  public get credentials() {
    return {
      add: async (credentialData: CredentialInput): Promise<VC> => {
        this.ensureInitialized();
        const credential = await this.services!.credential.addCredential(credentialData);
        this.emit('credentialAdded', credential);
        return credential;
      },

      getAll: async (filters?: CredentialFilters): Promise<VC[]> => {
        this.ensureInitialized();
        return await this.services!.credential.getCredentials(filters);
      },

      get: async (vcId: string): Promise<VC> => {
        this.ensureInitialized();
        return await this.services!.credential.getCredential(vcId);
      },

      update: async (vcId: string, updates: any): Promise<VC> => {
        this.ensureInitialized();
        const credential = await this.services!.credential.updateCredential(vcId, updates);
        this.emit('credentialUpdated', credential);
        return credential;
      },

      delete: async (vcId: string): Promise<boolean> => {
        this.ensureInitialized();
        const success = await this.services!.credential.deleteCredential(vcId);
        if (success) {
          this.emit('credentialRemoved', vcId);
        }
        return success;
      },

      verify: async (vc: VC): Promise<VerificationResult> => {
        this.ensureInitialized();
        return await this.services!.credential.verifyCredential(vc);
      },

      search: async (query: string): Promise<VC[]> => {
        this.ensureInitialized();
        return await this.services!.credential.searchCredentials(query);
      },

      getStats: async () => {
        this.ensureInitialized();
        return await this.services!.credential.getCredentialStats();
      },

      requestAndDownload: async (issuer: any, credentialType: any, progressCallback?: (progress: string) => void): Promise<VC> => {
        this.ensureInitialized();
        const credential = await this.services!.credential.requestAndDownload(issuer, credentialType, progressCallback);
        this.emit('credentialAdded', credential);
        return credential;
      },
    };
  }

  // Public API - Authentication
  public get auth() {
    return {
      authenticate: async (): Promise<AuthResult> => {
        this.ensureInitialized();
        const result = await this.services!.auth.authenticateUser();
        if (result.success) {
          this.emit('authenticationSuccess', result.user);
        } else {
          this.emit('authenticationFailed', result.error);
        }
        return result;
      },

      isAuthenticated: async (): Promise<boolean> => {
        this.ensureInitialized();
        return await this.services!.auth.isAuthenticated();
      },

      logout: async (): Promise<void> => {
        this.ensureInitialized();
        await this.services!.auth.logout();
        this.emit('logout');
      },

      setupBiometrics: async (): Promise<boolean> => {
        this.ensureInitialized();
        return await this.services!.auth.setupBiometrics();
      },

      getCurrentUser: async (): Promise<User | null> => {
        this.ensureInitialized();
        return await this.services!.auth.getCurrentUser();
      },
    };
  }

  // Public API - Sharing
  public get sharing() {
    return {
      shareViaQR: async (credentialIds: string[], recipient: SharingRecipient): Promise<string> => {
        this.ensureInitialized();
        const vp = await this.services!.sharing.createVerifiablePresentation(credentialIds, recipient);
        const qrData = await this.services!.sharing.generateQRCode(vp);
        this.emit('credentialShared', { success: true, transactionId: vp.id });
        return qrData;
      },

      shareViaBluetooth: async (credentialIds: string[], deviceId: string): Promise<ShareResult> => {
        this.ensureInitialized();
        const result = await this.services!.sharing.shareViaBluetooth(credentialIds, deviceId);
        this.emit('credentialShared', result);
        return result;
      },

      shareViaNetwork: async (credentialIds: string[], endpoint: string): Promise<ShareResult> => {
        this.ensureInitialized();
        const result = await this.services!.sharing.shareViaNetwork(credentialIds, endpoint);
        this.emit('credentialShared', result);
        return result;
      },

      receiveCredential: async (sharingData: string): Promise<VC> => {
        this.ensureInitialized();
        const credential = await this.services!.sharing.receiveCredential(sharingData);
        this.emit('credentialAdded', credential);
        return credential;
      },

      getHistory: async (): Promise<SharingRecord[]> => {
        this.ensureInitialized();
        return await this.services!.sharing.getSharingHistory();
      },

      /**
       * Initiate ShareVC flow from external app
       * @param url - OpenID4VP authorization request URL
       * @returns Promise that resolves when ShareVC screen is shown
       */
      initiateShareVC: async (url: string): Promise<void> => {
        this.ensureInitialized();
        console.log('[VCSDKCore] Initiating ShareVC from external app with URL:', url);

        // Emit event to show ShareVC screen
        this.emit('shareVCRequested', { url });
      },
    };
  }

  // Public API - Issuer Management
  public get issuers() {
    return {
      getAll: async () => {
        this.ensureInitialized();
        return await this.services!.issuer.discoverIssuers();
      },

      getById: async (issuerId: string) => {
        this.ensureInitialized();
        return await this.services!.issuer.getIssuerInfo(issuerId);
      },

      getCredentialTypes: async (issuerId: string) => {
        this.ensureInitialized();
        return await this.services!.issuer.getCredentialTypes(issuerId);
      },

      refresh: async () => {
        this.ensureInitialized();
        return await this.services!.issuer.init();
      },
    };
  }

  // Public API - Storage
  public get storage() {
    return {
      backup: async (): Promise<BackupResult> => {
        this.ensureInitialized();
        const result = await this.services!.backup.createBackup();
        this.emit('backupCompleted', result);
        return result;
      },

      restore: async (backupData: BackupData): Promise<RestoreResult> => {
        this.ensureInitialized();
        const result = await this.services!.backup.restoreFromBackup(backupData);
        this.emit('backupRestored', result);
        return result;
      },

      getStats: async (): Promise<StorageStats> => {
        this.ensureInitialized();
        return await this.services!.storage.getStorageStats();
      },

      clear: async (): Promise<void> => {
        this.ensureInitialized();
        await this.services!.storage.clearAllData();
        this.emit('dataCleared');
      },

      export: async (format: 'json' | 'csv'): Promise<ExportData> => {
        this.ensureInitialized();
        return await this.services!.storage.exportData(format);
      },
    };
  }

  // Event Management
  public on<K extends keyof SDKEvents>(event: K, listener: SDKEvents[K]): this {
    return super.on(event, listener);
  }

  public off<K extends keyof SDKEvents>(event: K, listener: SDKEvents[K]): this {
    return super.off(event, listener);
  }

  public emit<K extends keyof SDKEvents>(event: K, ...args: Parameters<SDKEvents[K]>): boolean {
    return super.emit(event, ...args);
  }

  // Utility Methods
  public isInitialized(): boolean {
    return this.initialized;
  }

  public getConfig(): VCSDKConfig | null {
    return this.config;
  }

  public getServices(): SDKServices | null {
    return this.services;
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.services) {
      throw new Error('VC-SDK is not initialized. Call init() first.');
    }
  }

  // Cleanup
  public async destroy(): Promise<void> {
    if (this.machine) {
      this.machine.stop();
    }
    
    if (this.services) {
      // Cleanup services
      await Promise.all([
        this.services.storage.cleanup?.(),
        this.services.auth.cleanup?.(),
        this.services.credential.cleanup?.(),
        this.services.sharing.cleanup?.(),
        this.services.backup.cleanup?.(),
      ]);
    }

    this.removeAllListeners();
    this.initialized = false;
    this.services = null;
    this.machine = null;
    this.config = null;
    
    console.log('VC-SDK destroyed successfully');
  }
}

// Default export for convenience
export const VCSDK = VCSDKCore.getInstance();

interface BackupData {
  version: string;
  timestamp: string;
  credentials: VC[];
  metadata: any;
}