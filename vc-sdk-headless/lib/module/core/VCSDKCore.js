"use strict";

import { BackupData } from "../types/index.js";
import { CredentialService } from "../services/CredentialService.js";
import { StorageServicePlatform as StorageService } from "../services/StorageService_Platform.js";
import { AuthService } from "../services/AuthService.js";
import { SharingService } from "../services/SharingService.js";
import { BackupService } from "../services/BackupService.js";
import { IssuerService } from "../services/IssuerService.js";
import { notificationService } from "../services/NotificationService.js";
import { createVCSDKMachine } from "../machines/core/VCSDKMachine.js";
import { interpret } from 'xstate';
import { EventEmitter } from 'events';
export class VCSDKCore extends EventEmitter {
  services = null;
  machine = null;
  initialized = false;
  config = null;
  constructor() {
    super();
  }
  static getInstance() {
    if (!VCSDKCore.instance) {
      VCSDKCore.instance = new VCSDKCore();
    }
    return VCSDKCore.instance;
  }
  async init(config) {
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
            encryptBackups: true
          }
        },
        ui: {
          theme: 'auto',
          animations: true
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
            scopes: ['openid', 'profile', 'email']
          }
        },
        ...config
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
  async initializeServices(config) {
    this.services = {
      storage: new StorageService(config),
      auth: new AuthService(config),
      credential: new CredentialService(config),
      sharing: new SharingService(config),
      backup: new BackupService(config),
      issuer: new IssuerService(config)
    };

    // Initialize services in dependency order
    await this.services.storage.init();
    await this.services.auth.init(this.services.storage);
    await this.services.issuer.init(); // Initialize issuer service
    await this.services.credential.init(this.services.storage, this.services.auth);
    await this.services.sharing.init(this.services.credential);
    await this.services.backup.init(this.services.storage, this.services.credential);
  }
  async initializeStateMachine() {
    if (!this.services) {
      throw new Error('Services not initialized');
    }
    const sdkMachine = createVCSDKMachine(this.services);
    this.machine = interpret(sdkMachine);
    this.machine.onTransition(state => {
      console.log('SDK State:', state.value);
      this.emit('stateChange', state.value);
    });
    this.machine.start();
    this.machine.send({
      type: 'INIT',
      config: this.config
    });
  }
  async setupSecurity() {
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
  get credentials() {
    return {
      add: async credentialData => {
        this.ensureInitialized();
        const credential = await this.services.credential.addCredential(credentialData);
        this.emit('credentialAdded', credential);
        return credential;
      },
      getAll: async filters => {
        this.ensureInitialized();
        return await this.services.credential.getCredentials(filters);
      },
      get: async vcId => {
        this.ensureInitialized();
        return await this.services.credential.getCredential(vcId);
      },
      update: async (vcId, updates) => {
        this.ensureInitialized();
        const credential = await this.services.credential.updateCredential(vcId, updates);
        this.emit('credentialUpdated', credential);
        return credential;
      },
      delete: async vcId => {
        this.ensureInitialized();
        const success = await this.services.credential.deleteCredential(vcId);
        if (success) {
          this.emit('credentialRemoved', vcId);
        }
        return success;
      },
      verify: async vc => {
        this.ensureInitialized();
        return await this.services.credential.verifyCredential(vc);
      },
      search: async query => {
        this.ensureInitialized();
        return await this.services.credential.searchCredentials(query);
      },
      getStats: async () => {
        this.ensureInitialized();
        return await this.services.credential.getCredentialStats();
      },
      requestAndDownload: async (issuer, credentialType, progressCallback) => {
        this.ensureInitialized();
        const credential = await this.services.credential.requestAndDownload(issuer, credentialType, progressCallback);
        this.emit('credentialAdded', credential);
        return credential;
      }
    };
  }

  // Public API - Authentication
  get auth() {
    return {
      authenticate: async () => {
        this.ensureInitialized();
        const result = await this.services.auth.authenticateUser();
        if (result.success) {
          this.emit('authenticationSuccess', result.user);
        } else {
          this.emit('authenticationFailed', result.error);
        }
        return result;
      },
      isAuthenticated: async () => {
        this.ensureInitialized();
        return await this.services.auth.isAuthenticated();
      },
      logout: async () => {
        this.ensureInitialized();
        await this.services.auth.logout();
        this.emit('logout');
      },
      setupBiometrics: async () => {
        this.ensureInitialized();
        return await this.services.auth.setupBiometrics();
      },
      getCurrentUser: async () => {
        this.ensureInitialized();
        return await this.services.auth.getCurrentUser();
      }
    };
  }

  // Public API - Sharing
  get sharing() {
    return {
      shareViaQR: async (credentialIds, recipient) => {
        this.ensureInitialized();
        const vp = await this.services.sharing.createVerifiablePresentation(credentialIds, recipient);
        const qrData = await this.services.sharing.generateQRCode(vp);
        this.emit('credentialShared', {
          success: true,
          transactionId: vp.id
        });
        return qrData;
      },
      shareViaBluetooth: async (credentialIds, deviceId) => {
        this.ensureInitialized();
        const result = await this.services.sharing.shareViaBluetooth(credentialIds, deviceId);
        this.emit('credentialShared', result);
        return result;
      },
      shareViaNetwork: async (credentialIds, endpoint) => {
        this.ensureInitialized();
        const result = await this.services.sharing.shareViaNetwork(credentialIds, endpoint);
        this.emit('credentialShared', result);
        return result;
      },
      receiveCredential: async sharingData => {
        this.ensureInitialized();
        const credential = await this.services.sharing.receiveCredential(sharingData);
        this.emit('credentialAdded', credential);
        return credential;
      },
      getHistory: async () => {
        this.ensureInitialized();
        return await this.services.sharing.getSharingHistory();
      },
      /**
       * Initiate ShareVC flow from external app
       * @param url - OpenID4VP authorization request URL
       * @returns Promise that resolves when ShareVC screen is shown
       */
      initiateShareVC: async url => {
        this.ensureInitialized();
        console.log('[VCSDKCore] Initiating ShareVC from external app with URL:', url);

        // Emit event to show ShareVC screen
        this.emit('shareVCRequested', {
          url
        });
      }
    };
  }

  // Public API - Issuer Management
  get issuers() {
    return {
      getAll: async () => {
        this.ensureInitialized();
        return await this.services.issuer.discoverIssuers();
      },
      getById: async issuerId => {
        this.ensureInitialized();
        return await this.services.issuer.getIssuerInfo(issuerId);
      },
      getCredentialTypes: async issuerId => {
        this.ensureInitialized();
        return await this.services.issuer.getCredentialTypes(issuerId);
      },
      refresh: async () => {
        this.ensureInitialized();
        return await this.services.issuer.init();
      }
    };
  }

  // Public API - Storage
  get storage() {
    return {
      backup: async () => {
        this.ensureInitialized();
        const result = await this.services.backup.createBackup();
        this.emit('backupCompleted', result);
        return result;
      },
      restore: async backupData => {
        this.ensureInitialized();
        const result = await this.services.backup.restoreFromBackup(backupData);
        this.emit('backupRestored', result);
        return result;
      },
      getStats: async () => {
        this.ensureInitialized();
        return await this.services.storage.getStorageStats();
      },
      clear: async () => {
        this.ensureInitialized();
        await this.services.storage.clearAllData();
        this.emit('dataCleared');
      },
      export: async format => {
        this.ensureInitialized();
        return await this.services.storage.exportData(format);
      }
    };
  }

  // Event Management
  on(event, listener) {
    return super.on(event, listener);
  }
  off(event, listener) {
    return super.off(event, listener);
  }
  emit(event, ...args) {
    return super.emit(event, ...args);
  }

  // Utility Methods
  isInitialized() {
    return this.initialized;
  }
  getConfig() {
    return this.config;
  }
  getServices() {
    return this.services;
  }
  ensureInitialized() {
    if (!this.initialized || !this.services) {
      throw new Error('VC-SDK is not initialized. Call init() first.');
    }
  }

  // Cleanup
  async destroy() {
    if (this.machine) {
      this.machine.stop();
    }
    if (this.services) {
      // Cleanup services
      await Promise.all([this.services.storage.cleanup?.(), this.services.auth.cleanup?.(), this.services.credential.cleanup?.(), this.services.sharing.cleanup?.(), this.services.backup.cleanup?.()]);
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
//# sourceMappingURL=VCSDKCore.js.map