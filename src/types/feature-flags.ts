/**
 * Feature flags response from the backend /flags endpoint
 */
export interface FeatureFlagsResponse {
  flags: FeatureFlags;
  authenticated: boolean;
}

/**
 * All feature flags from the backend
 * Naming convention: xynes_{domain}_{feature}
 */
export interface FeatureFlags {
  // Auth - OAuth Providers
  xynes_auth_oauth_google: boolean;
  xynes_auth_oauth_github: boolean;
  xynes_auth_oauth_apple: boolean;

  // Auth - Core Features
  xynes_auth_email_signup: boolean;
  xynes_auth_password_reset: boolean;
  xynes_auth_mfa: boolean;
  xynes_auth_remember_me: boolean;
  xynes_auth_session_management: boolean;
  xynes_auth_rate_limit_ui: boolean;
  xynes_auth_profile_edit: boolean;
  xynes_auth_dashboard_apps_v1: boolean;

  // Workspace Features
  xynes_workspace_creation: boolean;
  xynes_workspace_switching: boolean;
  xynes_workspace_multiple: boolean;

  // Invite System
  xynes_invite_system: boolean;
  xynes_invite_revocation: boolean;

  // System
  xynes_maintenance_mode: boolean;
}

/**
 * Default feature flags (fallback when API is unavailable)
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  // Auth - OAuth (disabled by default for safety)
  xynes_auth_oauth_google: false,
  xynes_auth_oauth_github: false,
  xynes_auth_oauth_apple: false,

  // Auth - Core (enabled by default)
  xynes_auth_email_signup: true,
  xynes_auth_password_reset: true,
  xynes_auth_mfa: false,
  xynes_auth_remember_me: true,
  xynes_auth_session_management: false,
  xynes_auth_rate_limit_ui: true,
  xynes_auth_profile_edit: true,
  xynes_auth_dashboard_apps_v1: false,

  // Workspace (enabled by default)
  xynes_workspace_creation: true,
  xynes_workspace_switching: true,
  xynes_workspace_multiple: true,

  // Invite (enabled by default)
  xynes_invite_system: true,
  xynes_invite_revocation: true,

  // System
  xynes_maintenance_mode: false,
};

/**
 * Feature flag key type for type-safe access
 */
export type FeatureFlagKey = keyof FeatureFlags;

/**
 * OAuth provider configuration derived from flags
 */
export interface OAuthProviderConfig {
  google: boolean;
  github: boolean;
  apple: boolean;
}

/**
 * Feature flags context state
 */
export interface FeatureFlagsState {
  flags: FeatureFlags;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  lastFetched: Date | null;
}

/**
 * Feature flags context value
 */
export interface FeatureFlagsContextValue extends FeatureFlagsState {
  /** Check if a specific flag is enabled */
  isEnabled: (flag: FeatureFlagKey) => boolean;
  /** Get OAuth provider configuration */
  getOAuthProviders: () => OAuthProviderConfig;
  /** Check if any OAuth provider is enabled */
  hasOAuthProviders: () => boolean;
  /** Manually refetch flags */
  refetch: () => Promise<void>;
}
