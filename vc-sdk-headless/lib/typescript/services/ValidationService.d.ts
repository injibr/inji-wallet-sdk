import { EventEmitter } from 'events';
import type { VC } from '../types';
import type { ValidationRule } from '../machines/validation/ValidationMachine';
export interface ValidationOptions {
    rules?: string[];
    strictMode?: boolean;
    includeSuggestions?: boolean;
    customValidators?: CustomValidator[];
}
export interface CustomValidator {
    id: string;
    name: string;
    description: string;
    validator: (vc: VC) => Promise<ValidationResult>;
}
export interface ValidationResult {
    isValid: boolean;
    credentialId: string;
    timestamp: string;
    overallScore: number;
    details: ValidationRuleResult[];
    suggestions?: string[];
    warnings?: string[];
    errors?: string[];
}
export interface ValidationRuleResult {
    ruleId: string;
    ruleName: string;
    isValid: boolean;
    severity: 'error' | 'warning' | 'info';
    score: number;
    message: string;
    details?: any;
    timeTaken?: number;
}
export interface BatchValidationResult {
    totalCredentials: number;
    validCredentials: number;
    invalidCredentials: number;
    results: ValidationResult[];
    summary: {
        mostCommonIssues: string[];
        averageScore: number;
        processingTime: number;
    };
}
export declare class ValidationService extends EventEmitter {
    private verifier;
    private validationRules;
    private customValidators;
    private trustedIssuers;
    private revokedCredentials;
    constructor();
    private initializeDefaultRules;
    private initializeTrustedIssuers;
    validateCredential(credential: VC, options?: ValidationOptions): Promise<ValidationResult>;
    validateBatch(credentials: VC[], options?: ValidationOptions): Promise<BatchValidationResult>;
    private getRulesToApply;
    private getSeverityWeight;
    private generateRuleMessage;
    private generateSuggestion;
    addValidationRule(rule: ValidationRule): void;
    removeValidationRule(ruleId: string): void;
    updateValidationRule(ruleId: string, updates: Partial<ValidationRule>): void;
    getValidationRules(): ValidationRule[];
    addTrustedIssuer(issuerId: string): void;
    removeTrustedIssuer(issuerId: string): void;
    getTrustedIssuers(): string[];
    revokeCredential(credentialId: string): void;
    unrevokeCredential(credentialId: string): void;
    isCredentialRevoked(credentialId: string): boolean;
    addCustomValidator(validator: CustomValidator): void;
    removeCustomValidator(validatorId: string): void;
    getCustomValidators(): CustomValidator[];
}
//# sourceMappingURL=ValidationService.d.ts.map