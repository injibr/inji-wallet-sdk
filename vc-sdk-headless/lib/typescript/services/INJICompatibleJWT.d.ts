/**
 * INJI-compatible JWT generation using native crypto modules
 * This follows the exact approach used by the INJI application
 */
/**
 * Generate a key pair using native secure keystore (INJI approach)
 */
export declare function generateKeyPairINJI(keyType: string): Promise<{
    publicKey: string;
    privateKey: string;
}>;
/**
 * Get JWT using INJI's exact approach with native crypto
 */
export declare function getJWTInjiStyle(header: any, payload: any, keyType?: string): Promise<string>;
/**
 * Fallback for when RNSecureKeystoreModule is not available
 */
export declare function getJWTFallback(header: any, payload: any): Promise<string>;
//# sourceMappingURL=INJICompatibleJWT.d.ts.map