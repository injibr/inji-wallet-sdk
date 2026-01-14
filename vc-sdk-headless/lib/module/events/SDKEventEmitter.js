"use strict";

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

/**
 * Share (OpenID4VP) Events - fired during credential sharing
 */

/**
 * Authentication Events - fired during auth flows
 */

/**
 * Issuer Events - fired during issuer operations
 */

/**
 * Device Events - fired during device operations
 */

/**
 * Notification Events - fired for push notifications
 */

/**
 * General SDK Events
 */

/**
 * Combined event map for type safety
 */

// ========================================================================
// EVENT EMITTER CLASS
// ========================================================================

/**
 * SDKEventEmitter - Type-safe event emitter for vc-sdk-headless
 */
export class SDKEventEmitter extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Emit a credential download started event
   */
  emitCredentialDownloadStarted(credentialType, issuer) {
    this.emit('credential:downloadStarted', {
      credentialType,
      issuer
    });
  }

  /**
   * Emit credential download progress
   */
  emitCredentialDownloadProgress(current, total, progress, currentStep) {
    this.emit('credential:downloadProgress', {
      current,
      total,
      progress,
      currentStep
    });
  }

  /**
   * Emit credential download complete
   */
  emitCredentialDownloadComplete(credential, credentialType, issuer) {
    this.emit('credential:downloadComplete', {
      credential,
      credentialType,
      issuer
    });
  }

  /**
   * Emit credential download error
   */
  emitCredentialDownloadError(error, credentialType, issuer, errorCode) {
    this.emit('credential:downloadError', {
      error,
      errorCode,
      credentialType,
      issuer
    });
  }

  /**
   * Emit credential not available (424 error)
   */
  emitCredentialNotAvailable424(credentialType, issuer, message) {
    this.emit('credential:notAvailable424', {
      credentialType,
      issuer,
      message
    });
  }

  /**
   * Emit credential deleted
   */
  emitCredentialDeleted(credentialId) {
    this.emit('credential:deleted', {
      credentialId
    });
  }

  /**
   * Emit credential list updated
   */
  emitCredentialListUpdated(credentials) {
    this.emit('credential:listUpdated', {
      credentials
    });
  }

  /**
   * Emit share request parsed
   */
  emitShareRequestParsed(verifierInfo, requestedCredentials, authRequest) {
    this.emit('share:requestParsed', {
      verifierInfo,
      requestedCredentials,
      authRequest
    });
  }

  /**
   * Emit share download started
   */
  emitShareDownloadStarted(totalCredentials) {
    this.emit('share:downloadStarted', {
      totalCredentials
    });
  }

  /**
   * Emit share download progress
   */
  emitShareDownloadProgress(current, total, currentItem) {
    this.emit('share:downloadProgress', {
      current,
      total,
      currentItem
    });
  }

  /**
   * Emit share download complete
   */
  emitShareDownloadComplete(successCount, error424Count, realErrorCount) {
    this.emit('share:downloadComplete', {
      successCount,
      error424Count,
      realErrorCount
    });
  }

  /**
   * Emit credential not available during share (424)
   */
  emitShareCredentialNotAvailable424(credentialType, credentialName, issuer) {
    this.emit('share:credentialNotAvailable424', {
      credentialType,
      credentialName,
      issuer
    });
  }

  /**
   * Emit consent required
   */
  emitShareConsentRequired(verifierInfo) {
    this.emit('share:consentRequired', {
      verifierInfo
    });
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
  emitShareSharingProgress(message) {
    this.emit('share:sharingProgress', {
      message
    });
  }

  /**
   * Emit sharing complete
   */
  emitShareSharingComplete(success, protocolNumber, transactionId) {
    this.emit('share:sharingComplete', {
      success,
      protocolNumber,
      transactionId
    });
  }

  /**
   * Emit share error
   */
  emitShareError(error, step) {
    this.emit('share:error', {
      error,
      step
    });
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
  emitAuthRequired(authUrl, reason, issuer) {
    this.emit('auth:required', {
      authUrl,
      issuer,
      reason
    });
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
  emitAuthProgress(message) {
    this.emit('auth:progress', {
      message
    });
  }

  /**
   * Emit authentication complete
   */
  emitAuthComplete(success, token) {
    this.emit('auth:complete', {
      success,
      token
    });
  }

  /**
   * Emit authentication error
   */
  emitAuthError(error, message) {
    this.emit('auth:error', {
      error,
      message
    });
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
  emitIssuerListUpdated(issuers) {
    this.emit('issuer:listUpdated', {
      issuers
    });
  }

  /**
   * Emit issuer selected
   */
  emitIssuerSelected(issuer) {
    this.emit('issuer:selected', {
      issuer
    });
  }

  /**
   * Emit issuer credential types loaded
   */
  emitIssuerCredentialTypesLoaded(issuer, credentialTypes) {
    this.emit('issuer:credentialTypesLoaded', {
      issuer,
      credentialTypes
    });
  }

  /**
   * Emit issuer error
   */
  emitIssuerError(error, issuer) {
    this.emit('issuer:error', {
      error,
      issuer
    });
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
  emitDeviceRegistrationComplete(deviceId, cpf) {
    this.emit('device:registrationComplete', {
      deviceId,
      cpf
    });
  }

  /**
   * Emit device registration error
   */
  emitDeviceRegistrationError(error) {
    this.emit('device:registrationError', {
      error
    });
  }

  /**
   * Emit FCM token updated
   */
  emitDeviceFcmTokenUpdated(token) {
    this.emit('device:fcmTokenUpdated', {
      token
    });
  }

  /**
   * Emit notification received
   */
  emitNotificationReceived(notification, type) {
    this.emit('notification:received', {
      notification,
      type
    });
  }

  /**
   * Emit credential ready notification
   */
  emitNotificationCredentialReady(credentialType, issuer, notificationId) {
    this.emit('notification:credentialReady', {
      credentialType,
      issuer,
      notificationId
    });
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
  emitSDKError(error, context) {
    this.emit('sdk:error', {
      error,
      context
    });
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
//# sourceMappingURL=SDKEventEmitter.js.map