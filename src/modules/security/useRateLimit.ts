import { useState, useEffect } from 'react';
import { rateLimitStore, type RateLimitState, getRemainingSeconds } from './rate-limit';

export function useRateLimit() {
  const [state, setState] = useState<RateLimitState>(rateLimitStore.getState());
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    // Subscribe to store updates
    const unsubscribe = rateLimitStore.subscribe(setState);
    
    // Initial state check
    const currentState = rateLimitStore.getState();
    setState(currentState);
    setRemainingSeconds(getRemainingSeconds(currentState.retryAfter));

    return unsubscribe;
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!state.isRateLimited || !state.retryAfter) {
      setRemainingSeconds(0);
      return;
    }

    // Update remaining seconds immediately
    setRemainingSeconds(getRemainingSeconds(state.retryAfter));

    const interval = setInterval(() => {
      const remaining = getRemainingSeconds(state.retryAfter);
      setRemainingSeconds(remaining);

      // If time is up, the store will eventually reset itself via its own timer,
      // which will trigger a state update here.
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isRateLimited, state.retryAfter]);

  return {
    ...state,
    remainingSeconds,
    reset: () => rateLimitStore.reset(),
  };
}
