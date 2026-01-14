"use strict";

/**
 * Platform abstraction layer for cross-platform compatibility
 */

export * from "./types.js";
export * from "./PlatformDetector.js";
export * from "./AdapterFactory.js";

// Adapter exports
export * from "./adapters/ExpoStorageAdapter.js";
export * from "./adapters/ExpoFileSystemAdapter.js";
export * from "./adapters/ExpoCryptoAdapter.js";
export * from "./adapters/ExpoDeviceAdapter.js";
export * from "./adapters/ExpoNetworkAdapter.js";

// Re-export for convenience
export { AdapterFactory as Platform } from "./AdapterFactory.js";
export { PlatformDetector as PlatformInfo } from "./PlatformDetector.js";
//# sourceMappingURL=index.js.map