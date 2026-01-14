export declare const DEFAULT_BASE_URL = "https://vcdemo.crabdance.com";
export declare const API_URLS: {
    trustedVerifiersList: {
        method: "GET";
        buildURL: () => `/${string}`;
    };
    issuersList: {
        method: "GET";
        buildURL: () => `/${string}`;
    };
    issuerConfig: {
        method: "GET";
        buildURL: (issuerId: string) => `/${string}`;
    };
    issuerWellknownConfig: {
        method: "GET";
        buildURL: (issuerId: string) => `/${string}`;
    };
    authorizationServerMetadataConfig: {
        method: "GET";
        buildURL: (authorizationServerUrl: string) => string;
    };
    allProperties: {
        method: "GET";
        buildURL: () => `/${string}`;
    };
    getIndividualId: {
        method: "POST";
        buildURL: () => `/${string}`;
    };
    reqIndividualOTP: {
        method: "POST";
        buildURL: () => `/${string}`;
    };
    walletBinding: {
        method: "POST";
        buildURL: () => `/${string}`;
    };
    bindingOtp: {
        method: "POST";
        buildURL: () => `/${string}`;
    };
    requestOtp: {
        method: "POST";
        buildURL: () => `/${string}`;
    };
    credentialRequest: {
        method: "POST";
        buildURL: () => `/${string}`;
    };
    credentialStatus: {
        method: "GET";
        buildURL: (id: string) => `/${string}`;
    };
    credentialDownload: {
        method: "POST";
        buildURL: () => `/${string}`;
    };
    linkTransaction: {
        method: "POST";
        buildURL: () => `/${string}`;
    };
    authenticate: {
        method: "POST";
        buildURL: () => `/${string}`;
    };
    sendConsent: {
        method: "POST";
        buildURL: () => `/${string}`;
    };
};
export declare const API: {
    fetchTrustedVerifiersList: (baseUrl?: string) => Promise<any>;
    fetchIssuers: (baseUrl?: string) => Promise<any>;
    fetchIssuerWellknownConfig: (issuerId: string, credentialIssuerHost: string, baseUrl?: string) => Promise<any>;
    fetchAuthorizationServerMetadata: (authorizationServerUrl: string) => Promise<any>;
    fetchAllProperties: (baseUrl?: string) => Promise<any>;
    requestCredential: (credentialData: any, baseUrl?: string) => Promise<any>;
    getCredentialStatus: (requestId: string, baseUrl?: string) => Promise<any>;
    downloadCredential: (downloadData: any, baseUrl?: string) => Promise<any>;
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
export {};
//# sourceMappingURL=api.d.ts.map