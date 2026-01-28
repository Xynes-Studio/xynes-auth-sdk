import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimitStore, getRemainingSeconds } from './rate-limit';

describe('rateLimitStore', () => {
  beforeEach(() => {
    rateLimitStore.reset();
  });

  afterEach(() => {
    rateLimitStore.reset();
  });

  it('should initialize with default state', () => {
    const state = rateLimitStore.getState();
    expect(state.isRateLimited).toBe(false);
    expect(state.retryAfter).toBeNull();
  });

  it('should update state on trigger', () => {
    rateLimitStore.trigger(45);
    const state = rateLimitStore.getState();
    expect(state.isRateLimited).toBe(true);
    expect(state.retryAfter).toBeGreaterThan(Date.now());
  });

  it('should notify subscribers', () => {
    const spy = vi.fn();
    rateLimitStore.subscribe(spy);
    
    rateLimitStore.trigger(10);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ isRateLimited: true }));
  });

  it('should auto-reset after time', async () => {
      vi.useFakeTimers();
      rateLimitStore.trigger(5);
      expect(rateLimitStore.getState().isRateLimited).toBe(true);
      
      vi.advanceTimersByTime(5000 + 100);
      expect(rateLimitStore.getState().isRateLimited).toBe(false);
      vi.useRealTimers();
  });
});

describe('getRemainingSeconds', () => {
    it('should return 0 if null', () => {
        expect(getRemainingSeconds(null)).toBe(0);
    });

    it('should calculate remaining seconds', () => {
        const future = Date.now() + 5000;
        // Check if closer to 5 (allow 1s tolerance due to execution time)
        const seconds = getRemainingSeconds(future);
        expect(seconds).toBeGreaterThanOrEqual(4); 
        expect(seconds).toBeLessThanOrEqual(5);
    });
});
