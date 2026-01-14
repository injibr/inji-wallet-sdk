/**
 * Platform abstraction layer for cross-platform compatibility
 */
export * from './types';
export * from './PlatformDetector';
export * from './AdapterFactory';
export * from './adapters/ExpoStorageAdapter';
export * from './adapters/ExpoFileSystemAdapter';
export * from './adapters/ExpoCryptoAdapter';
export * from './adapters/ExpoDeviceAdapter';
export * from './adapters/ExpoNetworkAdapter';
export { AdapterFactory as Platform } from './AdapterFactory';
export { PlatformDetector as PlatformInfo } from './PlatformDetector';
//# sourceMappingURL=index.d.ts.map