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
    return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], FORCE_BODY: true });
  }
  
  // Fallback for server-side environments without DOM
  return escapeHtml(dirty);
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
