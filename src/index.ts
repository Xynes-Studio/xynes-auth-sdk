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
  ModuleOverride,
  ValidationResult as ConfigValidationResult,
} from "./core";

// ─────────────────────────────────────────────────────────────────
// PROVIDERS
// ─────────────────────────────────────────────────────────────────
export { AuthProvider, useAuth } from "./providers/AuthProvider";
export { WorkspaceProvider, useWorkspace } from "./providers/WorkspaceProvider";
export type { AuthProviderProps, WorkspaceProviderProps } from "./providers";

// ─────────────────────────────────────────────────────────────────
// HOOKS (lazy-loaded internally)
// ─────────────────────────────────────────────────────────────────
export { useInvite } from "./hooks/useInvite";
export { useWorkspaces } from "./hooks/useWorkspaces";
export type { UseInviteResult, UseWorkspacesResult } from "./hooks";

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
} from "./utils/redirect";

export {
  normalizeAuthError,
  isRetryableError,
  getErrorMessage,
} from "./utils/errors";

// ─────────────────────────────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────────────────────────────
export {
  validateEmail,
  validatePassword,
  getPasswordStrength,
  PASSWORD_STRENGTH_CONFIG,
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
