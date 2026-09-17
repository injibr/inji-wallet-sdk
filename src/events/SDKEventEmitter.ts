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

  emitCredentialDownloadStarted(credentialType: any, issuer: any) {
    this.emit('credential:downloadStarted', { credentialType, issuer });
  }

  emitCredentialDownloadProgress(current: number, total: number, progress: number, currentStep: string) {
    this.emit('credential:downloadProgress', { current, total, progress, currentStep });
  }

  emitCredentialDownloadComplete(credential: any, credentialType: any, issuer: any) {
    this.emit('credential:downloadComplete', { credential, credentialType, issuer });
  }

  emitCredentialDownloadError(error: Error, credentialType: any, issuer: any, errorCode?: number) {
    this.emit('credential:downloadError', { error, errorCode, credentialType, issuer });
  }

  emitCredentialNotAvailable424(credentialType: any, issuer: any, message: string) {
    this.emit('credential:notAvailable424', { credentialType, issuer, message });
  }

  emitCredentialDeleted(credentialId: string) {
    this.emit('credential:deleted', { credentialId });
  }

  emitCredentialListUpdated(credentials: any[]) {
    this.emit('credential:listUpdated', { credentials });
  }

  emitShareRequestParsed(verifierInfo: any, requestedCredentials: any[], authRequest: any) {
    this.emit('share:requestParsed', { verifierInfo, requestedCredentials, authRequest });
  }

  emitShareDownloadStarted(totalCredentials: number) {
    this.emit('share:downloadStarted', { totalCredentials });
  }

  emitShareDownloadProgress(current: number, total: number, currentItem: string) {
    this.emit('share:downloadProgress', { current, total, currentItem });
  }

  emitShareDownloadComplete(successCount: number, error424Count: number, realErrorCount: number) {
    this.emit('share:downloadComplete', { successCount, error424Count, realErrorCount });
  }

  emitShareCredentialNotAvailable424(credentialType: string, credentialName: string, issuer: string) {
    this.emit('share:credentialNotAvailable424', { credentialType, credentialName, issuer });
  }

  emitShareConsentRequired(verifierInfo: any) {
    this.emit('share:consentRequired', { verifierInfo });
  }

  emitShareSharingStarted() {
    this.emit('share:sharingStarted');
  }

  emitShareSharingProgress(message: string) {
    this.emit('share:sharingProgress', { message });
  }

  emitShareSharingComplete(success: boolean, protocolNumber?: string, transactionId?: string) {
    this.emit('share:sharingComplete', { success, protocolNumber, transactionId });
  }

  emitShareError(error: Error, step: 'parse' | 'download' | 'consent' | 'sharing') {
    this.emit('share:error', { error, step });
  }

  emitShareUserDeclined() {
    this.emit('share:userDeclined');
  }

  emitAuthRequired(authUrl: string, reason: 'download' | 'share' | 'general', issuer?: any) {
    this.emit('auth:required', { authUrl, issuer, reason });
  }

  emitAuthStarted() {
    this.emit('auth:started');
  }

  emitAuthProgress(message: string) {
    this.emit('auth:progress', { message });
  }

  emitAuthComplete(success: boolean, token?: string) {
    this.emit('auth:complete', { success, token });
  }

  emitAuthError(error: Error, message: string) {
    this.emit('auth:error', { error, message });
  }

  emitAuthSessionExpired() {
    this.emit('auth:sessionExpired');
  }

  emitAuthLogout() {
    this.emit('auth:logout');
  }

  emitIssuerListUpdated(issuers: any[]) {
    this.emit('issuer:listUpdated', { issuers });
  }

  emitIssuerSelected(issuer: any) {
    this.emit('issuer:selected', { issuer });
  }

  emitIssuerCredentialTypesLoaded(issuer: any, credentialTypes: any[]) {
    this.emit('issuer:credentialTypesLoaded', { issuer, credentialTypes });
  }

  emitIssuerError(error: Error, issuer?: any) {
    this.emit('issuer:error', { error, issuer });
  }

  emitDeviceRegistrationStarted() {
    this.emit('device:registrationStarted');
  }

  emitDeviceRegistrationComplete(deviceId: string, cpf: string) {
    this.emit('device:registrationComplete', { deviceId, cpf });
  }

  emitDeviceRegistrationError(error: Error) {
    this.emit('device:registrationError', { error });
  }

  emitDeviceFcmTokenUpdated(token: string) {
    this.emit('device:fcmTokenUpdated', { token });
  }

  emitNotificationReceived(notification: any, type: string) {
    this.emit('notification:received', { notification, type });
  }

  emitNotificationCredentialReady(credentialType: string, issuer: string, notificationId: string) {
    this.emit('notification:credentialReady', { credentialType, issuer, notificationId });
  }

  emitSDKInitialized() {
    this.emit('sdk:initialized');
  }

  emitSDKError(error: Error, context: string) {
    this.emit('sdk:error', { error, context });
  }

  emitSDKReady() {
    this.emit('sdk:ready');
  }
}

/**
 * Create a singleton instance
 */
export const sdkEvents = new SDKEventEmitter();
