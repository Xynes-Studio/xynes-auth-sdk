/**
 * Password strength levels
 */
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Email validation regex (RFC 5322 simplified)
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Minimum password length
 */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Validates an email address
 * 
 * @param email - The email to validate
 * @returns Validation result with error message if invalid
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
}

/**
 * Validates a password against security requirements
 * 
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * 
 * @param password - The password to validate
 * @returns Validation result with error message if invalid
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || password === '') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { 
      isValid: false, 
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` 
    };
  }

  if (!/[A-Z]/.test(password)) {
    return { 
      isValid: false, 
      error: 'Password must contain at least one uppercase letter' 
    };
  }

  if (!/[a-z]/.test(password)) {
    return { 
      isValid: false, 
      error: 'Password must contain at least one lowercase letter' 
    };
  }

  if (!/[0-9]/.test(password)) {
    return { 
      isValid: false, 
      error: 'Password must contain at least one number' 
    };
  }

  return { isValid: true };
}

/**
 * Calculates password strength for UI feedback
 * 
 * Scoring:
 * - Length >= 8: +1
 * - Length >= 12: +1
 * - Has lowercase: +1
 * - Has uppercase: +1
 * - Has number: +1
 * - Has special char: +1
 * 
 * @param password - The password to evaluate
 * @returns Password strength level
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password || password.length === 0) {
    return 'weak';
  }

  let score = 0;

  // Length checks
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character type checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  // Map score to strength
  if (score <= 2) return 'weak';
  if (score <= 3) return 'fair';
  if (score <= 4) return 'good';
  return 'strong';
}

/**
 * Password strength configuration for UI
 */
export const PASSWORD_STRENGTH_CONFIG: Record<PasswordStrength, {
  label: string;
  color: string;
  percentage: number;
}> = {
  weak: { label: 'Weak', color: 'bg-red-500', percentage: 25 },
  fair: { label: 'Fair', color: 'bg-yellow-500', percentage: 50 },
  good: { label: 'Good', color: 'bg-blue-500', percentage: 75 },
  strong: { label: 'Strong', color: 'bg-green-500', percentage: 100 },
};
