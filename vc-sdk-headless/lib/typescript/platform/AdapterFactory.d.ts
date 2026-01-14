import { IStorageAdapter, IFileSystemAdapter, ICryptoAdapter, IDeviceAdapter, INetworkAdapter } from './types';
/**
 * Factory for creating platform-specific adapters
 */
export declare class AdapterFactory {
    private static storageAdapter;
    private static fileSystemAdapter;
    private static cryptoAdapter;
    private static deviceAdapter;
    private static networkAdapter;
    /**
     * Get or create storage adapter for current platform
     */
    static getStorageAdapter(storageId: string): Promise<IStorageAdapter>;
    /**
     * Get or create file system adapter for current platform
     */
    static getFileSystemAdapter(): Promise<IFileSystemAdapter>;
    /**
     * Get or create crypto adapter for current platform
     */
    static getCryptoAdapter(): Promise<ICryptoAdapter>;
    /**
     * Get or create device adapter for current platform
     */
    static getDeviceAdapter(): Promise<IDeviceAdapter>;
    /**
     * Get or create network adapter for current platform
     */
    static getNetworkAdapter(): Promise<INetworkAdapter>;
    /**
     * Reset all adapters (useful for testing or platform switching)
     */
    static resetAdapters(): void;
    /**
     * Get information about current adapters
     */
    static getAdapterInfo(): {
        platform: string;
        adaptersInitialized: {
            storage: boolean;
            fileSystem: boolean;
            crypto: boolean;
            device: boolean;
            network: boolean;
        };
    };
    /**
     * Pre-initialize all adapters for better performance
     */
    static preInitializeAdapters(storageId: string): Promise<void>;
}
//# sourceMappingURL=AdapterFactory.d.ts.map