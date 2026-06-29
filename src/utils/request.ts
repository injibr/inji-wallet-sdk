import { DEFAULT_BASE_URL } from './api';

export type HTTP_METHOD = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export class BackendResponseError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
  }
}

const REQUEST_TIMEOUT = 30000; // 30 seconds

export async function request(
  method: HTTP_METHOD,
  path: `/${string}` | string,
  body?: Record<string, unknown>,
  host = DEFAULT_BASE_URL,
  headers: Record<string, string> = {
    'Content-Type': 'application/json',
  },
  timeoutMillis?: number,
) {
  // Add X-AppId header for mimoto endpoints
  if (path.includes('v1/mimoto')) {
    headers['X-AppId'] = 'vc-sdk-app'; // You can make this configurable
  }

  let response;
  const requestUrl = path.indexOf('https://') !== -1 ? path : host + path;

  // Enhanced logging for request details
  const requestId = Math.random().toString(36).substring(7);
  console.log(`🌐 [API_REQUEST_${requestId}] ==================== STARTING API CALL ====================`);
  console.log(`🌐 [API_REQUEST_${requestId}] Method: ${method}`);
  console.log(`🌐 [API_REQUEST_${requestId}] URL: ${requestUrl}`);
  console.log(`🌐 [API_REQUEST_${requestId}] Headers:`, headers);
  console.log(`🌐 [API_REQUEST_${requestId}] Body:`, body || 'No body');
  console.log(`🌐 [API_REQUEST_${requestId}] Timeout: ${timeoutMillis || REQUEST_TIMEOUT}ms`);
  console.log(`🌐 [API_REQUEST_${requestId}] Started at: ${new Date().toISOString()}`);

  // Also log key info to Metro terminal
  console.warn(`🌐 API CALL: ${method} ${requestUrl}`);
  if (body) {
    console.warn(`🌐 REQUEST DATA:`, JSON.stringify(body, null, 2));
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  if (timeoutMillis !== undefined || REQUEST_TIMEOUT) {
    const controller = new AbortController();
    const timeout = timeoutMillis || REQUEST_TIMEOUT;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    fetchOptions.signal = controller.signal;

    try {
      response = await fetch(requestUrl, fetchOptions);
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error(`🌐 [API_REQUEST_${requestId}] ❌ FETCH ERROR:`, {
        url: requestUrl,
        error: error.message,
        stack: error?.stack,
      });
      console.warn(`🌐 API ERROR: ${error.message}`);

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  } else {
    response = await fetch(requestUrl, fetchOptions);
  }

  let jsonResponse;
  try {
    const text = await response.text();
    jsonResponse = text ? JSON.parse(text) : {};
  } catch (e: any) {
    console.error('[API ERROR] Failed to parse JSON response', {
      url: requestUrl,
      error: e.message,
      stack: e?.stack,
    });
    throw e;
  }

  if (response.status >= 400) {
    const backendUrl = requestUrl;
    const errorMessage =
      jsonResponse.message ||
      (typeof jsonResponse.error === 'object'
        ? JSON.stringify(jsonResponse.error)
        : jsonResponse.error) ||
      `HTTP ${response.status} ${response.statusText}`;

    console.error('[API ERROR] Backend error', {
      url: backendUrl,
      status: response.status,
      statusText: response.statusText,
      errorMessage,
      response: jsonResponse,
    });
    console.warn(`🌐 API ERROR ${response.status}: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  if (jsonResponse.errors && jsonResponse.errors.length) {
    const backendUrl = requestUrl;
    const { errorCode, errorMessage } = jsonResponse.errors[0];
    console.error('[API ERROR] Backend error response', {
      url: backendUrl,
      errorCode,
      errorMessage,
      response: jsonResponse,
    });
    throw new BackendResponseError(errorCode, errorMessage);
  }

  // Enhanced logging for successful response
  const responseToLog = JSON.stringify(jsonResponse).length > 1000
    ? { ...jsonResponse, truncated: true }
    : jsonResponse;

  console.log(`🌐 [API_REQUEST_${requestId}] ✅ SUCCESS RESPONSE:`, {
    url: requestUrl,
    status: response.status,
    statusText: response.statusText,
    response: responseToLog,
  });
  console.log(`🌐 [API_REQUEST_${requestId}] ==================== REQUEST COMPLETED ====================`);

  // Also log response to Metro terminal
  console.warn(`🌐 API RESPONSE: ${response.status} ${response.statusText}`);
  console.warn(`🌐 RESPONSE DATA:`, JSON.stringify(responseToLog, null, 2));

  return jsonResponse;
}

// Response type interfaces
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