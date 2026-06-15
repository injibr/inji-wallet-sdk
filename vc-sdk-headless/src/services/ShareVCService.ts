/**
 * ShareVCService - OpenID4VP Protocol Implementation for VC Sharing
 * Pure JavaScript/TypeScript implementation for Expo compatibility
 * Supports manual URL input (no QR scanning required)
 */

import {
  VCSDKConfig,
  VP,
  VC,
  ShareResult
} from '../types';
import { CredentialService } from './CredentialService';
import { JSONPath } from 'jsonpath-plus';
import { Buffer } from 'buffer';
import * as ed from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import bs58 from 'bs58';

// OpenID4VP Types
export interface PresentationDefinition {
  id: string;
  input_descriptors: InputDescriptor[];
  format?: Record<string, any>;
  purpose?: string;
}

export interface InputDescriptor {
  id: string;
  name?: string;
  purpose?: string;
  format?: Record<string, any>;
  constraints: {
    fields?: FieldConstraint[];
  };
}

export interface FieldConstraint {
  path: string[];
  filter?: {
    type?: string;
    pattern?: string;
    const?: any;
  };
}

export interface AuthorizationRequest {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  scope?: string;
  nonce?: string;
  state?: string;
  presentation_definition?: PresentationDefinition;
  presentation_definition_uri?: string;
  response_mode?: string;
  client_metadata?: {
    client_name?: string;
    logo_uri?: string;
  };
}

export interface VerifierInfo {
  name: string;
  clientId: string;
  purpose?: string;
  logoUri?: string;
}

export interface MatchedCredentials {
  [inputDescriptorId: string]: VC[];
}

export class ShareVCService {
  private config: VCSDKConfig;
  private credentialService: CredentialService | null = null;
  private privateKey: Uint8Array | null = null;
  private publicKey: Uint8Array | null = null;

  constructor(config: VCSDKConfig) {
    this.config = config;
  }

  async init(credentialService: CredentialService): Promise<void> {
    this.credentialService = credentialService;
    console.log('[ShareVC] Service initialized successfully');
  }

  /**
   * Parse OpenID4VP authorization request from URL
   * Supports both direct presentation_definition and presentation_definition_uri
   */
  async parseAuthorizationRequest(url: string): Promise<AuthorizationRequest> {
    try {
      console.log('[ShareVC] Parsing authorization request from URL:', url);

      // Parse URL
      const urlObj = new URL(url);
      const params = urlObj.searchParams;

      // Extract parameters
      // Support both redirect_uri (OAuth) and response_uri (OpenID4VP)
      const redirectUri = params.get('redirect_uri') || params.get('response_uri') || '';

      const authRequest: AuthorizationRequest = {
        client_id: params.get('client_id') || '',
        redirect_uri: redirectUri,
        response_type: params.get('response_type') || 'vp_token',
        scope: params.get('scope') || undefined,
        nonce: params.get('nonce') || undefined,
        state: params.get('state') || undefined,
        response_mode: params.get('response_mode') || 'direct_post',
      };

      // Check for client_metadata
      const clientMetadataParam = params.get('client_metadata');
      if (clientMetadataParam) {
        try {
          authRequest.client_metadata = JSON.parse(clientMetadataParam);
        } catch (e) {
          console.warn('[ShareVC] Failed to parse client_metadata:', e);
        }
      }

      // Get presentation definition - either inline or from URI
      const presentationDefParam = params.get('presentation_definition');
      const presentationDefUri = params.get('presentation_definition_uri');

      if (presentationDefParam) {
        // Inline presentation definition
        try {
          authRequest.presentation_definition = JSON.parse(presentationDefParam);
          console.log('[ShareVC] Found inline presentation_definition');
        } catch (e) {
          console.error('[ShareVC] Failed to parse presentation_definition:', e);
          throw new Error('Invalid presentation_definition format');
        }
      } else if (presentationDefUri) {
        // Fetch from URI
        console.log('[ShareVC] Fetching presentation_definition from URI:', presentationDefUri);
        authRequest.presentation_definition_uri = presentationDefUri;
        authRequest.presentation_definition = await this.fetchPresentationDefinition(presentationDefUri);
      } else {
        throw new Error('No presentation_definition or presentation_definition_uri found in request');
      }

      // Validate required fields
      if (!authRequest.client_id) {
        throw new Error('Missing required parameter: client_id');
      }
      if (!authRequest.redirect_uri) {
        throw new Error('Missing required parameter: redirect_uri');
      }

      console.log('[ShareVC] Authorization request parsed successfully');
      return authRequest;

    } catch (error) {
      console.error('[ShareVC] Failed to parse authorization request:', error);
      throw error;
    }
  }

  /**
   * Fetch presentation definition from URI
   */
  private async fetchPresentationDefinition(uri: string): Promise<PresentationDefinition> {
    try {
      const response = await fetch(uri, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // @ts-ignore - timeout not in TS types but works in React Native
        timeout: this.config.network?.timeout || 30000,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch presentation definition: ${response.status} ${response.statusText}`);
      }

      const presentationDef = await response.json();
      console.log('[ShareVC] Presentation definition fetched successfully');
      return presentationDef;

    } catch (error) {
      console.error('[ShareVC] Failed to fetch presentation definition:', error);
      throw error;
    }
  }

  /**
   * Extract verifier information from authorization request
   */
  getVerifierInfo(authRequest: AuthorizationRequest): VerifierInfo {
    return {
      name: authRequest.client_metadata?.client_name || authRequest.client_id,
      clientId: authRequest.client_id,
      purpose: authRequest.presentation_definition?.purpose,
      logoUri: authRequest.client_metadata?.logo_uri,
    };
  }

  /**
   * Match user's credentials against presentation definition
   * Using the same logic as Inji's OpenID4VP implementation
   */
  async matchCredentials(
    presentationDef: PresentationDefinition,
    userCredentials: VC[]
  ): Promise<MatchedCredentials> {
    try {
      console.log('[ShareVC] Matching credentials against presentation definition');

      const matchedVCs: MatchedCredentials = {};
      const requestedClaims = new Set<string>();
      let anyInputDescriptorHasFormatOrConstraints = false;

      // Iterate through each credential and check against input descriptors
      for (const vc of userCredentials) {
        for (const inputDescriptor of presentationDef.input_descriptors) {
          const format = inputDescriptor.format ?? presentationDef.format;

          anyInputDescriptorHasFormatOrConstraints =
            anyInputDescriptorHasFormatOrConstraints ||
            format !== undefined ||
            inputDescriptor.constraints.fields !== undefined;

          // Check if credential matches constraints
          const isMatchingConstraints = this.isVCMatchingRequestConstraints(
            inputDescriptor.constraints,
            vc,
            requestedClaims
          );

          // Check if format and proof type match
          const areMatchingFormatAndProofType = this.areVCFormatAndProofTypeMatchingRequest(
            format,
            vc
          );

          // Add to matched credentials based on criteria
          if (inputDescriptor.constraints.fields && format) {
            if (isMatchingConstraints && areMatchingFormatAndProofType) {
              if (!matchedVCs[inputDescriptor.id]) {
                matchedVCs[inputDescriptor.id] = [];
              }
              matchedVCs[inputDescriptor.id].push(vc);
            }
          } else if (isMatchingConstraints || areMatchingFormatAndProofType) {
            if (!matchedVCs[inputDescriptor.id]) {
              matchedVCs[inputDescriptor.id] = [];
            }
            matchedVCs[inputDescriptor.id].push(vc);
          }
        }
      }

      // Log matching results
      const totalMatched = Object.values(matchedVCs).reduce((sum, vcs) => sum + vcs.length, 0);
      console.log('[ShareVC] Matched credentials:', Object.keys(matchedVCs).length, 'input descriptors');
      console.log('[ShareVC] Total VCs matched:', totalMatched);
      console.log('[ShareVC] Requested claims:', Array.from(requestedClaims).join(', '));

      return matchedVCs;

    } catch (error) {
      console.error('[ShareVC] Failed to match credentials:', error);
      throw error;
    }
  }

  /**
   * Check if VC format and proof type match the request
   * Based on Inji's implementation
   */
  private areVCFormatAndProofTypeMatchingRequest(
    format: Record<string, any> | undefined,
    vc: VC
  ): boolean {
    if (!format) {
      return false;
    }

    // Get VC format type (e.g., "ldp_vc", "jwt_vc_json")
    const vcFormatType = vc.format || 'ldp_vc';

    // Get VC proof type (e.g., "Ed25519Signature2018")
    const vcProofType = vc.proof?.type || '';

    // Check if format matches and proof type is in allowed list
    return Object.entries(format).some(([type, value]) => {
      if (type !== vcFormatType) {
        return false;
      }

      // Check if proof_type exists and matches
      if (value.proof_type && Array.isArray(value.proof_type)) {
        return value.proof_type.includes(vcProofType);
      }

      return true;
    });
  }

  /**
   * Check if VC matches request constraints using JSONPath
   * Based on Inji's implementation
   */
  private isVCMatchingRequestConstraints(
    constraints: { fields?: FieldConstraint[] },
    vc: VC,
    requestedClaims: Set<string>
  ): boolean {
    if (!constraints.fields || constraints.fields.length === 0) {
      return false;
    }

    for (const field of constraints.fields) {
      for (const path of field.path) {
        // Extract claim name from path
        const pathArray = JSONPath.toPathArray(path);
        const claimName = pathArray[pathArray.length - 1];
        requestedClaims.add(claimName);

        // Use JSONPath to find value in credential
        const valueMatchingPath = JSONPath({
          path: path,
          json: vc,
          wrap: false
        });

        // Check if value exists and matches filter
        if (valueMatchingPath !== undefined && valueMatchingPath !== null) {
          // If there's a filter, check it
          if (field.filter) {
            // Pattern check (for strings and arrays)
            if (field.filter.pattern) {
              // Handle both string and array values
              if (Array.isArray(valueMatchingPath)) {
                // For arrays, check if any element matches the pattern
                const hasMatch = valueMatchingPath.some(item =>
                  String(item).includes(field.filter.pattern)
                );
                if (!hasMatch) {
                  continue;
                }
              } else {
                // For strings, check if pattern is included
                const valueStr = String(valueMatchingPath);
                if (!valueStr.includes(field.filter.pattern)) {
                  continue;
                }
              }
            }

            // Const check (exact match)
            if (field.filter.const !== undefined && field.filter.const !== valueMatchingPath) {
              continue;
            }
          }

          // If we reach here, the field matches
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Construct Verifiable Presentation with Ed25519Signature2020 proof
   */
  async constructVerifiablePresentation(
    selectedVCs: MatchedCredentials,
    authRequest: AuthorizationRequest
  ): Promise<VP> {
    try {
      console.log('[ShareVC] Constructing Verifiable Presentation');

      if (!this.privateKey) {
        this.privateKey = ed.utils.randomPrivateKey();
        this.publicKey = await ed.getPublicKeyAsync(this.privateKey);
      }

      const credentialMapping: Array<{ inputDescriptorId: string; vc: VC }> = [];
      Object.entries(selectedVCs).forEach(([inputDescriptorId, vcs]) => {
        vcs.forEach(vc => credentialMapping.push({ inputDescriptorId, vc }));
      });

      if (credentialMapping.length === 0) {
        throw new Error('No credentials selected for sharing');
      }

      // Resolve raw W3C credentials
      const rawCredentials = credentialMapping.map(({ vc }) => {
        const vcMeta = vc.metadata as any;
        const credential = vcMeta?.originalCredential ?? vcMeta?.originalResponse?.credential ?? {
          '@context': vc['@context'] || ["https://www.w3.org/ns/credentials/v2", "https://w3id.org/security/suites/ed25519-2020/v1"],
          type: Array.isArray(vc.type) ? vc.type : [vc.type],
          issuer: vc.issuer || '',
          issuanceDate: vc.issuanceDate || new Date().toISOString(),
          credentialSubject: vc.credentialSubject || {},
          proof: vc.proof,
        };

        if (!credential.proof || Object.keys(credential.proof).length === 0) {
          throw new Error(`Cannot share VC: no valid proof on "${vc.name || vc.id}"`);
        }

        // Ensure ed25519-2020 context is present (fallback for old VCs)
        const ED25519_CTX = 'https://w3id.org/security/suites/ed25519-2020/v1';
        const ctx = Array.isArray(credential['@context']) ? credential['@context'] : [credential['@context']];
        if (!ctx.includes(ED25519_CTX)) ctx.push(ED25519_CTX);
        credential['@context'] = ctx;

        return credential;
      });

      // Build holder DID from public key
      const publicKeyBase64url = Buffer.from(this.publicKey!).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const holderDID = `did:jwk:${Buffer.from(JSON.stringify({ kty: 'OKP', crv: 'Ed25519', x: publicKeyBase64url })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;

      const jsonld = require('jsonld');

      // Embedded JSON-LD contexts to avoid network requests in React Native
      const CONTEXTS: Record<string, any> = {
        'https://www.w3.org/ns/credentials/v2': {
          '@context': {
            '@version': 1.1,
            '@protected': true,
            'id': '@id',
            'type': '@type',
            'VerifiableCredential': { '@id': 'https://www.w3.org/2018/credentials#VerifiableCredential' },
            'VerifiablePresentation': { '@id': 'https://www.w3.org/2018/credentials#VerifiablePresentation' },
            'verifiableCredential': { '@id': 'https://www.w3.org/2018/credentials#verifiableCredential', '@type': '@id', '@container': '@graph' },
            'holder': { '@id': 'https://www.w3.org/2018/credentials#holder', '@type': '@id' },
            'credentialSubject': { '@id': 'https://www.w3.org/2018/credentials#credentialSubject', '@type': '@id' },
            'credentialStatus': { '@id': 'https://www.w3.org/2018/credentials#credentialStatus', '@type': '@id' },
            'credentialSchema': { '@id': 'https://www.w3.org/2018/credentials#credentialSchema', '@type': '@id' },
            'issuer': { '@id': 'https://www.w3.org/2018/credentials#issuer', '@type': '@id' },
            'issuanceDate': { '@id': 'https://www.w3.org/2018/credentials#issuanceDate', '@type': 'http://www.w3.org/2001/XMLSchema#dateTime' },
            'expirationDate': { '@id': 'https://www.w3.org/2018/credentials#expirationDate', '@type': 'http://www.w3.org/2001/XMLSchema#dateTime' },
            'validFrom': { '@id': 'https://www.w3.org/2018/credentials#validFrom', '@type': 'http://www.w3.org/2001/XMLSchema#dateTime' },
            'validUntil': { '@id': 'https://www.w3.org/2018/credentials#validUntil', '@type': 'http://www.w3.org/2001/XMLSchema#dateTime' },
            'proof': { '@id': 'https://w3id.org/security#proof', '@type': '@id', '@container': '@graph' },
            'termsOfUse': { '@id': 'https://www.w3.org/2018/credentials#termsOfUse', '@type': '@id' },
            'evidence': { '@id': 'https://www.w3.org/2018/credentials#evidence', '@type': '@id' },
            'refreshService': { '@id': 'https://www.w3.org/2018/credentials#refreshService', '@type': '@id' },
          }
        },
        'https://www.w3.org/2018/credentials/v1': {
          '@context': {
            '@version': 1.1,
            'id': '@id',
            'type': '@type',
            'cred': 'https://www.w3.org/2018/credentials#',
            'sec': 'https://w3id.org/security#',
            'xsd': 'http://www.w3.org/2001/XMLSchema#',
            'VerifiableCredential': 'cred:VerifiableCredential',
            'VerifiablePresentation': 'cred:VerifiablePresentation',
            'verifiableCredential': { '@id': 'cred:verifiableCredential', '@type': '@id', '@container': '@graph' },
            'holder': { '@id': 'cred:holder', '@type': '@id' },
            'credentialSubject': { '@id': 'cred:credentialSubject', '@type': '@id' },
            'credentialStatus': { '@id': 'cred:credentialStatus', '@type': '@id' },
            'issuer': { '@id': 'cred:issuer', '@type': '@id' },
            'issuanceDate': { '@id': 'cred:issuanceDate', '@type': 'xsd:dateTime' },
            'expirationDate': { '@id': 'cred:expirationDate', '@type': 'xsd:dateTime' },
            'proof': { '@id': 'sec:proof', '@type': '@id', '@container': '@graph' },
          }
        },
        'https://w3id.org/security/suites/ed25519-2020/v1': {
          '@context': {
            'id': '@id',
            'type': '@type',
            '@protected': true,
            'proof': { '@id': 'https://w3id.org/security#proof', '@type': '@id', '@container': '@graph' },
            'Ed25519VerificationKey2020': { '@id': 'https://w3id.org/security#Ed25519VerificationKey2020', '@context': { '@protected': true, 'id': '@id', 'type': '@type', 'controller': { '@id': 'https://w3id.org/security#controller', '@type': '@id' }, 'revoked': { '@id': 'https://w3id.org/security#revoked', '@type': 'http://www.w3.org/2001/XMLSchema#dateTime' }, 'publicKeyMultibase': { '@id': 'https://w3id.org/security#publicKeyMultibase' } } },
            'Ed25519Signature2020': { '@id': 'https://w3id.org/security#Ed25519Signature2020', '@context': { '@protected': true, 'id': '@id', 'type': '@type', 'challenge': 'https://w3id.org/security#challenge', 'created': { '@id': 'http://purl.org/dc/terms/created', '@type': 'http://www.w3.org/2001/XMLSchema#dateTime' }, 'domain': 'https://w3id.org/security#domain', 'expires': { '@id': 'https://w3id.org/security#expiration', '@type': 'http://www.w3.org/2001/XMLSchema#dateTime' }, 'nonce': 'https://w3id.org/security#nonce', 'proofPurpose': { '@id': 'https://w3id.org/security#proofPurpose', '@type': '@vocab', '@context': { '@protected': true, 'id': '@id', 'type': '@type', 'assertionMethod': { '@id': 'https://w3id.org/security#assertionMethod', '@type': '@id', '@container': '@set' }, 'authentication': { '@id': 'https://w3id.org/security#authenticationMethod', '@type': '@id', '@container': '@set' }, 'capabilityInvocation': { '@id': 'https://w3id.org/security#capabilityInvocationMethod', '@type': '@id', '@container': '@set' }, 'capabilityDelegation': { '@id': 'https://w3id.org/security#capabilityDelegationMethod', '@type': '@id', '@container': '@set' }, 'keyAgreement': { '@id': 'https://w3id.org/security#keyAgreementMethod', '@type': '@id', '@container': '@set' } } }, 'proofValue': { '@id': 'https://w3id.org/security#proofValue' }, 'verificationMethod': { '@id': 'https://w3id.org/security#verificationMethod', '@type': '@id' } } },
          }
        },
        'https://w3id.org/security/v1': {
          '@context': {
            'id': '@id',
            'type': '@type',
            'dc': 'http://purl.org/dc/terms/',
            'sec': 'https://w3id.org/security#',
            'xsd': 'http://www.w3.org/2001/XMLSchema#',
            'proof': { '@id': 'sec:proof', '@type': '@id', '@container': '@graph' },
            'created': { '@id': 'dc:created', '@type': 'xsd:dateTime' },
            'domain': 'sec:domain',
            'challenge': 'sec:challenge',
            'proofPurpose': { '@id': 'sec:proofPurpose', '@type': '@vocab' },
            'proofValue': 'sec:proofValue',
            'verificationMethod': { '@id': 'sec:verificationMethod', '@type': '@id' },
          }
        },
        'https://w3id.org/security/v2': {
          '@context': [
            'https://w3id.org/security/v1',
            { 'RsaSignature2018': 'https://w3id.org/security#RsaSignature2018' }
          ]
        },
      };

      const documentLoader = async (url: string) => {
        if (CONTEXTS[url]) {
          return { contextUrl: null, document: CONTEXTS[url], documentUrl: url };
        }
        // Fallback to network for unknown contexts
        const res = await fetch(url, { headers: { Accept: 'application/ld+json' }, redirect: 'follow' });
        const document = await res.json();
        return { contextUrl: null, document, documentUrl: url };
      };
      const canonizeOpts = { algorithm: 'URDNA2015', format: 'application/n-quads', documentLoader, safe: false };

      // VP body without VP proof
      const vpBody: any = {
        '@context': ["https://www.w3.org/ns/credentials/v2", "https://w3id.org/security/suites/ed25519-2020/v1"],
        type: ['VerifiablePresentation'],
        verifiableCredential: rawCredentials,
      };

      const created = new Date().toISOString();
      const proofOptions: any = {
        '@context': 'https://w3id.org/security/suites/ed25519-2020/v1',
        type: 'Ed25519Signature2020',
        created,
        challenge: authRequest.nonce,
        domain: 'OpenID4VP',
        verificationMethod: holderDID,
        proofPurpose: 'authentication',
      };

      const [docNQuads, proofNQuads] = await Promise.all([
        jsonld.canonize(vpBody, canonizeOpts),
        jsonld.canonize(proofOptions, canonizeOpts),
      ]);

      const docHash = sha256(Buffer.from(docNQuads, 'utf8'));
      const proofHash = sha256(Buffer.from(proofNQuads, 'utf8'));
      const signingInput = Buffer.concat([Buffer.from(proofHash), Buffer.from(docHash)]);

      const signature = await ed.signAsync(signingInput, this.privateKey!);
      const proofValue = 'z' + bs58.encode(signature);

      const { '@context': _ctx, ...proofWithoutContext } = proofOptions;

      const vp: VP = {
        ...vpBody,
        id: `urn:uuid:${this.generateUUID()}`,
        proof: { ...proofWithoutContext, proofValue },
        _credentialMapping: credentialMapping as any,
      };

      console.log('[ShareVC] VP constructed with Ed25519Signature2020');
      return vp;

    } catch (error) {
      console.error('[ShareVC] Failed to construct VP:', error);
      throw error;
    }
  }

  /**
   * Send Verifiable Presentation to verifier's redirect URI
   */
  async sendVerifiablePresentation(
    vp: VP,
    authRequest: AuthorizationRequest
  ): Promise<ShareResult> {
    try {
      console.log('[ShareVC] Sending VP to verifier:', authRequest.redirect_uri);

      const { _credentialMapping, ...vpToken } = vp as any;

      const credentialMapping = _credentialMapping || [];
      const descriptor_map = credentialMapping.map((item: any, index: number) => ({
        id: item.inputDescriptorId,
        format: 'ldp_vp',
        path: `$.verifiableCredential[${index}]`,
      }));

      const responsePayload: Record<string, string> = {
        vp_token: JSON.stringify(vpToken),
        presentation_submission: JSON.stringify({
          id: this.generateUUID(),
          definition_id: authRequest.presentation_definition?.id || '',
          descriptor_map,
        }),
      };

      if (authRequest.state) responsePayload.state = authRequest.state;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch(authRequest.redirect_uri, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(responsePayload).toString(),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const responseBody = await response.text().catch(() => '');
        console.log('[ShareVC] Response:', response.status, responseBody);

        if (!response.ok) {
          throw new Error(`Verifier error: ${response.status} ${response.statusText} - ${responseBody}`);
        }

        return { success: true, transactionId: vp.id ?? '' };

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw new Error(`Network request failed: ${fetchError?.message || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('[ShareVC] Failed to send VP:', error);
      return { success: false, transactionId: '', error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
  }

  /**
   * Generate UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Cleanup service
   */
  async cleanup(): Promise<void> {
    this.credentialService = null;
    this.privateKey = null;
    this.publicKey = null;
    console.log('[ShareVC] Service cleaned up');
  }
}
