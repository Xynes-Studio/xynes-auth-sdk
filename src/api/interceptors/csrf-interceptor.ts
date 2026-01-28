import { getCsrfToken } from '../../utils/csrf';

export const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Attaches CSRF token to headers if available.
 * Returns a plain object for compatibility with spread syntax.
 */
export const attachCsrfToken = (headers: HeadersInit = {}): Record<string, string> => {
  const token = getCsrfToken();
  
  // Normalize headers to object
  const result: Record<string, string> = {};
  
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = value;
    });
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      result[key] = value;
    });
  } else {
    Object.assign(result, headers);
  }

  if (token) {
    result[CSRF_HEADER_NAME] = token;
  }
  
  return result;
};
