// Providers
export { AuthProvider, useAuth } from "./providers/AuthProvider";
export { WorkspaceProvider, useWorkspace } from "./providers/WorkspaceProvider";
export type { AuthProviderProps, WorkspaceProviderProps } from "./providers";

// Hooks
export { useInvite } from "./hooks/useInvite";
export { useWorkspaces } from "./hooks/useWorkspaces";
export type { UseInviteResult, UseWorkspacesResult } from "./hooks";

// API Client
export { AccountsClient, createAccountsClient } from "./api/accounts-client";
export type { AccountsClientConfig, ApiError } from "./api";

// Components
export { AuthGuard } from "./components/AuthGuard";
export type { AuthGuardProps } from "./components";

// Utilities
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

export {
  validateEmail,
  validatePassword,
  getPasswordStrength,
  PASSWORD_STRENGTH_CONFIG,
} from "./utils/validation";
export type { PasswordStrength, ValidationResult } from "./utils/validation";

// Types
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
