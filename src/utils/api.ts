import { request } from './request';

export const DEFAULT_BASE_URL = 'https://vcdemo.crabdance.com';

export type HTTP_METHOD = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

const API_URLS = {
  issuersList: {
    method: 'GET' as const,
    buildURL: (): `/${string}` => '/v1/mimoto/issuers',
  },
  issuerWellknownConfig: {
    method: 'GET' as const,
    buildURL: (issuerId: string): `/${string}` =>
      `/.well-known/openid-credential-issuer?issuer_id=${issuerId}`,
  },
};

export const API = {
  fetchIssuers: async (baseUrl?: string) => {
    const response = await request(
      API_URLS.issuersList.method,
      API_URLS.issuersList.buildURL(),
      undefined,
      baseUrl || DEFAULT_BASE_URL,
    );
    return response.response?.issuers || response.issuers || [];
  },

  fetchIssuerWellknownConfig: async (issuerId: string, credentialIssuerHost: string) => {
    const path = API_URLS.issuerWellknownConfig.buildURL(issuerId);
    return request(
      API_URLS.issuerWellknownConfig.method,
      path,
      undefined,
      credentialIssuerHost,
      { 'Content-Type': 'application/json' },
    );
  },
};

export interface IssuerResponse {
  id: string;
  issuer_id: string;
  name: string;
  display: Array<{
    name: string;
    locale: string;
    logo: { url: string; alt_text: string };
  }>;
  credential_issuer: string;
  credential_issuer_host?: string;
  protocol: string;
  enabled: boolean;
  order: number;
}
