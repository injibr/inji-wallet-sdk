export declare class CryptoUtil {
    /**
     * Generate a secure encryption key
     */
    generateEncryptionKey(): Promise<string>;
    /**
     * Generate a cryptographic hash of the input data
     */
    calculateHash(data: string): Promise<string>;
    /**
     * Encrypt data using AES-256-GCM (simulated)
     */
    encrypt(data: string, key: string): Promise<string>;
    /**
     * Decrypt data using AES-256-GCM (simulated)
     */
    decrypt(encryptedData: string, key: string): Promise<string>;
    /**
     * Generate Ed25519 key pair for digital signatures
     */
    generateKeyPair(): Promise<{
        publicKey: string;
        privateKey: string;
    }>;
    /**
     * Sign data using Ed25519
     */
    sign(data: string, privateKey: string): Promise<string>;
    /**
     * Verify Ed25519 signature
     */
    verify(data: string, signature: string, publicKey: string): Promise<boolean>;
    /**
     * Generate a secure random string
     */
    generateRandomString(length?: number): string;
    /**
     * Generate a cryptographically secure UUID v4
     */
    generateUUID(): string;
    /**
     * Derive a key from a password using PBKDF2 (simulated)
     */
    deriveKey(password: string, salt: string, iterations?: number): Promise<string>;
    /**
     * Constant-time string comparison to prevent timing attacks
     */
    constantTimeEqual(a: string, b: string): boolean;
    /**
     * Validate that a string is a valid hex string
     */
    isValidHex(str: string): boolean;
    /**
     * Convert hex string to bytes
     */
    hexToBytes(hex: string): Uint8Array;
    /**
     * Convert bytes to hex string
     */
    bytesToHex(bytes: Uint8Array): string;
}
//# sourceMappingURL=CryptoUtil.d.ts.map