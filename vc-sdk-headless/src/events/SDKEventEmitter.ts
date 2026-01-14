/**
 * SDKEventEmitter - Central event system for vc-sdk-headless
 *
 * Provides event-based API for all SDK operations including:
 * - Credential download/upload/delete
 * - Credential sharing (OpenID4VP)
 * - Authentication flows
 * - Error handling
 * - Device registration
 * - Notifications
 */

import EventEmitter from 'eventemitter3';

// ========================================================================
// EVENT TYPE DEFINITIONS
// ========================================================================

/**
 * Credential Events - fired during credential operations
 */
export interface CredentialEvents {
  // Download events
  'credential:downloadStarted': (data: {
    credentialType: any;
    issuer: any;
  }) => void;

  'credential:downloadProgress': (data: {
    current: number;
    total: number;
    progress: number; // 0-100
    currentStep: string;
  }) => void;

  'credential:downloadComplete': (data: {
    credential: any;
    credentialType: any;
    issuer: any;
  }) => void;

  'credential:downloadError': (data: {
    error: Error;
    errorCode?: number;
    credentialType: any;
    issuer: any;
  }) => void;

  'credential:notAvailable424': (data: {
    credentialType: any;
    issuer: any;
    message: string;
  }) => void;

  // Delete events
  'credential:deleted': (data: {
    credentialId: string;
  }) => void;

  // List events
  'credential:listUpdated': (data: {
    credentials: any[];
  }) => void;
}

/**
 * Share (OpenID4VP) Events - fired during credential sharing
 */
export interface ShareEvents {
  // Parse request
  'share:requestParsed': (data: {
    verifierInfo: {
      name: string;
      clientId?: string;
      logoUri?: string;
    };
    requestedCredentials: Array<{
      inputDescriptorId: string;
      type: string;
      credentialTypeId?: string;
      name: string;
      system?: string;
      issuerId?: string;
      logoUrl?: string;
    }>;
    authRequest: any;
  }) => void;

  // Download missing credentials for share
  'share:downloadStarted': (data: {
    totalCredentials: number;
  }) => void;

  'share:downloadProgress': (data: {
    current: number;
    total: number;
    currentItem: string;
  }) => void;

  'share:downloadComplete': (data: {
    successCount: number;
    error424Count: number;
    realErrorCount: number;
  }) => void;

  'share:credentialNotAvailable424': (data: {
    credentialType: string;
    credentialName: string;
    issuer: string;
  }) => void;

  // Consent
  'share:consentRequired': (data: {
    verifierInfo: {
      name: string;
      clientId?: string;
      logoUri?: string;
    };
  }) => void;

  // Sharing
  'share:sharingStarted': () => void;

  'share:sharingProgress': (data: {
    message: string;
  }) => void;

  'share:sharingComplete': (data: {
    success: boolean;
    protocolNumber?: string;
    transactionId?: string;
  }) => void;

  'share:error': (data: {
    error: Error;
    step: 'parse' | 'download' | 'consent' | 'sharing';
  }) => void;

  // User actions
  'share:userDeclined': () => void;
}

/**
 * Authentication Events - fired during auth flows
 */
export interface AuthEvents {
  // Auth required
  'auth:required': (data: {
    authUrl: string;
    issuer?: any;
    reason: 'download' | 'share' | 'general';
  }) => void;

  // Auth status
  'auth:started': () => void;

  'auth:progress': (data: {
    message: string;
  }) => void;

  'auth:complete': (data: {
    success: boolean;
    token?: string;
  }) => void;

  'auth:error': (data: {
    error: Error;
    message: string;
  }) => void;

  // Session
  'auth:sessionExpired': () => void;

  'auth:logout': () => void;
}

/**
 * Issuer Events - fired during issuer operations
 */
export interface IssuerEvents {
  'issuer:listUpdated': (data: {
    issuers: any[];
  }) => void;

  'issuer:selected': (data: {
    issuer: any;
  }) => void;

  'issuer:credentialTypesLoaded': (data: {
    issuer: any;
    credentialTypes: any[];
  }) => void;

  'issuer:error': (data: {
    error: Error;
    issuer?: any;
  }) => void;
}

/**
 * Device Events - fired during device operations
 */
export interface DeviceEvents {
  'device:registrationStarted': () => void;

  'device:registrationComplete': (data: {
    deviceId: string;
    cpf: string;
  }) => void;

  'device:registrationError': (data: {
    error: Error;
  }) => void;

  'device:fcmTokenUpdated': (data: {
    token: string;
  }) => void;
}

/**
 * Notification Events - fired for push notifications
 */
export interface NotificationEvents {
  'notification:received': (data: {
    notification: any;
    type: string;
  }) => void;

  'notification:credentialReady': (data: {
    credentialType: string;
    issuer: string;
    notificationId: string;
  }) => void;
}

/**
 * General SDK Events
 */
export interface SDKEvents {
  'sdk:initialized': () => void;

  'sdk:error': (data: {
    error: Error;
    context: string;
  }) => void;

  'sdk:ready': () => void;
}

/**
 * Combined event map for type safety
 */
export type AllEvents =
  & CredentialEvents
  & ShareEvents
  & AuthEvents
  & IssuerEvents
  & DeviceEvents
  & NotificationEvents
  & SDKEvents;

// ========================================================================
// EVENT EMITTER CLASS
// ========================================================================

/**
 * SDKEventEmitter - Type-safe event emitter for vc-sdk-headless
 */
export class SDKEventEmitter extends EventEmitter<AllEvents> {
  constructor() {
    super();
  }

  /**
   * Emit a credential download started event
   */
  emitCredentialDownloadStarted(credentialType: any, issuer: any) {
    this.emit('credential:downloadStarted', { credentialType, issuer });
  }

  /**
   * Emit credential download progress
   */
  emitCredentialDownloadProgress(current: number, total: number, progress: number, currentStep: string) {
    this.emit('credential:downloadProgress', { current, total, progress, currentStep });
  }

  /**
   * Emit credential download complete
   */
  emitCredentialDownloadComplete(credential: any, credentialType: any, issuer: any) {
    this.emit('credential:downloadComplete', { credential, credentialType, issuer });
  }

  /**
   * Emit credential download error
   */
  emitCredentialDownloadError(error: Error, credentialType: any, issuer: any, errorCode?: number) {
    this.emit('credential:downloadError', { error, errorCode, credentialType, issuer });
  }

  /**
   * Emit credential not available (424 error)
   */
  emitCredentialNotAvailable424(credentialType: any, issuer: any, message: string) {
    this.emit('credential:notAvailable424', { credentialType, issuer, message });
  }

  /**
   * Emit credential deleted
   */
  emitCredentialDeleted(credentialId: string) {
    this.emit('credential:deleted', { credentialId });
  }

  /**
   * Emit credential list updated
   */
  emitCredentialListUpdated(credentials: any[]) {
    this.emit('credential:listUpdated', { credentials });
  }

  /**
   * Emit share request parsed
   */
  emitShareRequestParsed(verifierInfo: any, requestedCredentials: any[], authRequest: any) {
    this.emit('share:requestParsed', { verifierInfo, requestedCredentials, authRequest });
  }

  /**
   * Emit share download started
   */
  emitShareDownloadStarted(totalCredentials: number) {
    this.emit('share:downloadStarted', { totalCredentials });
  }

  /**
   * Emit share download progress
   */
  emitShareDownloadProgress(current: number, total: number, currentItem: string) {
    this.emit('share:downloadProgress', { current, total, currentItem });
  }

  /**
   * Emit share download complete
   */
  emitShareDownloadComplete(successCount: number, error424Count: number, realErrorCount: number) {
    this.emit('share:downloadComplete', { successCount, error424Count, realErrorCount });
  }

  /**
   * Emit credential not available during share (424)
   */
  emitShareCredentialNotAvailable424(credentialType: string, credentialName: string, issuer: string) {
    this.emit('share:credentialNotAvailable424', { credentialType, credentialName, issuer });
  }

  /**
   * Emit consent required
   */
  emitShareConsentRequired(verifierInfo: any) {
    this.emit('share:consentRequired', { verifierInfo });
  }

  /**
   * Emit sharing started
   */
  emitShareSharingStarted() {
    this.emit('share:sharingStarted');
  }

  /**
   * Emit sharing progress
   */
  emitShareSharingProgress(message: string) {
    this.emit('share:sharingProgress', { message });
  }

  /**
   * Emit sharing complete
   */
  emitShareSharingComplete(success: boolean, protocolNumber?: string, transactionId?: string) {
    this.emit('share:sharingComplete', { success, protocolNumber, transactionId });
  }

  /**
   * Emit share error
   */
  emitShareError(error: Error, step: 'parse' | 'download' | 'consent' | 'sharing') {
    this.emit('share:error', { error, step });
  }

  /**
   * Emit user declined sharing
   */
  emitShareUserDeclined() {
    this.emit('share:userDeclined');
  }

  /**
   * Emit authentication required
   */
  emitAuthRequired(authUrl: string, reason: 'download' | 'share' | 'general', issuer?: any) {
    this.emit('auth:required', { authUrl, issuer, reason });
  }

  /**
   * Emit authentication started
   */
  emitAuthStarted() {
    this.emit('auth:started');
  }

  /**
   * Emit authentication progress
   */
  emitAuthProgress(message: string) {
    this.emit('auth:progress', { message });
  }

  /**
   * Emit authentication complete
   */
  emitAuthComplete(success: boolean, token?: string) {
    this.emit('auth:complete', { success, token });
  }

  /**
   * Emit authentication error
   */
  emitAuthError(error: Error, message: string) {
    this.emit('auth:error', { error, message });
  }

  /**
   * Emit session expired
   */
  emitAuthSessionExpired() {
    this.emit('auth:sessionExpired');
  }

  /**
   * Emit logout
   */
  emitAuthLogout() {
    this.emit('auth:logout');
  }

  /**
   * Emit issuer list updated
   */
  emitIssuerListUpdated(issuers: any[]) {
    this.emit('issuer:listUpdated', { issuers });
  }

  /**
   * Emit issuer selected
   */
  emitIssuerSelected(issuer: any) {
    this.emit('issuer:selected', { issuer });
  }

  /**
   * Emit issuer credential types loaded
   */
  emitIssuerCredentialTypesLoaded(issuer: any, credentialTypes: any[]) {
    this.emit('issuer:credentialTypesLoaded', { issuer, credentialTypes });
  }

  /**
   * Emit issuer error
   */
  emitIssuerError(error: Error, issuer?: any) {
    this.emit('issuer:error', { error, issuer });
  }

  /**
   * Emit device registration started
   */
  emitDeviceRegistrationStarted() {
    this.emit('device:registrationStarted');
  }

  /**
   * Emit device registration complete
   */
  emitDeviceRegistrationComplete(deviceId: string, cpf: string) {
    this.emit('device:registrationComplete', { deviceId, cpf });
  }

  /**
   * Emit device registration error
   */
  emitDeviceRegistrationError(error: Error) {
    this.emit('device:registrationError', { error });
  }

  /**
   * Emit FCM token updated
   */
  emitDeviceFcmTokenUpdated(token: string) {
    this.emit('device:fcmTokenUpdated', { token });
  }

  /**
   * Emit notification received
   */
  emitNotificationReceived(notification: any, type: string) {
    this.emit('notification:received', { notification, type });
  }

  /**
   * Emit credential ready notification
   */
  emitNotificationCredentialReady(credentialType: string, issuer: string, notificationId: string) {
    this.emit('notification:credentialReady', { credentialType, issuer, notificationId });
  }

  /**
   * Emit SDK initialized
   */
  emitSDKInitialized() {
    this.emit('sdk:initialized');
  }

  /**
   * Emit SDK error
   */
  emitSDKError(error: Error, context: string) {
    this.emit('sdk:error', { error, context });
  }

  /**
   * Emit SDK ready
   */
  emitSDKReady() {
    this.emit('sdk:ready');
  }
}

/**
 * Create a singleton instance
 */
export const sdkEvents = new SDKEventEmitter();
