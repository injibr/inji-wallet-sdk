export type HTTP_METHOD = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
export declare class BackendResponseError extends Error {
    constructor(name: string, message: string);
}
export declare function request(method: HTTP_METHOD, path: `/${string}` | string, body?: Record<string, unknown>, host?: string, headers?: Record<string, string>, timeoutMillis?: number): Promise<any>;
interface ResponseError {
    errorCode: string;
    errorMessage: string;
}
interface BackendResponse<T> {
    id?: string;
    version?: string;
    response?: T;
    str?: string;
    responsetime?: string;
    metadata?: string;
    errors?: ResponseError[];
}
export type OtpRequestResponse = BackendResponse<{
    maskedMobile?: string;
    maskedEmail?: string;
}>;
export type VcGenerateResponse = BackendResponse<{
    vc: string;
    message: string;
}>;
export type CredentialRequestResponse = BackendResponse<{
    id: string;
    requestId: string;
}>;
export type CredentialStatusResponse = BackendResponse<{
    statusCode: 'NEW' | 'ISSUED' | 'printing' | 'DOWNLOADED';
}>;
export interface CredentialDownloadResponse {
    credential?: any;
    verifiableCredential?: any;
    response?: {
        credential?: any;
        verifiableCredential?: any;
    };
}
export interface IssuerResponse {
    id: string;
    issuer_id: string;
    name: string;
    display: Array<{
        name: string;
        locale: string;
        logo: {
            url: string;
            alt_text: string;
        };
    }>;
    credential_issuer: string;
    protocol: string;
    enabled: boolean;
    order: number;
}
export {};
//# sourceMappingURL=request.d.ts.map