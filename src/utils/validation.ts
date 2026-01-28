import { z } from 'zod';

/**
 * Password strength levels
 */
export type PasswordStrength = "weak" | "fair" | "good" | "strong";

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}


// ─────────────────────────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────────────────────────

export const emailSchema = z.string().email("Please enter a valid email address").max(255, "Email is too long");

export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const workspaceNameSchema = z.string().transform(s => s.trim()).pipe(z.string().min(2, "Workspace name too short").max(100, "Workspace name too long"));

export const workspaceSlugSchema = z.string()
  .min(3, "Slug must be at least 3 characters")
  .max(50, "Slug must be less than 50 chars")
  .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, 'Invalid slug format (lowercase, numbers, hyphens only, cannot start/end with hyphen)')
  .refine(s => !s.includes('--'), 'No consecutive hyphens');

// ─────────────────────────────────────────────────────────────────
// Validation Functions (Wrappers around schemas for legacy compatibility)
// ─────────────────────────────────────────────────────────────────

/**
 * Validates an email address using Zod schema
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === "") {
    return { isValid: false, error: "Email is required" };
  }
  
  const result = emailSchema.safeParse(email);
  return result.success 
    ? { isValid: true }
    : { isValid: false, error: result.error.issues[0].message };
}

/**
 * Validates a password using Zod schema
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || password === "") {
    return { isValid: false, error: "Password is required" };
  }

  const result = passwordSchema.safeParse(password);
  return result.success 
    ? { isValid: true }
    : { isValid: false, error: result.error.issues[0].message };
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
    return "weak";
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
  if (score <= 2) return "weak";
  if (score <= 3) return "fair";
  if (score <= 4) return "good";
  return "strong";
}

/**
 * Password strength configuration for UI
 */
export const PASSWORD_STRENGTH_CONFIG: Record<
  PasswordStrength,
  {
    label: string;
    color: string;
    percentage: number;
  }
> = {
  weak: { label: "Weak", color: "bg-red-500", percentage: 25 },
  fair: { label: "Fair", color: "bg-yellow-500", percentage: 50 },
  good: { label: "Good", color: "bg-blue-500", percentage: 75 },
  strong: { label: "Strong", color: "bg-green-500", percentage: 100 },
};



