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

  console.log(`[request] ${method} ${requestUrl}`);

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
      console.error(`[request] Fetch error: ${error.message}`);

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

      console.error(`[request] HTTP ${response.status} ${backendUrl}: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  if (jsonResponse.errors && jsonResponse.errors.length) {
    const backendUrl = requestUrl;
    const { errorCode, errorMessage } = jsonResponse.errors[0];
      console.error(`[request] Backend error ${errorCode}: ${errorMessage}`);
    throw new BackendResponseError(errorCode, errorMessage);
  }

  return jsonResponse;
}

