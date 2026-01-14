import { IStorageAdapter } from '../types';
/**
 * Storage adapter for Expo environment using SecureStore + AsyncStorage
 */
export declare class ExpoStorageAdapter implements IStorageAdapter {
    private SecureStore;
    private encryptionKey;
    private storageId;
    constructor(storageId: string);
    initialize(): Promise<void>;
    setSecureValue(key: string, value: string): Promise<void>;
    getSecureValue(key: string): Promise<string | null>;
    removeSecureValue(key: string): Promise<void>;
    setValue(key: string, value: string): Promise<void>;
    getValue(key: string): Promise<string | null>;
    removeValue(key: string): Promise<void>;
    getAllKeys(): Promise<string[]>;
    clear(): Promise<void>;
    /**
     * Get or create encryption key for regular storage
     */
    private getEncryptionKey;
    /**
     * Simple encryption using Expo Crypto
     */
    private encrypt;
    /**
     * Simple decryption
     */
    private decrypt;
    /**
     * Generate a random encryption key
     */
    private generateRandomKey;
}
//# sourceMappingURL=ExpoStorageAdapter.d.ts.map