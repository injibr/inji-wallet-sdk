import { PlatformType, PlatformInfo } from './types';
/**
 * Detects the current platform and provides environment information
 */
export declare class PlatformDetector {
    private static cachedInfo;
    /**
     * Get comprehensive platform information
     */
    static getPlatformInfo(): PlatformInfo;
    /**
     * Detect the current platform type
     */
    static detectPlatform(): PlatformType;
    /**
     * Check if running in Expo Go app
     */
    static isExpoGo(): boolean;
    /**
     * Check if running in Expo managed workflow
     */
    static isExpoManaged(): boolean;
    /**
     * Check if platform supports secure storage
     */
    private static supportsSecureStorage;
    /**
     * Check if platform supports biometric authentication
     */
    private static supportsBiometrics;
    /**
     * Check if platform supports file system operations
     */
    private static supportsFileSystem;
    /**
     * Check if a module is available
     */
    private static hasModule;
    /**
     * Get debug information about the current environment
     */
    static getDebugInfo(): any;
    /**
     * Reset cached platform info (useful for testing)
     */
    static resetCache(): void;
}
//# sourceMappingURL=PlatformDetector.d.ts.map