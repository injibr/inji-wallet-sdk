"use strict";

import { createMachine, assign } from 'xstate';
import { VCVerifier } from "../../utils/crypto/VCVerifier.js";
const defaultValidationRules = [{
  id: 'signature',
  name: 'Digital Signature',
  description: 'Verify the cryptographic signature of the credential',
  type: 'signature',
  enabled: true,
  severity: 'error',
  validator: async vc => {
    const verifier = new VCVerifier();
    const result = await verifier.verifySignature(vc);
    return result.isValid;
  }
}, {
  id: 'expiry',
  name: 'Expiration Date',
  description: 'Check if the credential has not expired',
  type: 'expiry',
  enabled: true,
  severity: 'error',
  validator: async vc => {
    if (!vc.expirationDate) return true;
    return new Date(vc.expirationDate) > new Date();
  }
}, {
  id: 'issuer',
  name: 'Trusted Issuer',
  description: 'Verify the credential comes from a trusted issuer',
  type: 'issuer',
  enabled: true,
  severity: 'warning',
  validator: async vc => {
    // In a real implementation, this would check against a trusted issuer registry
    return vc.issuer && typeof vc.issuer === 'string' && vc.issuer.startsWith('did:');
  }
}, {
  id: 'schema',
  name: 'Schema Validation',
  description: 'Validate credential data against its schema',
  type: 'schema',
  enabled: true,
  severity: 'warning',
  validator: async vc => {
    // Basic schema validation - in production would use JSON Schema validation
    return !!(vc.credentialSubject && vc.type && vc.issuer);
  }
}];
export const validationMachine = createMachine({
  id: 'validation',
  initial: 'idle',
  context: {
    credential: null,
    verificationResult: null,
    batchResults: [],
    error: null,
    progress: 0,
    validationRules: defaultValidationRules,
    currentRule: null,
    validCredentials: [],
    invalidCredentials: []
  },
  states: {
    idle: {
      on: {
        VALIDATE_CREDENTIAL: 'validatingCredential',
        VALIDATE_BATCH: 'validatingBatch',
        ADD_VALIDATION_RULE: {
          actions: 'addValidationRule'
        },
        REMOVE_VALIDATION_RULE: {
          actions: 'removeValidationRule'
        },
        TOGGLE_RULE: {
          actions: 'toggleValidationRule'
        },
        UPDATE_RULES: {
          actions: 'updateValidationRules'
        },
        VALIDATE_SIGNATURE: 'validatingSignature',
        VALIDATE_EXPIRY: 'validatingExpiry',
        VALIDATE_ISSUER: 'validatingIssuer',
        VALIDATE_SCHEMA: 'validatingSchema'
      }
    },
    validatingCredential: {
      entry: 'setCredential',
      invoke: {
        id: 'validateCredential',
        src: 'performCredentialValidation',
        onDone: {
          target: 'validated',
          actions: 'setValidationResult'
        },
        onError: {
          target: 'error',
          actions: 'setError'
        }
      },
      on: {
        UPDATE_PROGRESS: {
          actions: 'updateProgress'
        }
      }
    },
    validatingBatch: {
      invoke: {
        id: 'validateBatch',
        src: 'performBatchValidation',
        onDone: {
          target: 'batchValidated',
          actions: 'setBatchResults'
        },
        onError: {
          target: 'error',
          actions: 'setError'
        }
      },
      on: {
        UPDATE_PROGRESS: {
          actions: 'updateProgress'
        }
      }
    },
    validatingSignature: {
      entry: 'setCredential',
      invoke: {
        id: 'validateSignature',
        src: 'validateCredentialSignature',
        onDone: {
          target: 'signatureValidated',
          actions: 'setValidationResult'
        },
        onError: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    validatingExpiry: {
      entry: 'setCredential',
      invoke: {
        id: 'validateExpiry',
        src: 'validateCredentialExpiry',
        onDone: {
          target: 'expiryValidated',
          actions: 'setValidationResult'
        },
        onError: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    validatingIssuer: {
      entry: 'setCredential',
      invoke: {
        id: 'validateIssuer',
        src: 'validateCredentialIssuer',
        onDone: {
          target: 'issuerValidated',
          actions: 'setValidationResult'
        },
        onError: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    validatingSchema: {
      entry: 'setCredential',
      invoke: {
        id: 'validateSchema',
        src: 'validateCredentialSchema',
        onDone: {
          target: 'schemaValidated',
          actions: 'setValidationResult'
        },
        onError: {
          target: 'error',
          actions: 'setError'
        }
      }
    },
    validated: {
      on: {
        VALIDATE_CREDENTIAL: 'validatingCredential',
        VALIDATE_BATCH: 'validatingBatch',
        RESET_VALIDATION: 'idle'
      }
    },
    batchValidated: {
      on: {
        VALIDATE_BATCH: 'validatingBatch',
        RESET_VALIDATION: 'idle'
      }
    },
    signatureValidated: {
      on: {
        VALIDATE_CREDENTIAL: 'validatingCredential',
        RESET_VALIDATION: 'idle'
      }
    },
    expiryValidated: {
      on: {
        VALIDATE_CREDENTIAL: 'validatingCredential',
        RESET_VALIDATION: 'idle'
      }
    },
    issuerValidated: {
      on: {
        VALIDATE_CREDENTIAL: 'validatingCredential',
        RESET_VALIDATION: 'idle'
      }
    },
    schemaValidated: {
      on: {
        VALIDATE_CREDENTIAL: 'validatingCredential',
        RESET_VALIDATION: 'idle'
      }
    },
    error: {
      on: {
        RETRY: 'idle',
        RESET_VALIDATION: 'idle'
      }
    }
  }
}, {
  actions: {
    setCredential: assign({
      credential: (_, event) => event.credential,
      progress: 0,
      error: null
    }),
    setValidationResult: assign({
      verificationResult: (_, event) => event.data,
      progress: 100
    }),
    setBatchResults: assign({
      batchResults: (_, event) => event.data.results,
      validCredentials: (_, event) => event.data.valid,
      invalidCredentials: (_, event) => event.data.invalid,
      progress: 100
    }),
    setError: assign({
      error: (_, event) => event.data.message || 'Validation failed',
      progress: 0
    }),
    updateProgress: assign({
      progress: (_, event) => event.progress
    }),
    addValidationRule: assign({
      validationRules: (context, event) => [...context.validationRules, event.rule]
    }),
    removeValidationRule: assign({
      validationRules: (context, event) => context.validationRules.filter(rule => rule.id !== event.ruleId)
    }),
    toggleValidationRule: assign({
      validationRules: (context, event) => context.validationRules.map(rule => rule.id === event.ruleId ? {
        ...rule,
        enabled: event.enabled
      } : rule)
    }),
    updateValidationRules: assign({
      validationRules: (_, event) => event.rules
    })
  },
  services: {
    performCredentialValidation: async context => {
      if (!context.credential) throw new Error('No credential to validate');
      const verifier = new VCVerifier();
      const enabledRules = context.validationRules.filter(rule => rule.enabled);
      const results = [];
      let overallValid = true;
      for (const rule of enabledRules) {
        try {
          const isValid = await rule.validator(context.credential);
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            isValid,
            severity: rule.severity,
            message: isValid ? `${rule.name} validation passed` : `${rule.name} validation failed`
          });
          if (!isValid && rule.severity === 'error') {
            overallValid = false;
          }
        } catch (error) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            isValid: false,
            severity: 'error',
            message: `${rule.name} validation error: ${error.message}`
          });
          overallValid = false;
        }
      }
      return {
        isValid: overallValid,
        credential: context.credential,
        results,
        timestamp: new Date().toISOString()
      };
    },
    performBatchValidation: async (context, event) => {
      const credentials = event.credentials;
      const results = [];
      const validCredentials = [];
      const invalidCredentials = [];
      for (let i = 0; i < credentials.length; i++) {
        const credential = credentials[i];
        try {
          const verifier = new VCVerifier();
          const result = await verifier.verify(credential);
          results.push(result);
          if (result.isValid) {
            validCredentials.push(credential);
          } else {
            invalidCredentials.push(credential);
          }

          // Update progress
          const progress = Math.floor((i + 1) / credentials.length * 100);
          // Note: In a real implementation, you'd emit progress events
        } catch (error) {
          const errorResult = {
            isValid: false,
            credential,
            error: error.message,
            timestamp: new Date().toISOString()
          };
          results.push(errorResult);
          invalidCredentials.push(credential);
        }
      }
      return {
        results,
        valid: validCredentials,
        invalid: invalidCredentials
      };
    },
    validateCredentialSignature: async context => {
      if (!context.credential) throw new Error('No credential to validate');
      const verifier = new VCVerifier();
      return await verifier.verifySignature(context.credential);
    },
    validateCredentialExpiry: async context => {
      if (!context.credential) throw new Error('No credential to validate');
      const vc = context.credential;
      const isValid = !vc.expirationDate || new Date(vc.expirationDate) > new Date();
      return {
        isValid,
        credential: vc,
        message: isValid ? 'Credential has not expired' : 'Credential has expired',
        timestamp: new Date().toISOString()
      };
    },
    validateCredentialIssuer: async context => {
      if (!context.credential) throw new Error('No credential to validate');
      const vc = context.credential;
      const isValid = !!(vc.issuer && typeof vc.issuer === 'string' && vc.issuer.startsWith('did:'));
      return {
        isValid,
        credential: vc,
        message: isValid ? 'Issuer is valid' : 'Invalid or untrusted issuer',
        timestamp: new Date().toISOString()
      };
    },
    validateCredentialSchema: async context => {
      if (!context.credential) throw new Error('No credential to validate');
      const vc = context.credential;
      const isValid = !!(vc.credentialSubject && vc.type && vc.issuer);
      return {
        isValid,
        credential: vc,
        message: isValid ? 'Schema validation passed' : 'Schema validation failed',
        timestamp: new Date().toISOString()
      };
    }
  }
});
//# sourceMappingURL=ValidationMachine.js.map