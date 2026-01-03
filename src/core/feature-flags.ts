/**
 * Feature Flags
 *
 * @description Runtime configuration system for enabling/disabling
 * auth features. Allows consumer apps to customize the SDK behavior.
 *
 * @example
 * ```typescript
 * import { createFeatureFlags, isFeatureEnabled } from '@xynes/auth-sdk';
 *
 * const flags = createFeatureFlags({
 *   enableMFA: true,
 *   enableOAuthApple: true,
 * });
 *
 * if (isFeatureEnabled(flags, 'enableMFA')) {
 *   // Show MFA setup UI
 * }
 * ```
 */

/**
 * Feature flags configuration interface
 *
 * All flags are boolean values that enable/disable specific features.
 */
export interface AuthFeatureFlags {
  // ─────────────────────────────────────────────────────────────────
  // Core Auth
  // ─────────────────────────────────────────────────────────────────
  /** Enable email/password authentication */
  enableEmailAuth: boolean;
  /** Enable Google OAuth provider */
  enableOAuthGoogle: boolean;
  /** Enable GitHub OAuth provider */
  enableOAuthGitHub: boolean;
  /** Enable Apple OAuth provider */
  enableOAuthApple: boolean;

  // ─────────────────────────────────────────────────────────────────
  // Workspace Features
  // ─────────────────────────────────────────────────────────────────
  /** Allow users to create new workspaces */
  enableWorkspaceCreation: boolean;
  /** Allow switching between workspaces */
  enableWorkspaceSwitching: boolean;
  /** Allow users to belong to multiple workspaces */
  enableMultipleWorkspaces: boolean;

  // ─────────────────────────────────────────────────────────────────
  // Invite System
  // ─────────────────────────────────────────────────────────────────
  /** Enable workspace invite system */
  enableInvites: boolean;
  /** Allow revoking sent invites */
  enableInviteRevocation: boolean;

  // ─────────────────────────────────────────────────────────────────
  // Security
  // ─────────────────────────────────────────────────────────────────
  /** Enable multi-factor authentication */
  enableMFA: boolean;
  /** Enable session management UI */
  enableSessionManagement: boolean;
  /** Show rate limit warnings in UI */
  enableRateLimitUI: boolean;
  /** Enable CSP violation reporting */
  enableCSPReporting: boolean;

  // ─────────────────────────────────────────────────────────────────
  // UX Features
  // ─────────────────────────────────────────────────────────────────
  /** Enable "Remember Me" checkbox on login */
  enableRememberMe: boolean;
  /** Enable password reset flow */
  enablePasswordReset: boolean;
  /** Enable user profile editing */
  enableProfileEdit: boolean;
}

/**
 * Default feature flags
 *
 * These are the recommended defaults for most applications.
 * Override specific flags as needed.
 */
export const DEFAULT_FLAGS: AuthFeatureFlags = {
  // Core Auth - most are enabled by default
  enableEmailAuth: true,
  enableOAuthGoogle: true,
  enableOAuthGitHub: true,
  enableOAuthApple: false, // Requires Apple Developer account

  // Workspace - all enabled for full functionality
  enableWorkspaceCreation: true,
  enableWorkspaceSwitching: true,
  enableMultipleWorkspaces: true,

  // Invites - enabled for team collaboration
  enableInvites: true,
  enableInviteRevocation: true,

  // Security - conservative defaults
  enableMFA: false, // Phase 2 feature
  enableSessionManagement: false, // Phase 2 feature
  enableRateLimitUI: true, // Always show rate limit errors
  enableCSPReporting: true, // Security monitoring

  // UX - all enabled for best experience
  enableRememberMe: true,
  enablePasswordReset: true,
  enableProfileEdit: true,
};

/**
 * Create feature flags with optional overrides
 *
 * @param overrides - Partial flags to override defaults
 * @returns Complete feature flags object
 *
 * @example
 * ```typescript
 * const flags = createFeatureFlags({
 *   enableMFA: true,
 *   enableOAuthApple: true,
 * });
 * ```
 */
export function createFeatureFlags(
  overrides: Partial<AuthFeatureFlags> = {}
): AuthFeatureFlags {
  return {
    ...DEFAULT_FLAGS,
    ...overrides,
  };
}

/**
 * Check if a specific feature is enabled
 *
 * @param flags - Feature flags object
 * @param flag - Flag key to check
 * @returns Whether the feature is enabled
 *
 * @example
 * ```typescript
 * if (isFeatureEnabled(flags, 'enableMFA')) {
 *   // Show MFA UI
 * }
 * ```
 */
export function isFeatureEnabled(
  flags: AuthFeatureFlags,
  flag: keyof AuthFeatureFlags
): boolean {
  return flags[flag];
}

/**
 * Merge two feature flag objects
 *
 * Creates a new object with base flags overridden by override flags.
 * Does not mutate either input object.
 *
 * @param base - Base feature flags
 * @param overrides - Flags to override
 * @returns New merged feature flags object
 *
 * @example
 * ```typescript
 * const merged = mergeFeatureFlags(currentFlags, { enableMFA: true });
 * ```
 */
export function mergeFeatureFlags(
  base: AuthFeatureFlags,
  overrides: Partial<AuthFeatureFlags>
): AuthFeatureFlags {
  return {
    ...base,
    ...overrides,
  };
}
