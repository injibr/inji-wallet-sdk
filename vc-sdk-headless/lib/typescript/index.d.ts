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
export { VCSDKCoreHeadless, VCSDK } from './core/VCSDKCoreHeadless';
export * from './events';
export * from './types';
export { CredentialService } from './services/CredentialService';
export { IssuerService } from './services/IssuerService';
export { ShareVCService } from './services/ShareVCService';
export { AuthService } from './services/AuthService';
export { AuthIntegrationService } from './services/AuthIntegrationService';
export { notificationService } from './services/NotificationService';
export * from './utils/VCDisplayUtils';
export * from './platform';
//# sourceMappingURL=index.d.ts.map