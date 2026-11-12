import { VCSDKConfig, VP, VC, ShareResult } from '../types';
import { CredentialService } from './CredentialService';
import { JSONPath } from 'jsonpath-plus';
import { Buffer } from 'buffer';
import * as ed from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import bs58 from 'bs58';
import { NativeModules, Platform } from 'react-native';
import '../polyfills';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  constraints: { fields?: FieldConstraint[] };
}

export interface FieldConstraint {
  path: string[];
  filter?: { type?: string; pattern?: string; const?: any };
}

export interface AuthorizationRequest {
  client_id: string;
  domain: string;
  redirect_uri: string;
  response_type: string;
  scope?: string;
  nonce?: string;
  state?: string;
  presentation_definition?: PresentationDefinition;
  presentation_definition_uri?: string;
  response_mode?: string;
  client_metadata?: { client_name?: string; logo_uri?: string };
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SD_JWT_FORMATS = ['vc+sd-jwt', 'dc+sd-jwt'] as const;
type SdJwtFormat = (typeof SD_JWT_FORMATS)[number];
const isSdJwt = (f: string): f is SdJwtFormat => SD_JWT_FORMATS.includes(f as SdJwtFormat);

function vcFormat(vc: VC): string {
  // Explicit format field (set by CredentialService on SD-JWT and mso_mdoc)
  const explicit = (vc as any).format as string | undefined;
  if (explicit) return explicit;

  // Detect from vc.type array (first non-VerifiableCredential entry)
  const types = Array.isArray(vc.type) ? vc.type : [vc.type];
  for (const t of types) {
    if (isSdJwt(t)) return t;
    if (t === 'mso_mdoc') return 'mso_mdoc';
  }

  // proof.type is the signature suite, not the VC format — always ldp_vc here
  return 'ldp_vc';
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

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
  }

  // ---------------------------------------------------------------------------
  // Parse authorization request
  // ---------------------------------------------------------------------------

  async parseAuthorizationRequest(url: string): Promise<AuthorizationRequest> {
    const p = parseQueryString(url);

    const authRequest: AuthorizationRequest = {
      client_id: p['client_id'] ?? '',
      redirect_uri: p['redirect_uri'] ?? p['response_uri'] ?? '',
      response_type: p['response_type'] ?? 'vp_token',
      scope: p['scope'],
      nonce: p['nonce'],
      state: p['state'],
      response_mode: p['response_mode'] ?? 'direct_post',
      domain: p['client_id'] ?? '',
    };

    const clientMetadataRaw = p['client_metadata'];
    if (clientMetadataRaw) {
      try { authRequest.client_metadata = JSON.parse(clientMetadataRaw); } catch (_) {}
    }

    const pdRaw = p['presentation_definition'];
    const pdUri = p['presentation_definition_uri'];

    if (pdRaw) {
      authRequest.presentation_definition = JSON.parse(pdRaw);
    } else if (pdUri) {
      authRequest.presentation_definition_uri = pdUri;
      authRequest.presentation_definition = await this.fetchPresentationDefinition(pdUri);
    } else {
      throw new Error('No presentation_definition or presentation_definition_uri in request');
    }

    if (!authRequest.client_id) throw new Error('Missing required parameter: client_id');
    if (!authRequest.redirect_uri) throw new Error('Missing required parameter: redirect_uri');

    return authRequest;
  }

  private async fetchPresentationDefinition(uri: string): Promise<PresentationDefinition> {
    const response = await fetch(uri, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Failed to fetch presentation definition: ${response.status}`);
    return response.json();
  }

  getVerifierInfo(authRequest: AuthorizationRequest): VerifierInfo {
    return {
      name: authRequest.client_metadata?.client_name ?? authRequest.client_id,
      clientId: authRequest.client_id,
      purpose: authRequest.presentation_definition?.purpose,
      logoUri: authRequest.client_metadata?.logo_uri,
    };
  }

  // ---------------------------------------------------------------------------
  // Match credentials — supports ldp_vc, vc+sd-jwt, dc+sd-jwt, mso_mdoc
  // ---------------------------------------------------------------------------

  async matchCredentials(
    presentationDef: PresentationDefinition,
    userCredentials: VC[],
  ): Promise<MatchedCredentials> {
    const matched: MatchedCredentials = {};

    for (const vc of userCredentials) {
      for (const descriptor of presentationDef.input_descriptors) {
        const requestedFormat = descriptor.format ?? presentationDef.format;
        const format = vcFormat(vc);

        const formatMatches = requestedFormat
          ? this.formatMatches(requestedFormat, vc)
          : true; // no format constraint = accept all

        const constraintMatches = this.constraintMatches(descriptor.constraints, vc);

        const isMatch = requestedFormat && descriptor.constraints.fields
          ? formatMatches && constraintMatches   // both required when both specified
          : formatMatches || constraintMatches;  // either sufficient otherwise

        if (isMatch) {
          if (!matched[descriptor.id]) matched[descriptor.id] = [];
          matched[descriptor.id].push(vc);
        }
      }
    }

    return matched;
  }

  private formatMatches(requestedFormat: Record<string, any>, vc: VC): boolean {
    const format = vcFormat(vc);
    const proofType = vc.proof?.type ?? '';

    return Object.entries(requestedFormat).some(([fmt, value]) => {
      if (fmt !== format) return false;
      if (value?.proof_type && Array.isArray(value.proof_type)) {
        return value.proof_type.includes(proofType);
      }
      return true;
    });
  }

  private constraintMatches(
    constraints: { fields?: FieldConstraint[] },
    vc: VC,
  ): boolean {
    if (!constraints.fields?.length) return false;

    // For SD-JWT: match against decoded JWT claims stored in credentialSubject
    const searchTarget = isSdJwt(vcFormat(vc))
      ? { ...vc, ...vc.credentialSubject }
      : vc;

    for (const field of constraints.fields) {
      for (const path of field.path) {
        const value = JSONPath({ path, json: searchTarget, wrap: false });
        if (value == null) continue;

        if (field.filter?.pattern) {
          const str = Array.isArray(value)
            ? value.some(v => String(v).includes(field.filter!.pattern!))
            : String(value).includes(field.filter.pattern);
          if (!str) continue;
        }

        if (field.filter?.const !== undefined && field.filter.const !== value) continue;

        return true;
      }
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Construct presentation — routes by format
  // ---------------------------------------------------------------------------

  async constructVerifiablePresentation(
    selectedVCs: MatchedCredentials,
    authRequest: AuthorizationRequest,
    selectedDisclosuresByVcId?: Record<string, string[]>,
  ): Promise<VP> {
    const credentialMapping: Array<{ inputDescriptorId: string; vc: VC }> = [];
    Object.entries(selectedVCs).forEach(([id, vcs]) =>
      vcs.forEach(vc => credentialMapping.push({ inputDescriptorId: id, vc }))
    );

    if (credentialMapping.length === 0) throw new Error('No credentials selected for sharing');

    // Detect dominant format (first credential wins)
    const firstFormat = vcFormat(credentialMapping[0].vc);

    if (isSdJwt(firstFormat)) {
      return this.buildSdJwtPresentation(credentialMapping, authRequest, selectedDisclosuresByVcId);
    }

    if (firstFormat === 'mso_mdoc') {
      return this.buildMdocPresentation(credentialMapping, authRequest);
    }

    // Default: ldp_vc
    return this.buildLdpVP(credentialMapping, authRequest);
  }

  // ---------------------------------------------------------------------------
  // ldp_vc — Ed25519Signature2020 VP
  // ---------------------------------------------------------------------------

  private async buildLdpVP(
    credentialMapping: Array<{ inputDescriptorId: string; vc: VC }>,
    authRequest: AuthorizationRequest,
  ): Promise<VP> {
    await this.ensureKeyPair();

    const rawCredentials = credentialMapping.map(({ vc }) => {
      const meta = vc.metadata as any;
      const credential = meta?.originalCredential
        ?? meta?.originalResponse?.credential
        ?? {
          '@context': vc['@context'],
          type: Array.isArray(vc.type) ? vc.type : [vc.type],
          issuer: vc.issuer,
          issuanceDate: vc.issuanceDate,
          credentialSubject: vc.credentialSubject,
          proof: vc.proof,
        };

      if (!credential.proof?.type) {
        throw new Error(`Cannot share VC "${vc.name ?? vc.id}": missing proof`);
      }

      const ED25519_CTX = 'https://w3id.org/security/suites/ed25519-2020/v1';
      const ctx: string[] = Array.isArray(credential['@context'])
        ? credential['@context']
        : [credential['@context']].filter(Boolean);
      if (!ctx.includes(ED25519_CTX)) ctx.push(ED25519_CTX);
      credential['@context'] = ctx;

      return credential;
    });

    const holderDID = this.buildHolderDID();
    const vpId = `urn:uuid:${this.generateUUID()}`;
    const vpContexts = [...new Set(
      rawCredentials.flatMap((c: any) =>
        Array.isArray(c['@context']) ? c['@context'] : [c['@context']]
      ).filter(Boolean)
    )];

    const vpBody: any = {
      '@context': vpContexts,
      type: ['VerifiablePresentation'],
      verifiableCredential: rawCredentials,
      id: vpId,
      holder: holderDID,
    };

    const created = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const proofOptions: any = {
      '@context': 'https://w3id.org/security/suites/ed25519-2020/v1',
      type: 'Ed25519Signature2020',
      created,
      challenge: authRequest.nonce,
      domain: authRequest.domain ?? authRequest.client_id,
      verificationMethod: `${holderDID}#0`,
      proofPurpose: 'authentication',
    };

    const signingInput = await this.canonicalizeForSigning(vpBody, vpContexts, proofOptions, rawCredentials, holderDID, authRequest, created);
    const signature = await ed.signAsync(signingInput, this.privateKey!);
    const proofValue = 'z' + bs58.encode(signature);
    const { '@context': _ctx, ...proofWithoutContext } = proofOptions;

    return {
      ...vpBody,
      proof: { ...proofWithoutContext, proofValue },
      _credentialMapping: credentialMapping,
    } as any;
  }

  private async canonicalizeForSigning(
    vpBody: any,
    vpContexts: string[],
    proofOptions: any,
    rawCredentials: any[],
    holderDID: string,
    authRequest: AuthorizationRequest,
    created: string,
  ): Promise<Buffer> {
    if (Platform.OS !== 'web' && NativeModules.URDNA2015?.canonicalizeForSigning) {
      const combinedVp = {
        ...vpBody,
        proof: {
          type: 'Ed25519Signature2020',
          created,
          verificationMethod: `${holderDID}#0`,
          domain: authRequest.domain ?? authRequest.client_id,
          challenge: authRequest.nonce,
          proofPurpose: 'authentication',
          proofValue: 'z_placeholder',
        },
      };
      const result = await NativeModules.URDNA2015.canonicalizeForSigning(JSON.stringify(combinedVp));
      return Buffer.from(result, 'base64');
    }

    const jsonld = require('jsonld');
    const contextCache: Record<string, any> = {};

    const fetchAndCache = async (url: string): Promise<any> => {
      if (contextCache[url]) return contextCache[url];
      const res = await fetch(url, { headers: { Accept: 'application/ld+json, application/json' }, redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching context: ${url}`);
      const doc = await res.json();
      contextCache[url] = doc;
      const nested = (Array.isArray(doc['@context']) ? doc['@context'] : [doc['@context']])
        .filter((c: any): c is string => typeof c === 'string' && c.startsWith('http'));
      await Promise.all(nested.filter((u: string) => !contextCache[u]).map(fetchAndCache));
      return doc;
    };

    jsonld.documentLoader = async (url: string) => {
      const document = await fetchAndCache(url);
      return { contextUrl: null, document, documentUrl: url };
    };

    const allUrls = [
      ...vpContexts,
      proofOptions['@context'],
      ...rawCredentials.flatMap((c: any) => Array.isArray(c['@context']) ? c['@context'] : [c['@context']]),
    ].filter((u): u is string => typeof u === 'string' && u.startsWith('http'));
    await Promise.all([...new Set(allUrls)].map(fetchAndCache));

    const opts = { algorithm: 'URDNA2015', format: 'application/n-quads', documentLoader: jsonld.documentLoader };
    const docNQuads: string = await jsonld.canonize(vpBody, opts);
    const proofNQuads: string = await jsonld.canonize(proofOptions, opts);

    return Buffer.concat([Buffer.from(sha256(Buffer.from(proofNQuads, 'utf8'))), Buffer.from(sha256(Buffer.from(docNQuads, 'utf8')))]);
  }

  // ---------------------------------------------------------------------------
  // vc+sd-jwt / dc+sd-jwt — KB-JWT presentation
  // ---------------------------------------------------------------------------

  private async buildSdJwtPresentation(
    credentialMapping: Array<{ inputDescriptorId: string; vc: VC }>,
    authRequest: AuthorizationRequest,
    selectedDisclosuresByVcId?: Record<string, string[]>,
  ): Promise<VP> {
    await this.ensureKeyPair();

    const tokens = await Promise.all(
      credentialMapping.map(async ({ vc }) => {
        const meta = vc.metadata as any;
        const sdJwtCompact: string = meta?.sdJwtCompact;
        if (!sdJwtCompact) throw new Error(`Missing sdJwtCompact for VC "${vc.name ?? vc.id}"`);

        const selectedPaths = selectedDisclosuresByVcId?.[vc.id];
        const filtered = filterSdJwtDisclosures(sdJwtCompact, selectedPaths, meta?.pathToDisclosures);

        const kbJwt = await this.buildKbJwt(filtered, authRequest);
        return filtered.endsWith('~') ? `${filtered}${kbJwt}` : `${filtered}~${kbJwt}`;
      })
    );

    return {
      id: `urn:uuid:${this.generateUUID()}`,
      type: ['VerifiablePresentation'],
      verifiableCredential: [],
      proof: { type: 'kb-jwt' } as any,
      holder: this.buildHolderDID(),
      _sdJwtTokens: tokens,
      _credentialMapping: credentialMapping,
    } as any;
  }

  private async buildKbJwt(sdJwtCompact: string, authRequest: AuthorizationRequest): Promise<string> {
    await this.ensureKeyPair();

    const pubJwk = buildEdDsaJwk(this.publicKey!);
    const holderDID = this.buildHolderDID();

    const header = { alg: 'EdDSA', typ: 'kb+jwt', jwk: pubJwk };
    const now = Math.floor(Date.now() / 1000);

    // sd_hash = SHA-256 of the SD-JWT without KB-JWT (issuer_jwt~d1~d2~)
    const sdHash = Buffer.from(sha256(Buffer.from(sdJwtCompact, 'utf8'))).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const payload = {
      iat: now,
      aud: authRequest.client_id,
      nonce: authRequest.nonce,
      sd_hash: sdHash,
      iss: holderDID,
    };

    const headerB64 = base64url(JSON.stringify(header));
    const payloadB64 = base64url(JSON.stringify(payload));
    const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');
    const sig = await ed.signAsync(signingInput, this.privateKey!);
    const sigB64 = Buffer.from(sig).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return `${headerB64}.${payloadB64}.${sigB64}`;
  }

  // ---------------------------------------------------------------------------
  // mso_mdoc — DeviceResponse envelope (minimal, verifier-side decoding)
  // ---------------------------------------------------------------------------

  private async buildMdocPresentation(
    credentialMapping: Array<{ inputDescriptorId: string; vc: VC }>,
    authRequest: AuthorizationRequest,
  ): Promise<VP> {
    // mso_mdoc DeviceResponse is the raw base64url CBOR from the issuer.
    // The SDK passes it through as-is; the verifier decodes CBOR natively.
    const tokens = credentialMapping.map(({ vc }) => {
      const meta = vc.metadata as any;
      const mdocData: string = meta?.mdocData;
      if (!mdocData) throw new Error(`Missing mdocData for VC "${vc.name ?? vc.id}"`);
      return mdocData;
    });

    return {
      id: `urn:uuid:${this.generateUUID()}`,
      type: ['VerifiablePresentation'],
      verifiableCredential: [],
      proof: { type: 'mso_mdoc' } as any,
      holder: '',
      _mdocTokens: tokens,
      _credentialMapping: credentialMapping,
    } as any;
  }

  // ---------------------------------------------------------------------------
  // Send presentation — handles all formats
  // ---------------------------------------------------------------------------

  async sendVerifiablePresentation(vp: VP, authRequest: AuthorizationRequest): Promise<ShareResult> {
    const vpAny = vp as any;
    const credentialMapping: Array<{ inputDescriptorId: string; vc: VC }> = vpAny._credentialMapping ?? [];

    let vpToken: string;
    let descriptorFormat: string;
    let descriptorPath: string;

    if (vpAny._sdJwtTokens) {
      // SD-JWT: vp_token is a single string (first) or JSON array (multiple)
      const tokens: string[] = vpAny._sdJwtTokens;
      vpToken = tokens.length === 1 ? tokens[0] : JSON.stringify(tokens);
      descriptorFormat = vcFormat(credentialMapping[0]?.vc) ?? 'vc+sd-jwt';
      descriptorPath = tokens.length === 1 ? '$' : '$[0]';
    } else if (vpAny._mdocTokens) {
      const tokens: string[] = vpAny._mdocTokens;
      vpToken = tokens.length === 1 ? tokens[0] : JSON.stringify(tokens);
      descriptorFormat = 'mso_mdoc';
      descriptorPath = '$';
    } else {
      // ldp_vc VP
      const { _credentialMapping: _cm, ...vpToken_ } = vpAny;
      vpToken = JSON.stringify(vpToken_);
      descriptorFormat = 'ldp_vp';
      descriptorPath = '$.verifiableCredential[0]';
    }

    const descriptor_map = credentialMapping.map((item, index) => ({
      id: item.inputDescriptorId,
      format: descriptorFormat,
      path: vpAny._sdJwtTokens && credentialMapping.length > 1
        ? `$[${index}]`
        : descriptorPath,
    }));

    const body: Record<string, string> = {
      vp_token: vpToken,
      presentation_submission: JSON.stringify({
        id: this.generateUUID(),
        definition_id: authRequest.presentation_definition?.id ?? '',
        descriptor_map,
      }),
    };
    if (authRequest.state) body.state = authRequest.state;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(authRequest.redirect_uri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body).toString(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const responseBody = await response.text().catch(() => '');
      if (!response.ok) throw new Error(`Verifier error: ${response.status} - ${responseBody}`);

      return { success: true, transactionId: vp.id ?? '' };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return { success: false, transactionId: '', error: err?.message ?? 'Unknown error' };
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  async cleanup(): Promise<void> {
    this.credentialService = null;
    this.privateKey = null;
    this.publicKey = null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async ensureKeyPair(): Promise<void> {
    if (this.privateKey) return;

    const CACHE_KEY = 'Ed25519_Issuer_KeyPair';
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const { privateKeyHex, publicKeyHex } = JSON.parse(raw);
        this.privateKey = Buffer.from(privateKeyHex, 'hex');
        this.publicKey = Buffer.from(publicKeyHex, 'hex');
        return;
      }
    } catch (_) {}

    // Fallback: gera novo par e persiste (primeira vez)
    this.privateKey = ed.utils.randomPrivateKey();
    this.publicKey = await ed.getPublicKeyAsync(this.privateKey);
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const pubJwk = buildEdDsaJwk(this.publicKey!);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        privateKeyHex: Buffer.from(this.privateKey).toString('hex'),
        publicKeyHex: Buffer.from(this.publicKey).toString('hex'),
        pubJwk,
      }));
    } catch (_) {}
  }

  private buildHolderDID(): string {
    const jwk = buildEdDsaJwk(this.publicKey!);
    // The VC may contain a padded DID, but the VP resolver requires unpadded base64url.
    // Both encodings represent the same public JWK.
    return `did:jwk:${base64url(JSON.stringify(jwk))}`;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
}

// ---------------------------------------------------------------------------
// Module-level helpers
// ---------------------------------------------------------------------------

function parseQueryString(url: string): Record<string, string> {
  const idx = url.indexOf('?');
  if (idx === -1) return {};
  return url.slice(idx + 1).split('&').reduce<Record<string, string>>((acc, pair) => {
    const [k, v] = pair.split('=').map(decodeURIComponent);
    if (k) acc[k] = v ?? '';
    return acc;
  }, {});
}

function base64url(input: string | Uint8Array): string {
  const b = typeof input === 'string' ? Buffer.from(input, 'utf8') : Buffer.from(input);
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function buildEdDsaJwk(publicKey: Uint8Array): Record<string, string> {
  return {
    kty: 'OKP',
    crv: 'Ed25519',
    x: base64url(publicKey),
  };
}

/**
 * Filters SD-JWT disclosures to only those matching selectedPaths.
 * If selectedPaths is undefined/empty, returns the original compact (all disclosures).
 * pathToDisclosures: { "$.cpf": ["disc_hash"], ... } — built by CredentialService.
 */
function filterSdJwtDisclosures(
  sdJwtCompact: string,
  selectedPaths: string[] | undefined,
  pathToDisclosures: Record<string, string[]> | undefined,
): string {
  const parts = sdJwtCompact.split('~');
  const jwt = parts[0];

  // No selection = send all disclosures (backward-compatible)
  if (!selectedPaths?.length || !pathToDisclosures) {
    return sdJwtCompact;
  }

  const keep = new Set<string>();
  for (const path of selectedPaths) {
    const discs = pathToDisclosures[path];
    if (discs) discs.forEach(d => keep.add(d));
  }

  // Preserve only selected disclosures; always end with '~'
  const filtered = [jwt, ...keep].join('~') + '~';
  return filtered;
}
