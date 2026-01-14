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
/**
 * Credential Events - fired during credential operations
 */
export interface CredentialEvents {
    'credential:downloadStarted': (data: {
        credentialType: any;
        issuer: any;
    }) => void;
    'credential:downloadProgress': (data: {
        current: number;
        total: number;
        progress: number;
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
    'credential:deleted': (data: {
        credentialId: string;
    }) => void;
    'credential:listUpdated': (data: {
        credentials: any[];
    }) => void;
}
/**
 * Share (OpenID4VP) Events - fired during credential sharing
 */
export interface ShareEvents {
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
    'share:consentRequired': (data: {
        verifierInfo: {
            name: string;
            clientId?: string;
            logoUri?: string;
        };
    }) => void;
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
    'share:userDeclined': () => void;
}
/**
 * Authentication Events - fired during auth flows
 */
export interface AuthEvents {
    'auth:required': (data: {
        authUrl: string;
        issuer?: any;
        reason: 'download' | 'share' | 'general';
    }) => void;
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
export type AllEvents = CredentialEvents & ShareEvents & AuthEvents & IssuerEvents & DeviceEvents & NotificationEvents & SDKEvents;
/**
 * SDKEventEmitter - Type-safe event emitter for vc-sdk-headless
 */
export declare class SDKEventEmitter extends EventEmitter<AllEvents> {
    constructor();
    /**
     * Emit a credential download started event
     */
    emitCredentialDownloadStarted(credentialType: any, issuer: any): void;
    /**
     * Emit credential download progress
     */
    emitCredentialDownloadProgress(current: number, total: number, progress: number, currentStep: string): void;
    /**
     * Emit credential download complete
     */
    emitCredentialDownloadComplete(credential: any, credentialType: any, issuer: any): void;
    /**
     * Emit credential download error
     */
    emitCredentialDownloadError(error: Error, credentialType: any, issuer: any, errorCode?: number): void;
    /**
     * Emit credential not available (424 error)
     */
    emitCredentialNotAvailable424(credentialType: any, issuer: any, message: string): void;
    /**
     * Emit credential deleted
     */
    emitCredentialDeleted(credentialId: string): void;
    /**
     * Emit credential list updated
     */
    emitCredentialListUpdated(credentials: any[]): void;
    /**
     * Emit share request parsed
     */
    emitShareRequestParsed(verifierInfo: any, requestedCredentials: any[], authRequest: any): void;
    /**
     * Emit share download started
     */
    emitShareDownloadStarted(totalCredentials: number): void;
    /**
     * Emit share download progress
     */
    emitShareDownloadProgress(current: number, total: number, currentItem: string): void;
    /**
     * Emit share download complete
     */
    emitShareDownloadComplete(successCount: number, error424Count: number, realErrorCount: number): void;
    /**
     * Emit credential not available during share (424)
     */
    emitShareCredentialNotAvailable424(credentialType: string, credentialName: string, issuer: string): void;
    /**
     * Emit consent required
     */
    emitShareConsentRequired(verifierInfo: any): void;
    /**
     * Emit sharing started
     */
    emitShareSharingStarted(): void;
    /**
     * Emit sharing progress
     */
    emitShareSharingProgress(message: string): void;
    /**
     * Emit sharing complete
     */
    emitShareSharingComplete(success: boolean, protocolNumber?: string, transactionId?: string): void;
    /**
     * Emit share error
     */
    emitShareError(error: Error, step: 'parse' | 'download' | 'consent' | 'sharing'): void;
    /**
     * Emit user declined sharing
     */
    emitShareUserDeclined(): void;
    /**
     * Emit authentication required
     */
    emitAuthRequired(authUrl: string, reason: 'download' | 'share' | 'general', issuer?: any): void;
    /**
     * Emit authentication started
     */
    emitAuthStarted(): void;
    /**
     * Emit authentication progress
     */
    emitAuthProgress(message: string): void;
    /**
     * Emit authentication complete
     */
    emitAuthComplete(success: boolean, token?: string): void;
    /**
     * Emit authentication error
     */
    emitAuthError(error: Error, message: string): void;
    /**
     * Emit session expired
     */
    emitAuthSessionExpired(): void;
    /**
     * Emit logout
     */
    emitAuthLogout(): void;
    /**
     * Emit issuer list updated
     */
    emitIssuerListUpdated(issuers: any[]): void;
    /**
     * Emit issuer selected
     */
    emitIssuerSelected(issuer: any): void;
    /**
     * Emit issuer credential types loaded
     */
    emitIssuerCredentialTypesLoaded(issuer: any, credentialTypes: any[]): void;
    /**
     * Emit issuer error
     */
    emitIssuerError(error: Error, issuer?: any): void;
    /**
     * Emit device registration started
     */
    emitDeviceRegistrationStarted(): void;
    /**
     * Emit device registration complete
     */
    emitDeviceRegistrationComplete(deviceId: string, cpf: string): void;
    /**
     * Emit device registration error
     */
    emitDeviceRegistrationError(error: Error): void;
    /**
     * Emit FCM token updated
     */
    emitDeviceFcmTokenUpdated(token: string): void;
    /**
     * Emit notification received
     */
    emitNotificationReceived(notification: any, type: string): void;
    /**
     * Emit credential ready notification
     */
    emitNotificationCredentialReady(credentialType: string, issuer: string, notificationId: string): void;
    /**
     * Emit SDK initialized
     */
    emitSDKInitialized(): void;
    /**
     * Emit SDK error
     */
    emitSDKError(error: Error, context: string): void;
    /**
     * Emit SDK ready
     */
    emitSDKReady(): void;
}
/**
 * Create a singleton instance
 */
export declare const sdkEvents: SDKEventEmitter;
//# sourceMappingURL=SDKEventEmitter.d.ts.map