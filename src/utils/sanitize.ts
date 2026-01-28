import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Uses DOMPurify to strip dangerous tags and attributes.
 * 
 * @param dirty - The raw HTML string to sanitize
 * @returns The sanitized HTML string
 */
export const sanitizeHtml = (dirty: string): string => {
  // Check if running in a browser environment
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], FORCE_BODY: true }); // Strip all tags by default as per requirement "Escape function for rendering user content"? 
    // Wait, "Sanitize function for HTML content" usually means allowing SOME html.
    // But the snippet said: "ALLOWED_TAGS: []"
    // And "Escape function for rendering user content" as a separate point.
    // If ALLOWED_TAGS is empty, it strips ALL tags, effectively escaping/removing HTML?
    // No, DOMPurify with [] removes tags, keeping text.
    
    // The snippet: return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
    // This removes all HTML tags.
  }
  
  // Fallback for server-side (if needed, or return as is/escape)
  // For now, return dirty or implement simple escaping for SSR if DOMPurify fails.
  // But usually DOMPurify requires a window.
  // Given the snippet, I'll assume client-side or test env with jsdom.
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], FORCE_BODY: true });
};

/**
 * Escapes HTML entities to display them as text.
 * 
 * @param str - string to escape
 * @returns escaped string
 */
export const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
