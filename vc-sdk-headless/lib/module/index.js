"use strict";

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
export { VCSDKCoreHeadless, VCSDK } from "./core/VCSDKCoreHeadless.js";

// Event system
export * from "./events/index.js";

// Types
export * from "./types/index.js";

// Services (for advanced users)
export { CredentialService } from "./services/CredentialService.js";
export { IssuerService } from "./services/IssuerService.js";
export { ShareVCService } from "./services/ShareVCService.js";
export { AuthService } from "./services/AuthService.js";
export { AuthIntegrationService } from "./services/AuthIntegrationService.js";
export { notificationService } from "./services/NotificationService.js";

// Utils (for advanced users)
export * from "./utils/VCDisplayUtils.js";
export * from "./platform/index.js";
//# sourceMappingURL=index.js.map