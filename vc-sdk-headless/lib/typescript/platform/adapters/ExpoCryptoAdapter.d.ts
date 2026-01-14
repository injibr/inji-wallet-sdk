import { ICryptoAdapter, KeyPair } from '../types';
/**
 * Crypto adapter for Expo environment
 */
export declare class ExpoCryptoAdapter implements ICryptoAdapter {
    private Crypto;
    constructor();
    initialize(): Promise<void>;
    generateEncryptionKey(): Promise<string>;
    encrypt(data: string, key: string): Promise<string>;
    decrypt(encryptedData: string, key: string): Promise<string>;
    generateRSAKeyPair(): Promise<KeyPair>;
    signWithRSA(data: string, privateKey: string): Promise<string>;
    verifyRSASignature(data: string, signature: string, publicKey: string): Promise<boolean>;
    generateJWT(payload: any, privateKey: string): Promise<string>;
    /**
     * Load JOSE library dynamically
     */
    private loadJose;
    /**
     * Generate a mock RSA key pair for development/testing
     */
    private generateMockRSAKeyPair;
}
//# sourceMappingURL=ExpoCryptoAdapter.d.ts.map