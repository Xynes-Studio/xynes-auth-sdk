/**
 * SDK Configuration
 *
 * @description Centralized configuration for the auth SDK.
 * Provides type-safe config creation and validation.
 *
 * @example
 * ```typescript
 * import { createAuthConfig } from '@xynes/auth-sdk';
 *
 * const config = createAuthConfig({
 *   supabase: {
 *     url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *     anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 *   },
 *   api: {
 *     baseUrl: process.env.NEXT_PUBLIC_API_URL!,
 *   },
 *   auth: {
 *     appUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL!,
 *     cookieDomain: '.xynes.com',
 *   },
 *   features: {
 *     enableMFA: true,
 *   },
 * });
 * ```
 */

import {
  type AuthFeatureFlags,
  createFeatureFlags,
} from "./feature-flags";

/**
 * Module override configuration
 */
export interface ModuleOverride {
  /** Whether the module is enabled */
  enabled: boolean;
}

/**
 * Supabase configuration
 */
export interface SupabaseConfig {
  /** Supabase project URL */
  url: string;
  /** Supabase anonymous key (safe to expose) */
  anonKey: string;
}

/**
 * API configuration
 */
export interface ApiConfig {
  /** Base URL for the accounts API */
  baseUrl: string;
}

/**
 * Auth app configuration
 */
export interface AuthAppConfig {
  /** URL of the auth app (e.g., https://auth.xynes.com) */
  appUrl: string;
  /** Cookie domain for session sharing (e.g., .xynes.com) */
  cookieDomain?: string;
}

/**
 * Complete SDK configuration
 */
export interface AuthSDKConfig {
  /** Supabase configuration */
  supabase: SupabaseConfig;
  /** API configuration */
  api: ApiConfig;
  /** Auth app configuration */
  auth: AuthAppConfig;
  /** Feature flags */
  features: AuthFeatureFlags;
  /** Module overrides */
  modules?: Record<string, ModuleOverride>;
}

/**
 * Input for creating SDK config (partial features allowed)
 */
export interface AuthSDKConfigInput {
  supabase: SupabaseConfig;
  api: ApiConfig;
  auth: AuthAppConfig;
  features?: Partial<AuthFeatureFlags>;
  modules?: Record<string, ModuleOverride>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the config is valid */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
}

/**
 * Create SDK configuration with defaults
 *
 * @param input - Configuration input
 * @returns Complete SDK configuration
 *
 * @example
 * ```typescript
 * const config = createAuthConfig({
 *   supabase: { url: '...', anonKey: '...' },
 *   api: { baseUrl: '...' },
 *   auth: { appUrl: '...' },
 * });
 * ```
 */
export function createAuthConfig(input: AuthSDKConfigInput): AuthSDKConfig {
  return {
    supabase: input.supabase,
    api: input.api,
    auth: input.auth,
    features: createFeatureFlags(input.features),
    modules: input.modules,
  };
}

/**
 * Validate SDK configuration
 *
 * @param config - Configuration to validate
 * @returns Validation result with errors if invalid
 *
 * @example
 * ```typescript
 * const result = validateAuthConfig(config);
 * if (!result.valid) {
 *   console.error('Invalid config:', result.errors);
 * }
 * ```
 */
export function validateAuthConfig(config: AuthSDKConfig): ValidationResult {
  const errors: string[] = [];

  // Validate Supabase config
  if (!config.supabase.url) {
    errors.push("supabase.url is required");
  } else if (!isValidUrl(config.supabase.url)) {
    errors.push("supabase.url must be a valid URL");
  }
  if (!config.supabase.anonKey) {
    errors.push("supabase.anonKey is required");
  }

  // Validate API config
  if (!config.api.baseUrl) {
    errors.push("api.baseUrl is required");
  } else if (!isValidUrl(config.api.baseUrl)) {
    errors.push("api.baseUrl must be a valid URL");
  }

  // Validate Auth config
  if (!config.auth.appUrl) {
    errors.push("auth.appUrl is required");
  } else if (!isValidUrl(config.auth.appUrl)) {
    errors.push("auth.appUrl must be a valid URL");
  }

  // Validate cookie domain format if provided
  if (config.auth.cookieDomain && !isValidCookieDomain(config.auth.cookieDomain)) {
    errors.push("auth.cookieDomain must start with a dot (e.g., .xynes.com)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate URL format
 * @internal
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate cookie domain format
 * @internal
 */
function isValidCookieDomain(domain: string): boolean {
  // Cookie domain should start with a dot for subdomain sharing
  // or be a valid hostname
  return domain.startsWith(".") || /^[a-z0-9.-]+$/i.test(domain);
}
