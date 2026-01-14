/**
 * Platform adapter interfaces for cross-platform compatibility
 */
export interface KeyPair {
    publicKey: string;
    privateKey: string;
}
export interface IStorageAdapter {
    initialize(): Promise<void>;
    setSecureValue(key: string, value: string): Promise<void>;
    getSecureValue(key: string): Promise<string | null>;
    removeSecureValue(key: string): Promise<void>;
    setValue(key: string, value: string): Promise<void>;
    getValue(key: string): Promise<string | null>;
    removeValue(key: string): Promise<void>;
    getAllKeys(): Promise<string[]>;
    clear(): Promise<void>;
}
export interface IFileSystemAdapter {
    writeFile(fileName: string, content: string): Promise<string>;
    readFile(filePath: string): Promise<string>;
    deleteFile(filePath: string): Promise<void>;
    fileExists(filePath: string): Promise<boolean>;
    getDocumentDirectory(): Promise<string>;
}
export interface ICryptoAdapter {
    generateEncryptionKey(): Promise<string>;
    encrypt(data: string, key: string): Promise<string>;
    decrypt(encryptedData: string, key: string): Promise<string>;
    generateRSAKeyPair(): Promise<KeyPair>;
    signWithRSA(data: string, privateKey: string): Promise<string>;
    verifyRSASignature(data: string, signature: string, publicKey: string): Promise<boolean>;
    generateJWT(payload: any, privateKey: string): Promise<string>;
}
export interface IDeviceAdapter {
    getDeviceId(): Promise<string>;
    getDeviceName(): Promise<string>;
    getSystemVersion(): string;
    getSystemName(): string;
    getBuildNumber(): string;
    getAppVersion(): string;
}
export interface INetworkAdapter {
    getNetworkState(): Promise<{
        isConnected: boolean;
        connectionType: string;
        isExpensive?: boolean;
    }>;
    addNetworkListener(callback: (state: any) => void): () => void;
}
export type PlatformType = 'expo' | 'native' | 'web';
export interface PlatformInfo {
    platform: PlatformType;
    isExpoGo: boolean;
    isExpoManaged: boolean;
    supportsSecureStorage: boolean;
    supportsBiometrics: boolean;
    supportsFileSystem: boolean;
}
//# sourceMappingURL=types.d.ts.map