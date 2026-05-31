/**
 * User object from accounts-service /me endpoint
 */
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Workspace object
 */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  planType: "free" | "pro" | "enterprise";
  role: WorkspaceRole;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Workspace role types
 */
export type WorkspaceRole =
  | "workspace_owner"
  | "workspace_admin"
  | "workspace_member";

/**
 * Workspace invite object
 */
export interface WorkspaceInvite {
  id: string;
  token?: string;
  workspaceId: string;
  workspaceSlug?: string | null;
  workspaceName: string;
  inviterName: string | null;
  inviterEmail: string | null;
  inviteeEmail: string;
  role: WorkspaceRole;
  roleKey?: WorkspaceRole;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
}

/**
 * Invite status types
 */
export type InviteStatus = "pending" | "accepted" | "expired" | "cancelled";

/**
 * Result returned when creating a workspace invite.
 * Note: the `token` is only returned once at creation time.
 */
export interface WorkspaceInviteCreateResult {
  id: string;
  workspaceId: string;
  email: string;
  roleKey: WorkspaceRole;
  status: "pending";
  expiresAt: string;
  token: string;
}

/**
 * Result returned when accepting an invite.
 */
export interface WorkspaceInviteAcceptResult {
  accepted: true;
  workspaceId: string;
  roleKey: WorkspaceRole;
  workspaceMemberCreated: boolean;
  workspace: Workspace | null;
}

/**
 * Auth state for the AuthProvider
 */
export interface AuthState {
  user: User | null;
  workspaces: Workspace[];
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
}

/**
 * Auth error object
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

/**
 * Auth error codes
 */
export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_verified"
  | "user_not_found"
  | "email_already_exists"
  | "weak_password"
  | "invalid_email"
  | "network_error"
  | "session_expired"
  | "rate_limited"
  | "invite_not_found"
  | "already_in_workspace"
  | "invite_email_mismatch"
  | "unknown_error";

/**
 * SDK configuration
 */
export interface CrossAppRedirectConfig {
  /** Consumer app base URL used for cross-app redirects */
  appUrl?: string;
  /**
   * Redirect allowlist as hostnames or host:port (no scheme/path)
   * @example ['xynes.com', 'localhost:3000']
   */
  allowedDomains?: string[];
  /** Safe fallback route used when redirect is invalid */
  fallbackPath?: string;
}

export interface CrossAppSessionConfig {
  /** Cookie domain override for cross-app sessions */
  cookieDomain?: string;
  /** Force secure cookie semantics when required */
  secureCookies?: boolean;
  /** Session cookie name override */
  cookieName?: string;
}

export interface CrossAppConfig {
  redirects?: CrossAppRedirectConfig;
  session?: CrossAppSessionConfig;
}

export interface AuthConfig {
  supabaseUrl: string;
  supabaseKey: string;
  apiBaseUrl: string;
  authAppUrl: string;
  appUrl?: string;
  cookieDomain?: string;
  /**
   * Allowed domains for redirect URLs (security: prevents open redirects)
   * @example ['xynes.com', 'localhost:3000']
   */
  allowedRedirectDomains?: string[];
  crossApp?: CrossAppConfig;
}

/**
 * OAuth provider types
 */
export type OAuthProvider = "google" | "github";

/**
 * Sign up input
 */
export interface SignUpInput {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Sign in input
 */
export interface SignInInput {
  email: string;
  password: string;
}

/**
 * Auth result from sign up/sign in
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: AuthError;
  needsEmailVerification?: boolean;
}

/**
 * Bootstrap response from /me endpoint
 */
export interface BootstrapResponse {
  user: User;
  workspaces: Workspace[];
}
