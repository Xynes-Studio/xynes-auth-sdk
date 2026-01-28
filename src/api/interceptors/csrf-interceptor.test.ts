import { describe, it, expect, vi, afterEach } from 'vitest';
import { attachCsrfToken, CSRF_HEADER_NAME } from './csrf-interceptor';
import * as csrfUtils from '../../utils/csrf';

describe('CSRF Interceptor', () => {
  describe('attachCsrfToken', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should add CSRF header when token is available', () => {
      vi.spyOn(csrfUtils, 'getCsrfToken').mockReturnValue('test-token');
      
      const headers = attachCsrfToken({});
      
      // Check if it's a Headers object or plain object
      if (headers instanceof Headers) {
        expect(headers.get(CSRF_HEADER_NAME)).toBe('test-token');
      } else {
        expect((headers as Record<string, string>)[CSRF_HEADER_NAME]).toBe('test-token');
      }
    });

    it('should not modify headers when token is missing', () => {
      vi.spyOn(csrfUtils, 'getCsrfToken').mockReturnValue(null);
      
      const initialHeaders = { 'Content-Type': 'application/json' };
      const headers = attachCsrfToken(initialHeaders);
      
      if (headers instanceof Headers) {
        expect(headers.has(CSRF_HEADER_NAME)).toBe(false);
      } else {
        expect((headers as Record<string, string>)[CSRF_HEADER_NAME]).toBeUndefined();
        expect((headers as Record<string, string>)['Content-Type']).toBe('application/json');
      }
    });

    it('should preserve existing headers', () => {
      vi.spyOn(csrfUtils, 'getCsrfToken').mockReturnValue('test-token');
      
      const initialHeaders = { 'Authorization': 'Bearer 123' };
      const headers = attachCsrfToken(initialHeaders);
      
      if (headers instanceof Headers) {
        expect(headers.get('Authorization')).toBe('Bearer 123');
        expect(headers.get(CSRF_HEADER_NAME)).toBe('test-token');
      } else {
        expect((headers as Record<string, string>)['Authorization']).toBe('Bearer 123');
        expect((headers as Record<string, string>)[CSRF_HEADER_NAME]).toBe('test-token');
      }
    });

    it('should handle Headers object input', () => {
      vi.spyOn(csrfUtils, 'getCsrfToken').mockReturnValue('test-token');
      
      const initialHeaders = new Headers();
      initialHeaders.set('Content-Type', 'application/json');
      
      const headers = attachCsrfToken(initialHeaders);
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers[CSRF_HEADER_NAME]).toBe('test-token');
    });

    it('should handle array of entries input', () => {
      vi.spyOn(csrfUtils, 'getCsrfToken').mockReturnValue('test-token');
      
      const initialHeaders: [string, string][] = [['Content-Type', 'application/json']];
      
      const headers = attachCsrfToken(initialHeaders);
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers[CSRF_HEADER_NAME]).toBe('test-token');
    });
  });
});
