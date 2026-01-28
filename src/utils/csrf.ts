/**
 * Retrieves the CSRF token from the meta tag.
 * Expects <meta name="csrf-token" content="..." />
 */
export const getCsrfToken = (): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }
  
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') || null;
};
