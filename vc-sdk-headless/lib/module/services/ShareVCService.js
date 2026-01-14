"use strict";

/**
 * ShareVCService - OpenID4VP Protocol Implementation for VC Sharing
 * Pure JavaScript/TypeScript implementation for Expo compatibility
 * Supports manual URL input (no QR scanning required)
 */

import { JSONPath } from 'jsonpath-plus';
import { Buffer } from 'buffer';

// OpenID4VP Types

export class ShareVCService {
  credentialService = null;
  keyPair = null;
  constructor(config) {
    this.config = config;
  }
  async init(credentialService) {
    this.credentialService = credentialService;
    try {
      // Key pair will be generated on-demand when constructing VP
      // to avoid crypto initialization issues in Expo
      console.log('[ShareVC] Service initialized successfully');
    } catch (error) {
      console.error('[ShareVC] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Parse OpenID4VP authorization request from URL
   * Supports both direct presentation_definition and presentation_definition_uri
   */
  async parseAuthorizationRequest(url) {
    try {
      console.log('[ShareVC] Parsing authorization request from URL:', url);

      // Parse URL
      const urlObj = new URL(url);
      const params = urlObj.searchParams;

      // Extract parameters
      // Support both redirect_uri (OAuth) and response_uri (OpenID4VP)
      const redirectUri = params.get('redirect_uri') || params.get('response_uri') || '';
      const authRequest = {
        client_id: params.get('client_id') || '',
        redirect_uri: redirectUri,
        response_type: params.get('response_type') || 'vp_token',
        scope: params.get('scope') || undefined,
        nonce: params.get('nonce') || undefined,
        state: params.get('state') || undefined,
        response_mode: params.get('response_mode') || 'direct_post'
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
  async fetchPresentationDefinition(uri) {
    try {
      const response = await fetch(uri, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        // @ts-ignore - timeout not in TS types but works in React Native
        timeout: this.config.network?.timeout || 30000
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
  getVerifierInfo(authRequest) {
    return {
      name: authRequest.client_metadata?.client_name || authRequest.client_id,
      clientId: authRequest.client_id,
      purpose: authRequest.presentation_definition?.purpose,
      logoUri: authRequest.client_metadata?.logo_uri
    };
  }

  /**
   * Match user's credentials against presentation definition
   * Using the same logic as Inji's OpenID4VP implementation
   */
  async matchCredentials(presentationDef, userCredentials) {
    try {
      console.log('[ShareVC] Matching credentials against presentation definition');
      const matchedVCs = {};
      const requestedClaims = new Set();
      let anyInputDescriptorHasFormatOrConstraints = false;

      // Iterate through each credential and check against input descriptors
      for (const vc of userCredentials) {
        for (const inputDescriptor of presentationDef.input_descriptors) {
          const format = inputDescriptor.format ?? presentationDef.format;
          anyInputDescriptorHasFormatOrConstraints = anyInputDescriptorHasFormatOrConstraints || format !== undefined || inputDescriptor.constraints.fields !== undefined;

          // Check if credential matches constraints
          const isMatchingConstraints = this.isVCMatchingRequestConstraints(inputDescriptor.constraints, vc, requestedClaims);

          // Check if format and proof type match
          const areMatchingFormatAndProofType = this.areVCFormatAndProofTypeMatchingRequest(format, vc);

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
  areVCFormatAndProofTypeMatchingRequest(format, vc) {
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
  isVCMatchingRequestConstraints(constraints, vc, requestedClaims) {
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
                const hasMatch = valueMatchingPath.some(item => String(item).includes(field.filter.pattern));
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
   * Construct Verifiable Presentation with selected credentials
   * Signs with Ed25519 key pair using jose
   */
  async constructVerifiablePresentation(selectedVCs, authRequest) {
    try {
      console.log('[ShareVC] Constructing Verifiable Presentation');

      // Generate key pair on-demand if not already created using node-forge
      if (!this.keyPair) {
        console.log('[ShareVC] Generating Ed25519 key pair for VP signing using node-forge...');
        try {
          const forge = require('node-forge');
          const ed25519 = forge.pki.ed25519;

          // Generate Ed25519 key pair
          const seed = forge.random.getBytesSync(32);
          const keypair = ed25519.generateKeyPair({
            seed
          });

          // Store in a compatible format
          this.keyPair = {
            publicKey: keypair.publicKey,
            privateKey: keypair.privateKey
          };
          console.log('[ShareVC] ✅ Ed25519 key pair generated successfully using node-forge');
        } catch (keyError) {
          console.error('[ShareVC] Failed to generate key pair:', keyError);
          throw new Error('Failed to generate signing key for VP');
        }
      }

      // Build credential mapping to track which credential belongs to which input descriptor
      const credentialMapping = [];
      Object.entries(selectedVCs).forEach(([inputDescriptorId, vcs]) => {
        vcs.forEach(vc => {
          credentialMapping.push({
            inputDescriptorId,
            vc
          });
        });
      });
      if (credentialMapping.length === 0) {
        throw new Error('No credentials selected for sharing');
      }

      // Get holder DID
      const holderDID = await this.getHolderDID();

      // Log first VC to check structure
      if (credentialMapping.length > 0) {
        console.log('[ShareVC] Sample VC structure (first 500 chars):', JSON.stringify(credentialMapping[0].vc).substring(0, 500));
      }

      // Convert vc-sdk's flattened VC format to Inji's nested format
      // Inji expects: { vcMetadata: {...}, verifiableCredential: { credential: {...}, wellKnown, credentialConfigurationId } }
      // vc-sdk has: { id, type, name, issuer, credentialSubject, proof, metadata }
      const wrappedVCs = credentialMapping.map(item => {
        const vc = item.vc;

        // Extract metadata fields from vc-sdk format
        const vcMetadata = vc.metadata || {};
        const issuerInfo = vcMetadata.issuerInfo || {};
        const credentialTypeInfo = vcMetadata.credentialType || {};

        // CRITICAL: Try to get the original credential from metadata first
        // This ensures we use the EXACT credential with REAL proof from issuer
        const originalCredential = vcMetadata.originalCredential || vcMetadata.originalResponse?.credential;

        // Build the actual credential object (the inner part that goes in verifiableCredential.credential)
        // If we have the original, use it EXACTLY as-is (no modifications!)
        // Otherwise reconstruct from vc-sdk format.
        const credential = originalCredential || {
          '@context': vc['@context'] || ['https://www.w3.org/2018/credentials/v1'],
          type: Array.isArray(vc.type) ? vc.type : [vc.type],
          // NOTE: DO NOT include 'id' field - issuer credentials don't have it!
          // The original credential from issuer does NOT have an 'id' field at the top level
          issuer: vc.issuer || '',
          issuanceDate: vc.issuanceDate || new Date().toISOString(),
          credentialSubject: vc.credentialSubject || {},
          proof: vc.proof // ✅ Use original proof (NOT empty object!)
        };

        // Add expirationDate if present (if not using original)
        if (!originalCredential && vc.expirationDate) {
          credential.expirationDate = vc.expirationDate;
        }

        // CRITICAL: Validate proof exists and is valid
        if (!credential.proof || Object.keys(credential.proof).length === 0) {
          throw new Error(`Cannot share VC: Credential "${vc.name || vc.id}" has no valid proof signature from issuer`);
        }
        console.log('[ShareVC] Credential proof validation:', {
          credentialId: vc.id,
          hasProof: !!credential.proof,
          proofType: credential.proof?.type,
          hasSignature: !!(credential.proof?.proofValue || credential.proof?.jws),
          usingOriginal: !!originalCredential
        });

        // Log the credential that will be sent to verifier
        console.log('\n📤 ==================== CREDENTIAL TO BE SHARED ====================');
        console.log('[ShareVC] Credential object being sent to verifier:');
        console.log(JSON.stringify(credential, null, 2));
        console.log('[ShareVC] Credential has id field:', !!credential.id);
        console.log('[ShareVC] Credential has @context:', !!credential['@context']);
        console.log('[ShareVC] Credential has expirationDate:', !!credential.expirationDate);
        console.log('[ShareVC] Credential has proof.proofValue:', !!(credential.proof?.proofValue || credential.proof?.jws));
        console.log('📤 ==================================================================\n');

        // CRITICAL: Match INJI's approach - send FULL VC object with vcMetadata
        //
        // INJI Flow (OpenID4VP.ts line 41):
        // selectedVCs[inputDescriptorId].map(vc => JSON.stringify(vc))
        //
        // Where `vc` is the full INJI VC object:
        // {
        //   id: string,
        //   verifiableCredential: {
        //     credential: {...W3C VC...},
        //     wellKnown: string,
        //     credentialConfigurationId: string,
        //     issuerLogo: {...}
        //   },
        //   vcMetadata: {
        //     idType, requestId, isPinned, id, issuer, protocol,
        //     timestamp, isVerified, format, credentialType, issuerHost
        //   }
        // }
        //
        // The ENTIRE object (with vcMetadata) is stringified and sent to native module.
        // We must match this structure exactly!

        console.log('[ShareVC] Constructing INJI-compatible VC with vcMetadata');

        // Build INJI VCMetadata structure (exact format from actual request)
        const generatedOn = vcMetadata.addedDate || new Date().toISOString();
        const injiVCMetadata = {
          idType: '',
          // UIN or VID - not present in vc-sdk
          requestId: vc.id || '',
          isPinned: vcMetadata.isPinned || false,
          id: vc.id || '',
          issuer: issuerInfo.name || credentialTypeInfo.name || 'Unknown',
          // ← Display name from well-known (e.g., "INCRA")
          protocol: 'OpenId4VCI',
          timestamp: generatedOn,
          // ← Timestamp (e.g., "2025-10-07T14:02:33.556Z")
          isVerified: true,
          mosipIndividualId: '',
          // Not present in vc-sdk
          format: 'ldp_vc',
          isExpired: false,
          downloadKeyType: 'RS256',
          credentialType: credentialTypeInfo.name || vc.name || '',
          issuerHost: issuerInfo.issuerUrl || vc.issuer || ''
        };

        // CRITICAL: Use the EXACT credential as received from server
        // DO NOT add or remove any fields - use originalCredential as-is!

        // Build INJI VC structure (matches exact format from actual request)
        // Field order matters! Must match: format, generatedOn, vcMetadata, verifiableCredential
        const injiVC = {
          format: 'ldp_vc',
          // ← MUST BE FIRST
          generatedOn: generatedOn,
          // ← SECOND
          vcMetadata: injiVCMetadata,
          // ← THIRD
          verifiableCredential: {
            // ← FOURTH (LAST)
            credential: credential,
            // ← EXACT credential from server (no modifications!)
            format: 'ldp_vc',
            // ← CRITICAL: format field inside verifiableCredential!
            wellKnown: issuerInfo.wellknown_endpoint || (issuerInfo.issuerUrl ? `${issuerInfo.issuerUrl.replace(/\/$/, '')}/.well-known/openid-credential-issuer` : ''),
            credentialConfigurationId: credentialTypeInfo.id || '',
            issuerLogo: {
              url: issuerInfo.logoUrl || '',
              alt_text: issuerInfo.name || ''
            }
          }
        };
        console.log('[ShareVC] INJI VC structure created (exact format from actual request):', {
          hasFormat: !!injiVC.format,
          hasGeneratedOn: !!injiVC.generatedOn,
          hasVCMetadata: !!injiVC.vcMetadata,
          hasVerifiableCredential: !!injiVC.verifiableCredential,
          format: injiVC.format,
          generatedOn: injiVC.generatedOn,
          vcMetadata: {
            issuer: injiVCMetadata.issuer,
            // ← Display name ("INCRA")
            credentialType: injiVCMetadata.credentialType,
            protocol: injiVCMetadata.protocol,
            timestamp: injiVCMetadata.timestamp
          },
          credential: {
            usingOriginal: !!originalCredential,
            // ← Using exact server response
            issuer: credential.issuer,
            // ← DID from server
            hasProof: !!credential.proof,
            hasProofValue: !!(credential.proof?.proofValue || credential.proof?.jws)
          }
        });

        // Return the FULL INJI VC structure as JSON string (matching INJI's approach)
        return JSON.stringify(injiVC);
      });

      // wrappedVCs now contains INJI VC structures as JSON strings
      const stringifiedINJIVCs = wrappedVCs;
      console.log('[ShareVC] INJI VCs prepared for VP:', {
        count: stringifiedINJIVCs.length,
        vcStrings: stringifiedINJIVCs.map(vcStr => {
          try {
            const parsed = JSON.parse(vcStr);
            return {
              hasId: !!parsed.id,
              hasVerifiableCredential: !!parsed.verifiableCredential,
              hasVCMetadata: !!parsed.vcMetadata,
              issuer: parsed.vcMetadata?.issuer,
              credentialType: parsed.vcMetadata?.credentialType
            };
          } catch (e) {
            return {
              parseError: true
            };
          }
        })
      });

      // Create VP structure
      const vp = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiablePresentation'],
        id: `urn:uuid:${this.generateUUID()}`,
        holder: holderDID,
        verifiableCredential: stringifiedINJIVCs,
        // INJI VCs as JSON strings
        proof: {},
        // Will be filled by JWT
        // Store credential mapping for later use in descriptor_map
        _credentialMapping: credentialMapping
      };

      // Create JWT manually using node-forge
      const forge = require('node-forge');
      const ed25519 = forge.pki.ed25519;

      // Convert public key to JWK format for Ed25519
      const publicKeyBytes = this.keyPair.publicKey;

      // Convert Uint8Array to base64 using Buffer (avoiding forge.util)
      const publicKeyBase64 = Buffer.from(publicKeyBytes).toString('base64');
      const publicJWK = {
        kty: 'OKP',
        crv: 'Ed25519',
        x: publicKeyBase64
      };

      // Create JWT payload
      const jwtPayload = {
        iss: holderDID,
        sub: holderDID,
        aud: authRequest.client_id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 600,
        // 10 minutes
        nonce: authRequest.nonce,
        vp: {
          '@context': vp['@context'],
          type: vp.type,
          verifiableCredential: vp.verifiableCredential
        }
      };

      // Create JWT header
      const jwtHeader = {
        alg: 'EdDSA',
        typ: 'JWT',
        jwk: publicJWK
      };

      // Encode header and payload
      const encodedHeader = this.base64UrlEncode(JSON.stringify(jwtHeader));
      const encodedPayload = this.base64UrlEncode(JSON.stringify(jwtPayload));
      const signingInput = `${encodedHeader}.${encodedPayload}`;

      // Sign using Ed25519
      // Convert UTF-8 string to Uint8Array for ed25519.sign()
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(signingInput);
      const signature = ed25519.sign({
        message: messageBytes,
        privateKey: this.keyPair.privateKey
      });

      // Signature is already a Uint8Array, encode it to base64url
      const encodedSignature = this.base64UrlEncode(signature);

      // Complete JWT
      const vpToken = `${signingInput}.${encodedSignature}`;

      // Create public key DID in JWK format
      const publicKeyDID = `did:jwk:${Buffer.from(JSON.stringify(publicJWK)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;

      // Add proof to VP (Inji format with challenge and domain)
      vp.proof = {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        // Remove milliseconds
        challenge: authRequest.nonce,
        // Use nonce as challenge
        domain: 'OpenID4VP',
        jws: vpToken,
        verificationMethod: publicKeyDID // Store for later use
      };
      console.log('[ShareVC] VP constructed successfully');
      console.log('[ShareVC] VP structure:', {
        '@context': vp['@context'],
        type: vp.type,
        holder: vp.holder,
        verifiableCredential_count: vp.verifiableCredential?.length || 0,
        proof_type: vp.proof?.type,
        proof_jws_length: vpToken.length
      });
      console.log('[ShareVC] JWT Header:', JSON.stringify(jwtHeader));
      console.log('[ShareVC] JWT Payload keys:', Object.keys(jwtPayload));
      return vp;
    } catch (error) {
      console.error('[ShareVC] Failed to construct VP:', error);
      throw error;
    }
  }

  /**
   * Send Verifiable Presentation to verifier's redirect URI
   */
  async sendVerifiablePresentation(vp, authRequest) {
    try {
      console.log('[ShareVC] Sending VP to verifier:', authRequest.redirect_uri);

      // Create VP token as JSON object (NOT JWT string)
      // The VP token should contain the entire VP structure
      // Extract verificationMethod from proof to send as separate field
      const verificationMethod = vp.proof.verificationMethod;
      const vpTokenObject = {
        verifiableCredential: vp.verifiableCredential,
        id: vp.id,
        holder: '',
        // Empty string as per Inji format
        proof: {
          type: vp.proof.type,
          created: vp.proof.created,
          challenge: vp.proof.challenge,
          domain: vp.proof.domain,
          jws: vp.proof.jws,
          verificationMethod: verificationMethod // Include in proof for now
        }
      };
      console.log('[ShareVC] VP Token structure:', {
        verifiableCredentialCount: vpTokenObject.verifiableCredential?.length || 0,
        id: vpTokenObject.id,
        holder: vpTokenObject.holder,
        proofType: vpTokenObject.proof?.type,
        jwsLength: vpTokenObject.proof?.jws?.length || 0
      });

      // Log the actual credentials in the VP to verify they're strings (INJI format)
      console.log('\n🔍 ==================== VP TOKEN CREDENTIALS ====================');
      console.log('[ShareVC] Verifying credentials in VP are JSON strings (INJI format):');
      vpTokenObject.verifiableCredential?.forEach((cred, index) => {
        const isString = typeof cred === 'string';
        console.log(`[ShareVC] Credential ${index + 1}:`, {
          isString: isString,
          // ← Should be true (INJI format)
          isObject: typeof cred === 'object',
          stringLength: isString ? cred.length : 'N/A'
        });

        // Try to parse and show structure if it's a string
        if (isString) {
          try {
            const parsed = JSON.parse(cred);
            console.log(`[ShareVC] Credential ${index + 1} parsed structure:`, {
              hasId: !!parsed.id,
              hasVerifiableCredential: !!parsed.verifiableCredential,
              hasVCMetadata: !!parsed.vcMetadata,
              vcMetadata: {
                issuer: parsed.vcMetadata?.issuer,
                credentialType: parsed.vcMetadata?.credentialType,
                protocol: parsed.vcMetadata?.protocol
              },
              w3cCredential: {
                hasIssuer: !!parsed.verifiableCredential?.credential?.issuer,
                hasProof: !!parsed.verifiableCredential?.credential?.proof,
                hasProofValue: !!(parsed.verifiableCredential?.credential?.proof?.proofValue || parsed.verifiableCredential?.credential?.proof?.jws)
              }
            });
          } catch (e) {
            console.log(`[ShareVC] Credential ${index + 1} failed to parse:`, e.message);
          }
        }
      });
      console.log('🔍 ================================================================\n');

      // Build descriptor_map using the credential mapping
      const credentialMapping = vp._credentialMapping || [];
      const descriptor_map = credentialMapping.map((item, index) => ({
        id: item.inputDescriptorId,
        format: 'ldp_vp',
        path: `$.verifiableCredential[${index}]`
      }));

      // Prepare response payload
      const responsePayload = {
        vp_token: JSON.stringify(vpTokenObject),
        presentation_submission: JSON.stringify({
          id: this.generateUUID(),
          definition_id: authRequest.presentation_definition?.id || '',
          descriptor_map: descriptor_map
        })
      };
      console.log('[ShareVC] Descriptor map:', descriptor_map);

      // Add state if present
      if (authRequest.state) {
        responsePayload.state = authRequest.state;
      }
      console.log('[ShareVC] Request payload:', {
        url: authRequest.redirect_uri,
        state: responsePayload.state,
        presentation_submission: responsePayload.presentation_submission,
        vp_token_length: responsePayload.vp_token.length
      });

      // Log sample of vp_token to verify format
      console.log('[ShareVC] VP Token sample (first 1000 chars):', responsePayload.vp_token.substring(0, 1000));
      const formBody = new URLSearchParams(responsePayload).toString();
      console.log('[ShareVC] Form body length:', formBody.length);
      console.log('[ShareVC] Form body sample (first 500 chars):', formBody.substring(0, 500));

      // Send POST request
      const response = await fetch(authRequest.redirect_uri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formBody,
        // @ts-ignore
        timeout: this.config.network?.timeout || 30000
      });
      console.log('[ShareVC] Response status:', response.status, response.statusText);
      console.log('[ShareVC] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

      // Try to read response body
      let responseBody = '';
      try {
        responseBody = await response.text();
        console.log('[ShareVC] Response body:', responseBody);
      } catch (e) {
        console.log('[ShareVC] Could not read response body:', e);
      }
      if (!response.ok) {
        throw new Error(`Verifier responded with error: ${response.status} ${response.statusText} - Body: ${responseBody}`);
      }
      const result = {
        success: true,
        transactionId: vp.id,
        message: 'Credentials shared successfully'
      };
      console.log('[ShareVC] VP sent successfully');
      return result;
    } catch (error) {
      console.error('[ShareVC] Failed to send VP:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get holder DID (simplified version)
   */
  async getHolderDID() {
    // In production, this should be a proper DID
    return `did:key:${this.config.appId}-holder`;
  }

  /**
   * Generate UUID v4
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : r & 0x3 | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Base64URL encode helper
   */
  base64UrlEncode(data) {
    let base64;
    if (typeof data === 'string') {
      // String to base64
      const buffer = Buffer.from(data, 'utf8');
      base64 = buffer.toString('base64');
    } else {
      // Uint8Array to base64
      const buffer = Buffer.from(data);
      base64 = buffer.toString('base64');
    }

    // Convert to base64url format
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Cleanup service
   */
  async cleanup() {
    this.credentialService = null;
    this.keyPair = null;
    console.log('[ShareVC] Service cleaned up');
  }
}
//# sourceMappingURL=ShareVCService.js.map