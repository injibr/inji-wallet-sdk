import { IDeviceAdapter } from '../types';
/**
 * Device adapter for Expo environment
 */
export declare class ExpoDeviceAdapter implements IDeviceAdapter {
    private Device;
    private Constants;
    constructor();
    initialize(): Promise<void>;
    getDeviceId(): Promise<string>;
    getDeviceName(): Promise<string>;
    getSystemVersion(): string;
    getSystemName(): string;
    getBuildNumber(): string;
    getAppVersion(): string;
    /**
     * Get comprehensive device information
     */
    getDeviceInfo(): Promise<any>;
    /**
     * Check if device supports specific features
     */
    getDeviceCapabilities(): Promise<{
        hasCamera: boolean;
        hasBiometrics: boolean;
        hasNFC: boolean;
        hasSecureStorage: boolean;
    }>;
}
//# sourceMappingURL=ExpoDeviceAdapter.d.ts.map