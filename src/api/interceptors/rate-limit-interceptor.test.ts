import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleRateLimitResponse } from './rate-limit-interceptor';
import { rateLimitStore } from '../../modules/security/rate-limit';

describe('handleRateLimitResponse', () => {
    beforeEach(() => {
        vi.spyOn(rateLimitStore, 'trigger');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should trigger store on 429 with seconds', () => {
        const response = new Response(null, { 
            status: 429,
            headers: { 'Retry-After': '60' }
        });
        
        handleRateLimitResponse(response);
        expect(rateLimitStore.trigger).toHaveBeenCalledWith(60);
    });

    it('should handle Date string in Retry-After', () => {
        // Use a fixed now
        const now = 1600000000000;
        vi.setSystemTime(now);

        const futureDate = new Date(now + 30000).toUTCString();
        const response = new Response(null, { 
            status: 429,
            headers: { 'Retry-After': futureDate }
        });
        
        handleRateLimitResponse(response);
        expect(rateLimitStore.trigger).toHaveBeenCalledWith(30);

        vi.useRealTimers();
    });

    it('should use default 60s if header is missing', () => {
        const response = new Response(null, { 
            status: 429 
        });
        
        handleRateLimitResponse(response);
        expect(rateLimitStore.trigger).toHaveBeenCalledWith(60);
    });

    it('should ignore non-429', () => {
        const response = new Response(null, { status: 200 });
        handleRateLimitResponse(response);
        expect(rateLimitStore.trigger).not.toHaveBeenCalled();
    });
});
