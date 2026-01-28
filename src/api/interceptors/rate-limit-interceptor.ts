import { rateLimitStore } from '../../modules/security/rate-limit';

/**
 * Handles rate limit responses (429)
 * Checks for Retry-After header and triggers the global rate limit UI
 */
export const handleRateLimitResponse = (response: Response): void => {
  if (response.status === 429) {
    const retryAfterHeader = response.headers.get('Retry-After');
    let waitSeconds = 60; // Default fallback 60 seconds

    if (retryAfterHeader) {
      // Retry-After can be seconds or an HTTP-date
      if (/^\d+$/.test(retryAfterHeader)) {
        // It's seconds
        waitSeconds = parseInt(retryAfterHeader, 10);
      } else {
        // It might be a Date string
        const date = Date.parse(retryAfterHeader);
        if (!isNaN(date)) {
          waitSeconds = Math.ceil((date - Date.now()) / 1000);
        }
      }
    }

    // Ensure we don't have negative wait time
    waitSeconds = Math.max(1, waitSeconds);

    rateLimitStore.trigger(waitSeconds);
  }
};
