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
import { notificationService } from '../services/NotificationService';
import { SDKEventEmitter, sdkEvents } from '../events';

export interface SDKServices {
  credential: CredentialService;
  storage: StorageService;
  auth: AuthService;
  issuer: IssuerService;
  shareVC: ShareVCService;
}

export class VCSDKCoreHeadless {
  private static instance: VCSDKCoreHeadless;
  private services: SDKServices | null = null;
  private initialized: boolean = false;
  private config: VCSDKConfig | null = null;
  public events: SDKEventEmitter = sdkEvents;

  private constructor() {}

  public static getInstance(): VCSDKCoreHeadless {
    if (!VCSDKCoreHeadless.instance) {
      VCSDKCoreHeadless.instance = new VCSDKCoreHeadless();
    }
    return VCSDKCoreHeadless.instance;
  }

  /**
   * Initialize the SDK with configuration
   */
  async init(config: VCSDKConfig): Promise<void> {
    if (this.initialized) {
      console.warn('[VCSDKHeadless] Already initialized');
      return;
    }

    try {
      console.log('[VCSDKHeadless] Initializing...');

      // Deep merge config with defaults
      const defaultConfig = {
        environment: 'production' as const,
        storage: {
          encrypted: true,
          backup: {
            provider: 'icloud' as const,
            automatic: true,
            schedule: 'daily' as const,
            encryptBackups: true,
          },
        },
        network: {
          baseUrl: 'https://vcdemo.crabdance.com',
          timeout: 30000,
          retries: 3,
        },
      };

      // Build storage config
      const storageConfig: any = {
        encrypted: config.storage?.encrypted !== undefined ? config.storage.encrypted : defaultConfig.storage.encrypted,
      };

      // Build backup config
      if (config.storage?.backup) {
        storageConfig.backup = {
          provider: config.storage.backup.provider || defaultConfig.storage.backup.provider,
          automatic: config.storage.backup.automatic !== undefined ? config.storage.backup.automatic : defaultConfig.storage.backup.automatic,
          schedule: config.storage.backup.schedule || defaultConfig.storage.backup.schedule,
          encryptBackups: config.storage.backup.encryptBackups !== undefined ? config.storage.backup.encryptBackups : defaultConfig.storage.backup.encryptBackups,
        };
      } else {
        storageConfig.backup = defaultConfig.storage.backup;
      }

      // Build network config
      const networkConfig: any = {
        baseUrl: config.network?.baseUrl || defaultConfig.network.baseUrl,
        timeout: config.network?.timeout || defaultConfig.network.timeout,
        retries: config.network?.retries || defaultConfig.network.retries,
      };

      if (config.network?.notificationBaseUrl) {
        networkConfig.notificationBaseUrl = config.network.notificationBaseUrl;
      }

      if (config.network?.oauth) {
        networkConfig.oauth = config.network.oauth;
      }

      this.config = {
        appId: config.appId,
        environment: config.environment || defaultConfig.environment,
        storage: storageConfig,
        network: networkConfig,
      };

      // Configure notification service with base URL from config
      if (this.config.network?.notificationBaseUrl) {
        notificationService.setNotificationBaseUrl(this.config.network.notificationBaseUrl);
        console.log('[VCSDKHeadless] Notification service configured');
      }

      await this.initializeServices(this.config);
      await this.setupSecurity();

      this.initialized = true;
      this.events.emitSDKInitialized();
      this.events.emitSDKReady();

      console.log('[VCSDKHeadless] Initialized successfully');
    } catch (error) {
      console.error('[VCSDKHeadless] Initialization failed:', error);
      this.events.emitSDKError(error as Error, 'initialization');
      throw error;
    }
  }

  private async initializeServices(config: VCSDKConfig): Promise<void> {
    this.services = {
      storage: new StorageService(config),
      auth: new AuthService(config),
      credential: new CredentialService(config),
      issuer: new IssuerService(config),
      shareVC: new ShareVCService(config),
    };

    // Initialize services in dependency order
    await this.services.storage.init();
    await this.services.auth.init(this.services.storage);
    await this.services.issuer.init();
    await this.services.credential.init(this.services.storage, this.services.auth);
  }

  private async setupSecurity(): Promise<void> {
    if (!this.services) {
      throw new Error('Services not initialized');
    }

    // Initialize hardware keystore
    await this.services.storage.setupEncryption();
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.services) {
      throw new Error('VC-SDK not initialized. Call init() first.');
    }
  }

  /**
   * Get the current SDK configuration
   * Returns null if SDK is not initialized
   */
  public getConfig(): VCSDKConfig | null {
    return this.config;
  }

  // =========================================================================
  // PUBLIC API - CREDENTIAL MANAGEMENT
  // =========================================================================

  public get credentials() {
    return {
      /**
       * Download a credential from an issuer
       * Emits: credential:downloadStarted, credential:downloadProgress,
       *        credential:downloadComplete, credential:downloadError,
       *        credential:notAvailable424, auth:required
       */
      download: async (issuer: any, credentialType: any, accessToken?: string): Promise<VC | null> => {
        this.ensureInitialized();

        try {
          console.log('[VCSDKHeadless] Starting credential download');
          this.events.emitCredentialDownloadStarted(credentialType, issuer);

          const credential = await this.services!.credential.requestAndDownload(
            issuer,
            credentialType,
            (progress: string) => {
              this.events.emitCredentialDownloadProgress(0, 100, 50, progress);
            },
            accessToken
          );

          this.events.emitCredentialDownloadComplete(credential, credentialType, issuer);
          this.events.emitCredentialListUpdated(await this.services!.credential.getAll());

          return credential;
        } catch (error: any) {
          console.error('[VCSDKHeadless] Download error:', error);

          // Check for 424 error
          if (error.message === 'CREDENTIAL_NOT_AVAILABLE_424' || error.statusCode === 424) {
            this.events.emitCredentialNotAvailable424(
              credentialType,
              issuer,
              'Provider does not have this credential'
            );
            return null;
          }

          // Check for auth error
          if (
            error.message?.includes('401') ||
            error.message?.includes('invalid_token') ||
            error.message?.includes('expired') ||
            error.message?.includes('No access token')
          ) {
            // Emit auth required event - host app should handle authentication
            this.events.emitAuthRequired('', 'download', issuer);
            return null;
          }

          this.events.emitCredentialDownloadError(error, credentialType, issuer, error.statusCode);
          throw error;
        }
      },

      /**
       * Get all credentials
       */
      getAll: async (): Promise<VC[]> => {
        this.ensureInitialized();
        return await this.services!.credential.getAll();
      },

      /**
       * Get a single credential by ID
       */
      get: async (credentialId: string): Promise<VC | null> => {
        this.ensureInitialized();
        return await this.services!.credential.getCredential(credentialId);
      },

      /**
       * Delete a credential
       * Emits: credential:deleted, credential:listUpdated
       */
      delete: async (credentialId: string): Promise<boolean> => {
        this.ensureInitialized();

        try {
          const success = await this.services!.credential.deleteCredential(credentialId);
          if (success) {
            this.events.emitCredentialDeleted(credentialId);
            this.events.emitCredentialListUpdated(await this.services!.credential.getAll());
          }
          return success;
        } catch (error) {
          console.error('[VCSDKHeadless] Delete error:', error);
          this.events.emitSDKError(error as Error, 'credential:delete');
          throw error;
        }
      },
    };
  }

  // =========================================================================
  // PUBLIC API - ISSUER MANAGEMENT
  // =========================================================================

  public get issuers() {
    return {
      /**
       * Get all issuers
       * Emits: issuer:listUpdated
       */
      getAll: async (): Promise<any[]> => {
        this.ensureInitialized();

        try {
          const issuers = this.services!.issuer.getAllTrustedIssuers();
          this.events.emitIssuerListUpdated(issuers);
          return issuers;
        } catch (error) {
          console.error('[VCSDKHeadless] Get issuers error:', error);
          this.events.emitIssuerError(error as Error);
          throw error;
        }
      },

      /**
       * Get credential types for an issuer
       * Emits: issuer:credentialTypesLoaded
       */
      getCredentialTypes: async (issuerId: string): Promise<any[]> => {
        this.ensureInitialized();

        try {
          const credTypes = await this.services!.issuer.getCredentialTypes(issuerId);
          const issuer = await this.services!.issuer.getIssuerById(issuerId);
          this.events.emitIssuerCredentialTypesLoaded(issuer, credTypes);
          return credTypes;
        } catch (error) {
          console.error('[VCSDKHeadless] Get credential types error:', error);
          this.events.emitIssuerError(error as Error);
          throw error;
        }
      },

      /**
       * Get a single issuer by ID
       */
      get: async (issuerId: string): Promise<any> => {
        this.ensureInitialized();
        return await this.services!.issuer.getIssuerById(issuerId);
      },
    };
  }

  // =========================================================================
  // PUBLIC API - AUTHENTICATION
  // =========================================================================

  public get auth() {
    return {
      /**
       * Get authorization URL for authentication
       * Note: In headless SDK, the host app should handle authentication
       */
      getAuthUrl: async (): Promise<string> => {
        this.ensureInitialized();
        throw new Error('getAuthUrl not implemented in headless SDK - host app should handle authentication');
      },

      /**
       * Complete authentication with token
       * Call this after user completes WebView authentication
       * Emits: auth:complete, auth:error
       */
      completeAuthentication: async (token: string): Promise<void> => {
        this.ensureInitialized();

        try {
          this.events.emitAuthStarted();
          await this.services!.auth.handleAuthCallback(token);
          this.events.emitAuthComplete(true, token);
        } catch (error) {
          console.error('[VCSDKHeadless] Auth completion error:', error);
          this.events.emitAuthError(error as Error, (error as Error).message);
          throw error;
        }
      },

      /**
       * Check if user is authenticated
       */
      isAuthenticated: async (): Promise<boolean> => {
        this.ensureInitialized();
        return await this.services!.auth.isAuthenticated();
      },

      /**
       * Logout
       * Emits: auth:logout
       */
      logout: async (): Promise<void> => {
        this.ensureInitialized();
        await this.services!.auth.logout();
        this.events.emitAuthLogout();
      },
    };
  }

  // =========================================================================
  // PUBLIC API - SHARE VC (OpenID4VP)
  // =========================================================================

  public get share() {
    return {
      /**
       * Parse a share request URL
       * Emits: share:requestParsed, share:error
       */
      parseRequest: async (shareUrl: string): Promise<{
        verifierInfo: any;
        requestedCredentials: any[];
        authRequest: any;
      }> => {
        this.ensureInitialized();

        try {
          console.log('[VCSDKHeadless] Parsing share request');

          const authRequest = await this.services!.shareVC.parseAuthorizationRequest(shareUrl);
          const verifierInfo = this.services!.shareVC.getVerifierInfo(authRequest);

          // Match requested credentials with issuers
          const inputDescriptors = authRequest.presentation_definition?.input_descriptors || [];
          const requestedPatterns = inputDescriptors.map((descriptor: any) => {
            const typeConstraint = descriptor.constraints?.fields?.find((f: any) =>
              f.path?.includes('$.type')
            );
            return {
              inputDescriptorId: descriptor.id,
              pattern: typeConstraint?.filter?.pattern || descriptor.id,
            };
          });

          const allIssuers = this.services!.issuer.getAllTrustedIssuers();
          const matchedCredentials: any[] = [];

          for (const pattern of requestedPatterns) {
            for (const issuer of allIssuers) {
              const credTypes = await this.services!.issuer.getCredentialTypes(issuer.id);

              for (const credType of credTypes) {
                const credTypeId = credType.id || '';
                const credTypeName = credType.name || '';

                // Simple matching logic
                if (credTypeId.includes(pattern.pattern) || pattern.pattern.includes(credTypeId)) {
                  const displayLogo = credType.display?.[0]?.logo?.url;

                  matchedCredentials.push({
                    inputDescriptorId: pattern.inputDescriptorId,
                    type: pattern.pattern,
                    credentialTypeId: credTypeId,
                    name: credTypeName,
                    system: issuer.name,
                    issuerId: issuer.id,
                    logoUrl: displayLogo,
                  });
                  break;
                }
              }
            }
          }

          const result = {
            verifierInfo,
            requestedCredentials: matchedCredentials,
            authRequest,
          };

          this.events.emitShareRequestParsed(verifierInfo, matchedCredentials, authRequest);

          return result;
        } catch (error) {
          console.error('[VCSDKHeadless] Parse request error:', error);
          this.events.emitShareError(error as Error, 'parse');
          throw error;
        }
      },

      /**
       * Download missing credentials for sharing
       * Emits: share:downloadStarted, share:downloadProgress, share:downloadComplete,
       *        share:credentialNotAvailable424, auth:required
       */
      downloadCredentials: async (requestedCredentials: any[]): Promise<{
        successCount: number;
        error424Count: number;
        realErrorCount: number;
      }> => {
        this.ensureInitialized();

        try {
          console.log('[VCSDKHeadless] Downloading credentials for share');
          this.events.emitShareDownloadStarted(requestedCredentials.length);

          // Delete all existing credentials first
          const existingCreds = await this.services!.credential.getAll();
          for (const cred of existingCreds) {
            await this.services!.credential.deleteCredential(cred.id);
          }

          let successCount = 0;
          let error424Count = 0;
          let realErrorCount = 0;

          for (let i = 0; i < requestedCredentials.length; i++) {
            const credType = requestedCredentials[i];

            this.events.emitShareDownloadProgress(i + 1, requestedCredentials.length, credType.name);

            try {
              const issuer = await this.services!.issuer.getIssuerById(credType.issuerId);
              const credTypes = await this.services!.issuer.getCredentialTypes(issuer.id);
              const matchingCredType = credTypes.find((ct: any) => ct.id === credType.credentialTypeId);

              if (!matchingCredType) {
                throw new Error(`Credential type not found: ${credType.credentialTypeId}`);
              }

              await this.services!.credential.requestAndDownload(issuer, matchingCredType);
              successCount++;
            } catch (error: any) {
              console.error('[VCSDKHeadless] Download error:', error);

              // Check for 424
              if (error.message === 'CREDENTIAL_NOT_AVAILABLE_424' || error.statusCode === 424) {
                console.log('[VCSDKHeadless] 424 error - credential not available');
                this.events.emitShareCredentialNotAvailable424(
                  credType.credentialTypeId,
                  credType.name,
                  credType.system
                );
                error424Count++;
                continue;
              }

              // Check for auth error
              if (
                error.message?.includes('401') ||
                error.message?.includes('invalid_token') ||
                error.message?.includes('No access token')
              ) {
                // Emit auth required event - host app should handle authentication
                this.events.emitAuthRequired('', 'share');
                throw error;
              }

              realErrorCount++;
            }
          }

          const result = { successCount, error424Count, realErrorCount };
          this.events.emitShareDownloadComplete(successCount, error424Count, realErrorCount);

          return result;
        } catch (error) {
          console.error('[VCSDKHeadless] Download credentials error:', error);
          this.events.emitShareError(error as Error, 'download');
          throw error;
        }
      },

      /**
       * Complete the share flow after user grants consent
       * Emits: share:sharingStarted, share:sharingProgress, share:sharingComplete, share:error
       */
      completeShare: async (authRequest: any, requestedCredentials: any[]): Promise<{
        success: boolean;
        protocolNumber?: string;
      }> => {
        this.ensureInitialized();

        try {
          console.log('[VCSDKHeadless] Completing share');
          this.events.emitShareSharingStarted();

          // Get all downloaded credentials
          const allCredentials = await this.services!.credential.getAll();

          // Filter credentials that match requested types
          const credentialsToShare = requestedCredentials
            .map((rc: any) => {
              const cred = allCredentials.find((c: VC) => {
                const credTypeId = c.metadata?.credentialType?.id || '';
                const vcTypes = c.type || [];

                const matchById =
                  credTypeId === rc.type || credTypeId.includes(rc.type) || rc.type.includes(credTypeId);

                const matchByType = vcTypes.some(
                  (t: string) => t === rc.type || t.includes(rc.type) || rc.type.includes(t)
                );

                return matchById || matchByType;
              });

              return cred;
            })
            .filter(Boolean) as VC[];

          if (credentialsToShare.length === 0) {
            throw new Error('No credentials available to share');
          }

          this.events.emitShareSharingProgress('Matching credentials...');

          // Match credentials with presentation definition
          const matchedCreds = await this.services!.shareVC.matchCredentials(
            authRequest.presentation_definition,
            credentialsToShare
          );

          this.events.emitShareSharingProgress('Creating verifiable presentation...');

          // Construct verifiable presentation
          const vp = await this.services!.shareVC.constructVerifiablePresentation(matchedCreds, authRequest);

          this.events.emitShareSharingProgress('Sending to verifier...');

          // Send verifiable presentation
          const result = await this.services!.shareVC.sendVerifiablePresentation(vp, authRequest);

          if (result.success) {
            const protocolNumber = result.transactionId || result.id || authRequest.state || '';
            this.events.emitShareSharingComplete(true, protocolNumber, result.transactionId);
            return { success: true, protocolNumber };
          } else {
            throw new Error(result.error || 'Share failed');
          }
        } catch (error) {
          console.error('[VCSDKHeadless] Complete share error:', error);
          this.events.emitShareError(error as Error, 'sharing');
          throw error;
        }
      },

      /**
       * Decline sharing (user cancelled)
       * Emits: share:userDeclined
       */
      declineShare: () => {
        this.events.emitShareUserDeclined();
      },
    };
  }

  // =========================================================================
  // PUBLIC API - DEVICE REGISTRATION
  // =========================================================================

  public get device() {
    return {
      /**
       * Register device with CPF and FCM token
       * Emits: device:registrationStarted, device:registrationComplete, device:registrationError
       */
      register: async (cpf: string, fcmToken: string): Promise<void> => {
        this.ensureInitialized();

        try {
          console.log('[VCSDKHeadless] Registering device');
          this.events.emitDeviceRegistrationStarted();

          await notificationService.registerDevice(cpf, fcmToken);

          this.events.emitDeviceRegistrationComplete('device-id', cpf);
          this.events.emitDeviceFcmTokenUpdated(fcmToken);
        } catch (error) {
          console.error('[VCSDKHeadless] Device registration error:', error);
          this.events.emitDeviceRegistrationError(error as Error);
          throw error;
        }
      },
    };
  }

  // =========================================================================
  // PUBLIC API - NOTIFICATIONS
  // =========================================================================

  public get notifications() {
    return {
      /**
       * Handle incoming notification
       * Emits: notification:received, notification:credentialReady
       */
      handleNotification: (notification: any) => {
        console.log('[VCSDKHeadless] Handling notification:', notification);
        this.events.emitNotificationReceived(notification, notification.type || 'unknown');

        // Check if it's a credential ready notification
        if (notification.type === 'credential_ready') {
          this.events.emitNotificationCredentialReady(
            notification.credentialType || '',
            notification.issuer || '',
            notification.id || ''
          );
        }
      },
    };
  }
}

/**
 * Export singleton instance
 */
export const VCSDK = VCSDKCoreHeadless.getInstance();
