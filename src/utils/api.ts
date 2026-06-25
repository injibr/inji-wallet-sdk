import { request } from './request';

export const DEFAULT_BASE_URL = 'https://vcdemo.crabdance.com';
export const API_URLS = {
  trustedVerifiersList: {
    method: 'GET' as const,
    buildURL: (): `/${string}` => '/v1/mimoto/verifiers',
  },
  issuersList: {
    method: 'GET' as const,
    buildURL: (): `/${string}` => '/v1/mimoto/issuers',
  },
  issuerConfig: {
    method: 'GET' as const,
    buildURL: (issuerId: string): `/${string}` =>
      `/v1/mimoto/issuers/${issuerId}`,
  },
  issuerWellknownConfig: {
    method: 'GET' as const,
    buildURL: (issuerId: string): `/${string}` =>
      `/.well-known/openid-credential-issuer?issuer_id=${issuerId}`,
  },
  authorizationServerMetadataConfig: {
    method: 'GET' as const,
    buildURL: (authorizationServerUrl: string): string =>
      `${authorizationServerUrl}/.well-known/openid-configuration`,
  },
  allProperties: {
    method: 'GET' as const,
    buildURL: (): `/${string}` => '/v1/mimoto/allProperties',
  },
  getIndividualId: {
    method: 'POST' as const,
    buildURL: (): `/${string}` => '/v1/mimoto/aid/get-individual-id',
  },
  reqIndividualOTP: {
    method: 'POST' as const,
    buildURL: (): `/${string}` => '/v1/mimoto/req/individualId/otp',
  },
  walletBinding: {
    method: 'POST' as const,
    buildURL: (): `/${string}` => '/v1/mimoto/wallet-binding',
  },
  bindingOtp: {
    method: 'POST' as const,
    buildURL: (): `/${string}` => '/v1/mimoto/binding-otp',
  },
  requestOtp: {
    method: 'POST' as const,
    buildURL: (): `/${string}` => '/v1/mimoto/req/otp',
  },
  credentialRequest: {
    method: 'POST' as const,
    buildURL: (): `/${string}` => '/v1/mimoto/credentialshare/request',
  },
  credentialStatus: {
    method: 'GET' as const,
    buildURL: (id: string): `/${string}` =>
      `/v1/mimoto/credentialshare/request/status/${id}`,
  },
  credentialDownload: {
    method: 'POST' as const,
    buildURL: (): `/${string}` => '/v1/mimoto/credentialshare/download',
  },
  linkTransaction: {
    method: 'POST' as const,
    buildURL: (): `/${string}` =>
      '/v1/esignet/linked-authorization/v2/link-transaction',
  },
  authenticate: {
    method: 'POST' as const,
    buildURL: (): `/${string}` =>
      '/v1/esignet/linked-authorization/v2/authenticate',
  },
  sendConsent: {
    method: 'POST' as const,
    buildURL: (): `/${string}` => '/v1/esignet/linked-authorization/v2/consent',
  },
};

export const API = {
  fetchTrustedVerifiersList: async (baseUrl?: string) => {
    console.log('[API] Fetching trusted verifiers list');
    try {
      const response = await request(
        API_URLS.trustedVerifiersList.method,
        API_URLS.trustedVerifiersList.buildURL(),
        undefined,
        baseUrl || DEFAULT_BASE_URL,
      );
      console.log('[API] Successfully fetched trusted verifiers:', {
        count: response?.length || 0
      });
      return response;
    } catch (error) {
      console.error('[API] Failed to fetch trusted verifiers:', error);
      throw error;
    }
  },

  fetchIssuers: async (baseUrl?: string) => {
    console.log('[API] Fetching credential issuers list');
    try {
      const response = await request(
        API_URLS.issuersList.method,
        API_URLS.issuersList.buildURL(),
        undefined,
        baseUrl || DEFAULT_BASE_URL,
      );
      const issuers = response.response?.issuers || response.issuers || [];
      console.log('[API] Successfully fetched issuers:', {
        count: issuers.length,
        issuerIds: issuers.map((issuer: any) => issuer.issuer_id || issuer.id)
      });
      return issuers;
    } catch (error) {
      console.error('[API] Failed to fetch issuers:', error);
      throw error;
    }
  },

  fetchIssuerWellknownConfig: async (
    issuerId: string,
    credentialIssuerHost: string,
    baseUrl?: string
  ) => {
    const wellknownPath = API_URLS.issuerWellknownConfig.buildURL(issuerId);
    const fullWellknownUrl = `${credentialIssuerHost}${wellknownPath}`;

    console.log('[API] Fetching issuer well-known config with dynamic URL:', {
      issuerId,
      credentialIssuerHost,
      wellknownPath,
      fullUrl: fullWellknownUrl,
      method: API_URLS.issuerWellknownConfig.method
    });

    try {
      const response = await request(
        API_URLS.issuerWellknownConfig.method,
        wellknownPath,
        undefined,
        credentialIssuerHost,
        {
          'Content-Type': 'application/json'
        }
      );

      console.log('[API] Successfully fetched well-known config:', {
        issuerId,
        credentialIssuer: response?.credential_issuer,
        credentialEndpoint: response?.credential_endpoint,
        authorizationServers: response?.authorization_servers,
        supportedConfigurations: Object.keys(response?.credential_configurations_supported || {}),
        displayInfo: response?.display
      });

      return response;
    } catch (error) {
      console.error('[API] Failed to fetch well-known config:', {
        issuerId,
        credentialIssuerHost,
        wellknownPath,
        fullUrl: fullWellknownUrl,
        error: (error as Error).message,
      });
      throw error;
    }
  },

  fetchAuthorizationServerMetadata: async (authorizationServerUrl: string) => {
    const metadataUrl = API_URLS.authorizationServerMetadataConfig.buildURL(authorizationServerUrl);

    console.log('[API] Fetching OpenID Connect configuration:', {
      authorizationServerUrl,
      metadataUrl,
      method: API_URLS.authorizationServerMetadataConfig.method,
      endpoint: '/.well-known/openid-configuration'
    });

    try {
      const response = await request(
        API_URLS.authorizationServerMetadataConfig.method,
        metadataUrl,
        undefined,
        '',
        {
          'Content-Type': 'application/json'
        }
      );

      console.log('[API] Successfully fetched OpenID Connect configuration:', {
        authorizationServerUrl,
        issuer: response?.issuer,
        authorizationEndpoint: response?.authorization_endpoint,
        tokenEndpoint: response?.token_endpoint,
        jwksUri: response?.jwks_uri,
      });

      return response;
    } catch (error) {
      console.error('[API] Failed to fetch OpenID Connect configuration:', {
        authorizationServerUrl,
        metadataUrl,
        error: (error as Error).message,
      });
      throw error;
    }
  },

  fetchAllProperties: async (baseUrl?: string) => {
    console.log('[API] Fetching application properties');
    try {
      const response = await request(
        API_URLS.allProperties.method,
        API_URLS.allProperties.buildURL(),
        undefined,
        baseUrl || DEFAULT_BASE_URL,
      );
      console.log('[API] Successfully fetched application properties:', {
        propertiesCount: Object.keys(response?.response || {}).length
      });
      return response.response || response;
    } catch (error) {
      console.error('[API] Failed to fetch application properties:', error);
      throw error;
    }
  },

  requestCredential: async (
    credentialData: any,
    baseUrl?: string
  ) => {
    console.log('[API] Requesting credential');
    try {
      const response = await request(
        API_URLS.credentialRequest.method,
        API_URLS.credentialRequest.buildURL(),
        credentialData,
        baseUrl || DEFAULT_BASE_URL,
      );
      console.log('[API] Successfully requested credential:', {
        requestId: response?.response?.requestId || response?.requestId
      });
      return response;
    } catch (error) {
      console.error('[API] Failed to request credential:', error);
      throw error;
    }
  },

  getCredentialStatus: async (
    requestId: string,
    baseUrl?: string
  ) => {
    console.log('[API] Getting credential status');
    try {
      const response = await request(
        API_URLS.credentialStatus.method,
        API_URLS.credentialStatus.buildURL(requestId),
        undefined,
        baseUrl || DEFAULT_BASE_URL,
      );
      console.log('[API] Successfully fetched credential status:', {
        requestId,
        status: response?.response?.statusCode || response?.statusCode
      });
      return response;
    } catch (error) {
      console.error('[API] Failed to get credential status:', error);
      throw error;
    }
  },

  downloadCredential: async (
    downloadData: any,
    baseUrl?: string
  ) => {
    console.log('[API] Downloading credential');
    try {
      const response = await request(
        API_URLS.credentialDownload.method,
        API_URLS.credentialDownload.buildURL(),
        downloadData,
        baseUrl || DEFAULT_BASE_URL,
      );
      console.log('[API] Successfully downloaded credential');
      return response;
    } catch (error) {
      console.error('[API] Failed to download credential:', error);
      throw error;
    }
  },
};

export type HTTP_METHOD = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface Api_Params {
  method: HTTP_METHOD;
  buildURL: (param?: string) => `/${string}` | string;
}

export interface ApiUrls {
  trustedVerifiersList: Api_Params;
  issuersList: Api_Params;
  issuerConfig: Api_Params;
  issuerWellknownConfig: Api_Params;
  authorizationServerMetadataConfig: Api_Params;
  allProperties: Api_Params;
  getIndividualId: Api_Params;
  reqIndividualOTP: Api_Params;
  walletBinding: Api_Params;
  bindingOtp: Api_Params;
  requestOtp: Api_Params;
  credentialRequest: Api_Params;
  credentialStatus: Api_Params;
  credentialDownload: Api_Params;
  linkTransaction: Api_Params;
  authenticate: Api_Params;
  sendConsent: Api_Params;
}