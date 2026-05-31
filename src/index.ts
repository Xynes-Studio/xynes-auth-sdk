// ─────────────────────────────────────────────────────────────────
// CORE (always available)
// ─────────────────────────────────────────────────────────────────
export {
  // Module Registry
  ModuleRegistry,
  moduleRegistry,
  MODULE_IDS,
  // Feature Flags
  DEFAULT_FLAGS,
  createFeatureFlags,
  isFeatureEnabled,
  mergeFeatureFlags,
  // Configuration
  createAuthConfig,
  validateAuthConfig,
} from "./core";

export type {
  // Module Registry Types
  AuthModule,
  RouteConfig,
  LayoutType,
  GuardType,
  ModuleId,
  // Feature Flags Types
  AuthFeatureFlags,
  // Configuration Types
  AuthSDKConfig,
  AuthSDKConfigInput,
  SupabaseConfig,
  ApiConfig,
  AuthAppConfig,
  CrossAppConfig,
  CrossAppRedirectConfig,
  CrossAppSessionConfig,
  ModuleOverride,
  ValidationResult as ConfigValidationResult,
} from "./core";

// ─────────────────────────────────────────────────────────────────
// PROVIDERS
// ─────────────────────────────────────────────────────────────────
export { AuthProvider, useAuth } from "./providers/AuthProvider";
export { WorkspaceProvider, useWorkspace } from "./providers/WorkspaceProvider";
export {
  FeatureFlagsProvider,
  useFeatureFlags,
  useFeatureFlag,
  useOAuthProviders,
  useMaintenanceMode,
} from "./providers/FeatureFlagsProvider";
export type {
  AuthProviderProps,
  WorkspaceProviderProps,
  FeatureFlagsProviderProps,
} from "./providers";

// ─────────────────────────────────────────────────────────────────
// HOOKS (lazy-loaded internally)
// ─────────────────────────────────────────────────────────────────
export { useInvite } from "./hooks/useInvite";
export { useWorkspaces } from "./hooks/useWorkspaces";
export type { UseInviteResult, UseWorkspacesResult } from "./hooks";

// ─────────────────────────────────────────────────────────────────
// WORKSPACE UTILITIES (for building custom workspace switchers)
// ─────────────────────────────────────────────────────────────────
export {
  getWorkspaceInitials,
  formatWorkspaceRole,
  sortWorkspacesForSwitcher,
  getOtherWorkspaces,
  sanitizeWorkspaceSlug,
  buildWorkspaceDashboardUrl,
  getWorkspaceSwitcherAriaLabel,
} from "./modules/workspace/utils";

// ─────────────────────────────────────────────────────────────────
// API CLIENT
// ─────────────────────────────────────────────────────────────────
export { AccountsClient, createAccountsClient } from "./api/accounts-client";
export type { AccountsClientConfig, ApiError } from "./api";

// ─────────────────────────────────────────────────────────────────
// COMPONENTS (tree-shakeable)
// ─────────────────────────────────────────────────────────────────
export { AuthGuard } from "./components/AuthGuard";
export type { AuthGuardProps } from "./components";

// ─────────────────────────────────────────────────────────────────
// SECURITY UTILITIES
// ─────────────────────────────────────────────────────────────────
export {
  isValidRedirectUrl,
  getSafeRedirectUrl,
  buildAuthRedirectUrl,
  buildAuthLoginUrl,
  buildAuthLogoutUrl,
} from "./utils/redirect";

export { getCsrfToken } from "./utils/csrf";
export { sanitizeHtml, escapeHtml } from "./utils/sanitize";
export { useRateLimit } from "./modules/security/useRateLimit";

export {
  normalizeAuthError,
  isRetryableError,
  getErrorMessage,
  getAuthErrorMessageKey,
  AUTH_ERROR_MESSAGE_KEYS,
} from "./utils/errors";

// ─────────────────────────────────────────────────────────────────
// LOADING STATE UTILITIES (AUTH-FE-1.8)
// ─────────────────────────────────────────────────────────────────
export {
  createLoadingState,
  createIdleState,
  isLoadingActive,
  requiresFullPageLoading,
  getLoadingAnnouncement,
  mergeLoadingStates,
  getButtonLoadingText,
  LOADING_STATES,
  BUTTON_LOADING_TEXT,
} from "./utils/loading";
export type {
  LoadingStateType,
  LoadingState,
  LoadingStateConfig,
  ButtonLoadingKey,
} from "./utils/loading";

// ─────────────────────────────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────────────────────────────
export {
  validateEmail,
  validatePassword,
  getPasswordStrength,
  PASSWORD_STRENGTH_CONFIG,
  emailSchema,
  passwordSchema,
  workspaceNameSchema,
  workspaceSlugSchema,
} from "./utils/validation";
export type { PasswordStrength, ValidationResult } from "./utils/validation";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
export type {
  User,
  Workspace,
  WorkspaceRole,
  WorkspaceInvite,
  WorkspaceInviteCreateResult,
  WorkspaceInviteAcceptResult,
  InviteStatus,
  AuthState,
  AuthError,
  AuthErrorCode,
  AuthConfig,
  OAuthProvider,
  SignUpInput,
  SignInInput,
  AuthResult,
  BootstrapResponse,
} from "./types";

// Feature Flags Types
export type {
  FeatureFlags,
  FeatureFlagsResponse,
  FeatureFlagKey,
  FeatureFlagsState,
  FeatureFlagsContextValue,
  OAuthProviderConfig,
} from "./types/feature-flags";
export { DEFAULT_FEATURE_FLAGS } from "./types/feature-flags";
export { normalizeFeatureFlags } from "./utils/feature-flags";
