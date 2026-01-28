import { describe, it, expect } from 'vitest';
import { sanitizeHtml, escapeHtml } from './sanitize';

describe('sanitize utilities', () => {
  describe('sanitizeHtml', () => {
    it('should strip all HTML tags', () => {
      expect(sanitizeHtml('<p>Test</p>')).toBe('Test');
    });

    // it('should strip script tags and their content', () => {
    //    const cleaned = sanitizeHtml('<div><script>alert(1)</script></div>');
    //    expect(cleaned).not.toContain('alert(1)');
    //    expect(cleaned).toBe('');
    // });


    it('should remove XSS payloads', () => {
       expect(sanitizeHtml('<img src=x onerror=alert(1)>')).toBe('');
       expect(sanitizeHtml('<a href="javascript:alert(1)">Click</a>')).toBe('Click'); 
    });
    
    it('should handle plain text', () => {
      expect(sanitizeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('escapeHtml', () => {
    it('should escape special characters', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
      expect(escapeHtml("'single'")).toBe('&#039;single&#039;');
      expect(escapeHtml('&')).toBe('&amp;');
    });
    
    it('should result in safe string for rendering', () => {
      const input = '<img src=x onerror=alert(1)>';
      const escaped = escapeHtml(input);
      expect(escaped).toBe('&lt;img src=x onerror=alert(1)&gt;');
    });
  });
});
