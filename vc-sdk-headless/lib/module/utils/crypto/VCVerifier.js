"use strict";

import { CryptoUtil } from "./CryptoUtil.js";
export class VCVerifier {
  constructor() {
    this.cryptoUtil = new CryptoUtil();
  }

  /**
   * Verify a Verifiable Credential
   */
  async verify(credential) {
    const errors = [];
    const warnings = [];
    let signatureValid = false;
    let issuerTrusted = true; // Assume trusted for now
    let notExpired = true;
    try {
      // Basic structure validation
      this.validateStructure(credential, errors);

      // Check expiration
      if (credential.expirationDate) {
        const expirationDate = new Date(credential.expirationDate);
        const now = new Date();
        if (expirationDate <= now) {
          notExpired = false;
          errors.push('Credential has expired');
        }
      }

      // Verify proof signature
      if (credential.proof) {
        signatureValid = await this.verifyProof(credential, errors, warnings);
      } else {
        errors.push('Credential is missing proof');
      }

      // Verify issuer (basic check)
      if (!credential.issuer) {
        errors.push('Credential is missing issuer');
        issuerTrusted = false;
      } else {
        // In a real implementation, this would check against a trusted issuer registry
        if (!this.isValidIssuerFormat(credential.issuer)) {
          warnings.push('Issuer format appears invalid');
        }
      }

      // Check credential subject
      if (!credential.credentialSubject || !credential.credentialSubject.id) {
        errors.push('Credential subject is missing or invalid');
      }

      // Additional semantic validation
      await this.performSemanticValidation(credential, warnings);
    } catch (error) {
      errors.push(`Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    const isValid = errors.length === 0;
    const result = {
      isValid,
      errors,
      warnings,
      issuerTrusted,
      signatureValid,
      notExpired
    };
    console.log('Credential verification result:', result);
    return result;
  }
  validateStructure(credential, errors) {
    // Check required fields according to W3C VC spec
    if (!credential.id) {
      errors.push('Credential ID is required');
    }
    if (!credential.type) {
      errors.push('Credential type is required');
    } else {
      // Type should include 'VerifiableCredential'
      const types = Array.isArray(credential.type) ? credential.type : [credential.type];
      if (!types.includes('VerifiableCredential')) {
        errors.push('Credential type must include "VerifiableCredential"');
      }
    }
    if (!credential.issuer) {
      errors.push('Credential issuer is required');
    }
    if (!credential.issuanceDate) {
      errors.push('Credential issuance date is required');
    } else {
      try {
        const issuanceDate = new Date(credential.issuanceDate);
        if (isNaN(issuanceDate.getTime())) {
          errors.push('Invalid issuance date format');
        }
      } catch {
        errors.push('Invalid issuance date format');
      }
    }
    if (!credential.credentialSubject) {
      errors.push('Credential subject is required');
    }
  }
  async verifyProof(credential, errors, warnings) {
    try {
      const proof = credential.proof;

      // Check proof structure
      if (!proof.type) {
        errors.push('Proof type is required');
        return false;
      }
      if (!proof.created) {
        errors.push('Proof creation date is required');
        return false;
      }
      if (!proof.verificationMethod) {
        errors.push('Proof verification method is required');
        return false;
      }
      if (!proof.proofValue) {
        errors.push('Proof value is required');
        return false;
      }

      // Verify signature based on proof type
      switch (proof.type) {
        case 'Ed25519Signature2018':
        case 'Ed25519Signature2020':
          return await this.verifyEd25519Signature(credential, warnings);
        case 'RsaSignature2018':
          warnings.push('RSA signature verification not implemented');
          return false;
        case 'EcdsaSecp256k1Signature2019':
          warnings.push('ECDSA signature verification not implemented');
          return false;
        default:
          warnings.push(`Unsupported proof type: ${proof.type}`);
          return false;
      }
    } catch (error) {
      errors.push(`Proof verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
  async verifyEd25519Signature(credential, warnings) {
    try {
      // In a real implementation, this would:
      // 1. Resolve the verification method to get the public key
      // 2. Canonicalize the credential according to JSON-LD rules
      // 3. Hash the canonicalized credential
      // 4. Verify the signature using the public key

      // For now, we'll do a simplified check
      const proof = credential.proof;
      if (!proof.proofValue || proof.proofValue.length < 64) {
        warnings.push('Proof value appears to be too short for Ed25519 signature');
        return false;
      }
      if (!this.cryptoUtil.isValidHex(proof.proofValue)) {
        warnings.push('Proof value is not a valid hex string');
        return false;
      }

      // Simulate signature verification
      // In reality, you would need to:
      // - Fetch the public key from the verification method
      // - Create a canonical representation of the credential
      // - Verify the actual signature

      warnings.push('Signature verification is simulated - implement proper verification for production');
      return true;
    } catch (error) {
      warnings.push(`Ed25519 signature verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
  isValidIssuerFormat(issuer) {
    // Check if issuer is a valid DID or URL
    const didRegex = /^did:[a-z0-9]+:[a-zA-Z0-9.\-_:]+$/;
    const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/;
    return didRegex.test(issuer) || urlRegex.test(issuer);
  }
  async performSemanticValidation(credential, warnings) {
    try {
      // Check for common semantic issues

      // Issuance date should not be in the future
      const issuanceDate = new Date(credential.issuanceDate);
      const now = new Date();
      if (issuanceDate > now) {
        warnings.push('Issuance date is in the future');
      }

      // Check if credential subject ID is related to issuer (for self-issued credentials)
      if (credential.credentialSubject.id === credential.issuer) {
        warnings.push('Self-issued credential detected');
      }

      // Validate credential subject properties
      const subjectKeys = Object.keys(credential.credentialSubject);
      if (subjectKeys.length <= 1) {
        // Only 'id' field
        warnings.push('Credential subject contains minimal information');
      }

      // Check for suspicious patterns
      if (credential.credentialSubject.id && credential.credentialSubject.id.includes('example')) {
        warnings.push('Credential subject ID appears to be a placeholder');
      }
    } catch (error) {
      warnings.push(`Semantic validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify a batch of credentials
   */
  async verifyBatch(credentials) {
    const results = [];
    for (const credential of credentials) {
      try {
        const result = await this.verify(credential);
        results.push(result);
      } catch (error) {
        results.push({
          isValid: false,
          errors: [`Batch verification error: ${error instanceof Error ? error.message : 'Unknown error'}`],
          warnings: [],
          issuerTrusted: false,
          signatureValid: false,
          notExpired: false
        });
      }
    }
    return results;
  }

  /**
   * Check if a credential is expired
   */
  isExpired(credential) {
    if (!credential.expirationDate) {
      return false; // No expiration date means it doesn't expire
    }
    const expirationDate = new Date(credential.expirationDate);
    const now = new Date();
    return expirationDate <= now;
  }

  /**
   * Get days until expiration (negative if expired)
   */
  getDaysUntilExpiration(credential) {
    if (!credential.expirationDate) {
      return null; // No expiration
    }
    const expirationDate = new Date(credential.expirationDate);
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}
//# sourceMappingURL=VCVerifier.js.map