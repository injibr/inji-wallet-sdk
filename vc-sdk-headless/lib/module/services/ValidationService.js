"use strict";

import { EventEmitter } from 'events';
import { VCVerifier } from "../utils/crypto/VCVerifier.js";
export class ValidationService extends EventEmitter {
  constructor() {
    super();
    this.verifier = new VCVerifier();
    this.validationRules = new Map();
    this.customValidators = new Map();
    this.trustedIssuers = new Set();
    this.revokedCredentials = new Set();
    this.initializeDefaultRules();
    this.initializeTrustedIssuers();
  }
  initializeDefaultRules() {
    const defaultRules = [{
      id: 'signature_verification',
      name: 'Digital Signature Verification',
      description: 'Verifies the cryptographic signature of the credential',
      type: 'signature',
      enabled: true,
      severity: 'error',
      validator: async vc => {
        const result = await this.verifier.verifySignature(vc);
        return result.isValid;
      }
    }, {
      id: 'expiration_check',
      name: 'Expiration Date Check',
      description: 'Checks if the credential has not expired',
      type: 'expiry',
      enabled: true,
      severity: 'error',
      validator: async vc => {
        if (!vc.expirationDate) return true;
        return new Date(vc.expirationDate) > new Date();
      }
    }, {
      id: 'issuer_trust',
      name: 'Issuer Trust Verification',
      description: 'Verifies the credential comes from a trusted issuer',
      type: 'issuer',
      enabled: true,
      severity: 'warning',
      validator: async vc => {
        const issuerId = typeof vc.issuer === 'string' ? vc.issuer : vc.issuer?.id;
        return issuerId ? this.trustedIssuers.has(issuerId) : false;
      }
    }, {
      id: 'revocation_check',
      name: 'Revocation Status Check',
      description: 'Checks if the credential has been revoked',
      type: 'custom',
      enabled: true,
      severity: 'error',
      validator: async vc => {
        return !this.revokedCredentials.has(vc.id);
      }
    }, {
      id: 'schema_validation',
      name: 'Schema Validation',
      description: 'Validates credential data against its schema',
      type: 'schema',
      enabled: true,
      severity: 'warning',
      validator: async vc => {
        // Basic schema validation
        return !!(vc['@context'] && vc.id && vc.type && vc.credentialSubject && vc.issuer && vc.issuanceDate);
      }
    }, {
      id: 'issuance_date_check',
      name: 'Issuance Date Validation',
      description: 'Validates the issuance date is reasonable',
      type: 'custom',
      enabled: true,
      severity: 'warning',
      validator: async vc => {
        const issuanceDate = new Date(vc.issuanceDate);
        const now = new Date();
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        return issuanceDate >= oneYearAgo && issuanceDate <= oneYearFromNow;
      }
    }, {
      id: 'subject_validation',
      name: 'Credential Subject Validation',
      description: 'Validates the credential subject contains required fields',
      type: 'schema',
      enabled: true,
      severity: 'warning',
      validator: async vc => {
        const subject = vc.credentialSubject;
        return !!(subject && (subject.id || subject.name || Object.keys(subject).length > 0));
      }
    }];
    defaultRules.forEach(rule => {
      this.validationRules.set(rule.id, rule);
    });
  }
  initializeTrustedIssuers() {
    // Initialize with some trusted issuer DIDs/URLs
    const trustedIssuerIds = ['https://issuer.dmv.gov', 'https://credentials.university.edu', 'https://credentials.nhs.gov', 'did:web:issuer.dmv.gov', 'did:web:credentials.university.edu', 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK'];
    trustedIssuerIds.forEach(id => {
      this.trustedIssuers.add(id);
    });
  }
  async validateCredential(credential, options = {}) {
    const startTime = Date.now();
    this.emit('validationStarted', {
      credentialId: credential.id
    });
    try {
      const rulesToApply = this.getRulesToApply(options);
      const results = [];
      let totalScore = 0;
      let maxPossibleScore = 0;
      const errors = [];
      const warnings = [];
      const suggestions = [];

      // Execute validation rules
      for (const rule of rulesToApply) {
        const ruleStartTime = Date.now();
        try {
          const isValid = await rule.validator(credential);
          const ruleScore = isValid ? 100 : 0;
          const timeTaken = Date.now() - ruleStartTime;
          const ruleResult = {
            ruleId: rule.id,
            ruleName: rule.name,
            isValid,
            severity: rule.severity,
            score: ruleScore,
            message: this.generateRuleMessage(rule, isValid),
            timeTaken
          };
          results.push(ruleResult);

          // Weight scores by severity
          const weight = this.getSeverityWeight(rule.severity);
          totalScore += ruleScore * weight;
          maxPossibleScore += 100 * weight;

          // Collect errors, warnings, and suggestions
          if (!isValid) {
            const message = `${rule.name}: ${ruleResult.message}`;
            if (rule.severity === 'error') {
              errors.push(message);
            } else if (rule.severity === 'warning') {
              warnings.push(message);
            }

            // Add suggestions for failed rules
            const suggestion = this.generateSuggestion(rule, credential);
            if (suggestion && options.includeSuggestions) {
              suggestions.push(suggestion);
            }
          }
          this.emit('ruleCompleted', {
            credentialId: credential.id,
            ruleId: rule.id,
            result: ruleResult
          });
        } catch (error) {
          const errorResult = {
            ruleId: rule.id,
            ruleName: rule.name,
            isValid: false,
            severity: 'error',
            score: 0,
            message: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timeTaken: Date.now() - ruleStartTime
          };
          results.push(errorResult);
          errors.push(`${rule.name}: ${errorResult.message}`);
          this.emit('ruleError', {
            credentialId: credential.id,
            ruleId: rule.id,
            error: errorResult.message
          });
        }
      }

      // Calculate overall validity
      const hasErrors = results.some(r => !r.isValid && r.severity === 'error');
      const overallScore = maxPossibleScore > 0 ? Math.round(totalScore / maxPossibleScore) : 0;
      const validationResult = {
        isValid: !hasErrors && (!options.strictMode || warnings.length === 0),
        credentialId: credential.id,
        timestamp: new Date().toISOString(),
        overallScore,
        details: results,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        errors: errors.length > 0 ? errors : undefined
      };
      const timeTaken = Date.now() - startTime;
      this.emit('validationCompleted', {
        credentialId: credential.id,
        result: validationResult,
        timeTaken
      });
      return validationResult;
    } catch (error) {
      const errorResult = {
        isValid: false,
        credentialId: credential.id,
        timestamp: new Date().toISOString(),
        overallScore: 0,
        details: [],
        errors: [error instanceof Error ? error.message : 'Validation failed']
      };
      this.emit('validationFailed', {
        credentialId: credential.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return errorResult;
    }
  }
  async validateBatch(credentials, options = {}) {
    const startTime = Date.now();
    this.emit('batchValidationStarted', {
      credentialCount: credentials.length
    });
    const results = [];
    const issueCounter = new Map();
    try {
      // Process credentials in parallel batches to avoid overwhelming the system
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < credentials.length; i += batchSize) {
        batches.push(credentials.slice(i, i + batchSize));
      }
      for (const batch of batches) {
        const batchPromises = batch.map(credential => this.validateCredential(credential, options));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Update progress
        this.emit('batchProgress', {
          completed: results.length,
          total: credentials.length,
          progress: results.length / credentials.length * 100
        });
      }

      // Analyze results
      const validCredentials = results.filter(r => r.isValid).length;
      const invalidCredentials = results.length - validCredentials;

      // Count common issues
      results.forEach(result => {
        result.errors?.forEach(error => {
          const issue = error.split(':')[0]; // Extract rule name
          issueCounter.set(issue, (issueCounter.get(issue) || 0) + 1);
        });
        result.warnings?.forEach(warning => {
          const issue = warning.split(':')[0];
          issueCounter.set(issue, (issueCounter.get(issue) || 0) + 1);
        });
      });
      const mostCommonIssues = Array.from(issueCounter.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([issue, count]) => `${issue} (${count} credentials)`);
      const averageScore = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;
      const processingTime = Date.now() - startTime;
      const batchResult = {
        totalCredentials: credentials.length,
        validCredentials,
        invalidCredentials,
        results,
        summary: {
          mostCommonIssues,
          averageScore: Math.round(averageScore),
          processingTime
        }
      };
      this.emit('batchValidationCompleted', batchResult);
      return batchResult;
    } catch (error) {
      this.emit('batchValidationFailed', {
        error: error instanceof Error ? error.message : 'Batch validation failed'
      });
      throw error;
    }
  }
  getRulesToApply(options) {
    let rules = Array.from(this.validationRules.values()).filter(rule => rule.enabled);
    if (options.rules && options.rules.length > 0) {
      rules = rules.filter(rule => options.rules.includes(rule.id));
    }
    return rules;
  }
  getSeverityWeight(severity) {
    switch (severity) {
      case 'error':
        return 3;
      case 'warning':
        return 2;
      case 'info':
        return 1;
      default:
        return 1;
    }
  }
  generateRuleMessage(rule, isValid) {
    if (isValid) {
      return `${rule.name} validation passed`;
    }
    switch (rule.id) {
      case 'signature_verification':
        return 'Digital signature is invalid or missing';
      case 'expiration_check':
        return 'Credential has expired';
      case 'issuer_trust':
        return 'Issuer is not in the trusted issuers list';
      case 'revocation_check':
        return 'Credential has been revoked';
      case 'schema_validation':
        return 'Credential does not conform to expected schema';
      case 'issuance_date_check':
        return 'Issuance date is outside reasonable bounds';
      case 'subject_validation':
        return 'Credential subject is missing required information';
      default:
        return `${rule.name} validation failed`;
    }
  }
  generateSuggestion(rule, credential) {
    switch (rule.id) {
      case 'signature_verification':
        return 'Contact the issuer to obtain a properly signed credential';
      case 'expiration_check':
        return 'Request a renewed credential from the issuer';
      case 'issuer_trust':
        return 'Verify the issuer is legitimate and request it be added to trusted issuers';
      case 'revocation_check':
        return 'Contact the issuer to understand why the credential was revoked';
      case 'schema_validation':
        return 'Ensure the credential includes all required fields and follows the correct format';
      case 'issuance_date_check':
        return 'Verify the issuance date with the issuer';
      case 'subject_validation':
        return 'Request the issuer to include complete subject information';
      default:
        return null;
    }
  }

  // Rule management
  addValidationRule(rule) {
    this.validationRules.set(rule.id, rule);
    this.emit('ruleAdded', {
      ruleId: rule.id,
      ruleName: rule.name
    });
  }
  removeValidationRule(ruleId) {
    this.validationRules.delete(ruleId);
    this.emit('ruleRemoved', {
      ruleId
    });
  }
  updateValidationRule(ruleId, updates) {
    const existingRule = this.validationRules.get(ruleId);
    if (existingRule) {
      const updatedRule = {
        ...existingRule,
        ...updates
      };
      this.validationRules.set(ruleId, updatedRule);
      this.emit('ruleUpdated', {
        ruleId,
        updates
      });
    }
  }
  getValidationRules() {
    return Array.from(this.validationRules.values());
  }

  // Trusted issuer management
  addTrustedIssuer(issuerId) {
    this.trustedIssuers.add(issuerId);
    this.emit('trustedIssuerAdded', {
      issuerId
    });
  }
  removeTrustedIssuer(issuerId) {
    this.trustedIssuers.delete(issuerId);
    this.emit('trustedIssuerRemoved', {
      issuerId
    });
  }
  getTrustedIssuers() {
    return Array.from(this.trustedIssuers);
  }

  // Revocation management
  revokeCredential(credentialId) {
    this.revokedCredentials.add(credentialId);
    this.emit('credentialRevoked', {
      credentialId
    });
  }
  unrevokeCredential(credentialId) {
    this.revokedCredentials.delete(credentialId);
    this.emit('credentialUnrevoked', {
      credentialId
    });
  }
  isCredentialRevoked(credentialId) {
    return this.revokedCredentials.has(credentialId);
  }

  // Custom validator management
  addCustomValidator(validator) {
    this.customValidators.set(validator.id, validator);
    this.emit('customValidatorAdded', {
      validatorId: validator.id
    });
  }
  removeCustomValidator(validatorId) {
    this.customValidators.delete(validatorId);
    this.emit('customValidatorRemoved', {
      validatorId
    });
  }
  getCustomValidators() {
    return Array.from(this.customValidators.values());
  }
}
//# sourceMappingURL=ValidationService.js.map