

export interface RateLimitState {
  isRateLimited: boolean;
  retryAfter: number | null; // Timestamp (Date.now() + ms)
  message: string;
}

const initialState: RateLimitState = {
  isRateLimited: false,
  retryAfter: null,
  message: '',
};

type Listener = (state: RateLimitState) => void;

class RateLimitStore {
  private state: RateLimitState = initialState;
  private listeners: Set<Listener> = new Set();
  private timer: NodeJS.Timeout | null = null;

  getState() {
    return this.state;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Trigger rate limit state
   * @param waitSeconds Number of seconds to wait
   * @param message Optional custom message
   */
  trigger(waitSeconds: number, message = 'Too many attempts. Please try again later.') {
    // Clear existing timer if any to avoid race conditions
    if (this.timer) {
      clearTimeout(this.timer);
    }

    // Cap at 24 hours to prevent setTimeout overflow (max 32-bit int is ~24 days)
    // and to handle potentially malicious/buggy headers.
    const safeWaitSeconds = Math.min(Math.max(1, waitSeconds), 86400);

    const retryAfter = Date.now() + safeWaitSeconds * 1000;
    
    this.update({
      isRateLimited: true,
      retryAfter,
      message,
    });

    // Auto-reset when time is up
    this.timer = setTimeout(() => {
      this.reset();
    }, safeWaitSeconds * 1000);
  }

  reset() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.update(initialState);
  }

  private update(newState: RateLimitState) {
    this.state = newState;
    this.notify();
  }

  private notify() {
    this.listeners.forEach(l => l(this.state));
  }
}

export const rateLimitStore = new RateLimitStore();

/**
 * Helper to calculate remaining seconds
 */
export const getRemainingSeconds = (retryAfter: number | null): number => {
  if (!retryAfter) return 0;
  const remaining = Math.ceil((retryAfter - Date.now()) / 1000);
  return Math.max(0, remaining);
};
