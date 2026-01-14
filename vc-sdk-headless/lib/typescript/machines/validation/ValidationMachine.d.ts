import { interpret } from 'xstate';
import type { VC, VerificationResult } from '../../types';
export interface ValidationContext {
    credential: VC | null;
    verificationResult: VerificationResult | null;
    batchResults: VerificationResult[];
    error: string | null;
    progress: number;
    validationRules: ValidationRule[];
    currentRule: ValidationRule | null;
    validCredentials: VC[];
    invalidCredentials: VC[];
}
export interface ValidationRule {
    id: string;
    name: string;
    description: string;
    type: 'signature' | 'expiry' | 'issuer' | 'schema' | 'custom';
    enabled: boolean;
    severity: 'error' | 'warning' | 'info';
    validator: (vc: VC) => Promise<boolean>;
}
export type ValidationEvent = {
    type: 'VALIDATE_CREDENTIAL';
    credential: VC;
} | {
    type: 'VALIDATE_BATCH';
    credentials: VC[];
} | {
    type: 'ADD_VALIDATION_RULE';
    rule: ValidationRule;
} | {
    type: 'REMOVE_VALIDATION_RULE';
    ruleId: string;
} | {
    type: 'TOGGLE_RULE';
    ruleId: string;
    enabled: boolean;
} | {
    type: 'UPDATE_RULES';
    rules: ValidationRule[];
} | {
    type: 'VALIDATE_SIGNATURE';
    credential: VC;
} | {
    type: 'VALIDATE_EXPIRY';
    credential: VC;
} | {
    type: 'VALIDATE_ISSUER';
    credential: VC;
} | {
    type: 'VALIDATE_SCHEMA';
    credential: VC;
} | {
    type: 'RESET_VALIDATION';
} | {
    type: 'RETRY';
};
export declare const validationMachine: import("xstate").StateMachine<ValidationContext, any, ValidationEvent, {
    value: any;
    context: TContext;
}, import("xstate").BaseActionObject, import("xstate").ServiceMap, import("xstate").ResolveTypegenMeta<import("xstate").TypegenDisabled, ValidationEvent, import("xstate").BaseActionObject, import("xstate").ServiceMap>>;
export type ValidationActor = ReturnType<typeof interpret>;
//# sourceMappingURL=ValidationMachine.d.ts.map