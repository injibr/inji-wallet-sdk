import { VC, VerificationResult } from '../../types';
export declare class VCVerifier {
    private cryptoUtil;
    constructor();
    /**
     * Verify a Verifiable Credential
     */
    verify(credential: VC): Promise<VerificationResult>;
    private validateStructure;
    private verifyProof;
    private verifyEd25519Signature;
    private isValidIssuerFormat;
    private performSemanticValidation;
    /**
     * Verify a batch of credentials
     */
    verifyBatch(credentials: VC[]): Promise<VerificationResult[]>;
    /**
     * Check if a credential is expired
     */
    isExpired(credential: VC): boolean;
    /**
     * Get days until expiration (negative if expired)
     */
    getDaysUntilExpiration(credential: VC): number | null;
}
//# sourceMappingURL=VCVerifier.d.ts.map