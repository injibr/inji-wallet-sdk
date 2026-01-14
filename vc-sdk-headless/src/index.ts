/**
 * vc-sdk-headless - Headless Verifiable Credentials SDK
 *
 * Pure logic layer with event-based API (no UI components)
 *
 * @example
 * ```typescript
 * import { VCSDK } from 'vc-sdk-headless';
 *
 * // Initialize
 * await VCSDK.init({
 *   appId: 'my-app',
 *   network: {
 *     baseUrl: 'https://api.example.com',
 *   },
 * });
 *
 * // Listen to events
 * VCSDK.events.on('credential:downloadComplete', ({ credential }) => {
 *   console.log('Downloaded:', credential);
 * });
 *
 * // Download credential
 * await VCSDK.credentials.download(issuer, credentialType);
 * ```
 */

// Core SDK
export { VCSDKCoreHeadless, VCSDK } from './core/VCSDKCoreHeadless';

// Event system
export * from './events';

// Types
export * from './types';

// Services (for advanced users)
export { CredentialService } from './services/CredentialService';
export { IssuerService } from './services/IssuerService';
export { ShareVCService } from './services/ShareVCService';
export { AuthService } from './services/AuthService';
export { AuthIntegrationService } from './services/AuthIntegrationService';
export { notificationService } from './services/NotificationService';

// Utils (for advanced users)
export * from './utils/VCDisplayUtils';
export * from './platform';
