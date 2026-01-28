import { describe, it, expect, afterEach } from 'vitest';
import { getCsrfToken } from './csrf';

describe('CSRF Utility', () => {
  describe('getCsrfToken', () => {
    afterEach(() => {
      document.head.innerHTML = '';
    });

    it('should return null if not in browser environment', () => {
      const originalDoc = global.document; 
      // @ts-expect-error - global.document is optional
      delete global.document;
      
      try {
        expect(getCsrfToken()).toBeNull();
      } finally {
        global.document = originalDoc;
      }
    });

    it('should retrieve token from meta tag', () => {
      const meta = document.createElement('meta');
      meta.name = 'csrf-token';
      meta.content = 'test-token-123';
      document.head.appendChild(meta);

      expect(getCsrfToken()).toBe('test-token-123');
    });

    it('should return null if meta tag exists but has no content', () => {
      const meta = document.createElement('meta');
      meta.name = 'csrf-token';
      document.head.appendChild(meta);

      expect(getCsrfToken()).toBeNull();
    });

    it('should return null if meta tag does not exist', () => {
      expect(getCsrfToken()).toBeNull();
    });
  });
});
