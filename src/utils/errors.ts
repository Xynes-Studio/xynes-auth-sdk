import type { AuthError, AuthErrorCode } from "../types";

/**
 * User-friendly error messages for each error code
 */
const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: "Invalid email or password. Please try again.",
  email_not_verified: "Please verify your email before signing in.",
  user_not_found: "No account found with this email.",
  email_already_exists: "An account with this email already exists.",
  weak_password: "Password is too weak. Please use a stronger password.",
  invalid_email: "Please enter a valid email address.",
  network_error: "Unable to connect. Please check your internet connection.",
  session_expired: "Your session has expired. Please sign in again.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
  invite_not_found: "This invitation is invalid or has expired.",
  already_in_workspace: "You are already a member of this workspace.",
  unknown_error: "An unexpected error occurred. Please try again.",
};

/**
 * Closed-set translation keys for auth error messaging.
 *
 * Consumers should use this mapping (or `getAuthErrorMessageKey`) to resolve
 * i18n keys rather than rendering backend-facing error text directly.
 */
export const AUTH_ERROR_MESSAGE_KEYS: Readonly<
  Record<AuthErrorCode, AuthErrorCode>
> = Object.freeze({
  invalid_credentials: "invalid_credentials",
  email_not_verified: "email_not_verified",
  user_not_found: "user_not_found",
  email_already_exists: "email_already_exists",
  weak_password: "weak_password",
  invalid_email: "invalid_email",
  network_error: "network_error",
  session_expired: "session_expired",
  rate_limited: "rate_limited",
  invite_not_found: "invite_not_found",
  already_in_workspace: "already_in_workspace",
  unknown_error: "unknown_error",
});

/**
 * Error codes that can be retried (e.g., network issues, rate limiting)
 */
const RETRYABLE_ERROR_CODES: AuthErrorCode[] = [
  "network_error",
  "rate_limited",
];

/**
 * Mapping of Supabase error messages/codes to our normalized error codes
 */
const ERROR_CODE_MAP: Record<string, AuthErrorCode> = {
  // Supabase error codes
  invalid_credentials: "invalid_credentials",
  email_not_confirmed: "email_not_verified",
  user_not_found: "user_not_found",
  user_already_exists: "email_already_exists",
  weak_password: "weak_password",
  invalid_email: "invalid_email",
  over_request_rate_limit: "rate_limited",
  session_not_found: "session_expired",

  // Common error message patterns
  "invalid login credentials": "invalid_credentials",
  "email not confirmed": "email_not_verified",
  "user already registered": "email_already_exists",
  "password should be": "weak_password",
  "failed to fetch": "network_error",
  network: "network_error",
  "session expired": "session_expired",
  "rate limit": "rate_limited",
  "invite not found": "invite_not_found",
  "invitation not found": "invite_not_found",
  "already a member": "already_in_workspace",
  "already in workspace": "already_in_workspace",
};

/**
 * Normalizes various error formats from Supabase into a consistent AuthError format.
 *
 * @param error - The error from Supabase or other sources
 * @returns Normalized AuthError object
 */
export function normalizeAuthError(error: unknown): AuthError {
  // Handle null/undefined
  if (!error) {
    return {
      code: "unknown_error",
      message: ERROR_MESSAGES.unknown_error,
    };
  }

  // Handle string errors
  if (typeof error === "string") {
    const code = findErrorCode(error);
    return {
      code,
      message: ERROR_MESSAGES[code],
    };
  }

  // Handle error objects
  if (typeof error === "object") {
    const errorObj = error as { message?: string; code?: string };
    const errorCode = errorObj.code?.toLowerCase() || "";
    const errorMessage = errorObj.message?.toLowerCase() || "";

    // First try to match by code
    if (errorCode && ERROR_CODE_MAP[errorCode]) {
      const code = ERROR_CODE_MAP[errorCode];
      return {
        code,
        message: ERROR_MESSAGES[code],
      };
    }

    // Then try to match by message
    const code = findErrorCode(errorMessage);
    return {
      code,
      message: ERROR_MESSAGES[code],
    };
  }

  return {
    code: "unknown_error",
    message: ERROR_MESSAGES.unknown_error,
  };
}

/**
 * Finds the error code by matching against known error patterns
 */
function findErrorCode(message: string): AuthErrorCode {
  const lowerMessage = message.toLowerCase();

  for (const [pattern, code] of Object.entries(ERROR_CODE_MAP)) {
    if (lowerMessage.includes(pattern)) {
      return code;
    }
  }

  return "unknown_error";
}

/**
 * Determines if an error is retryable (e.g., network issues)
 *
 * @param errorCode - The error code to check
 * @returns true if the error can be retried
 */
export function isRetryableError(errorCode: AuthErrorCode): boolean {
  return RETRYABLE_ERROR_CODES.includes(errorCode);
}

/**
 * Gets the user-friendly error message for an error code
 *
 * @param errorCode - The error code
 * @returns Human-readable error message
 */
export function getErrorMessage(errorCode: AuthErrorCode): string {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.unknown_error;
}

/**
 * Returns the closed-set translation key for an auth error code.
 * Unknown values fail closed to `unknown_error`.
 */
export function getAuthErrorMessageKey(errorCode: string): AuthErrorCode {
  if (errorCode in AUTH_ERROR_MESSAGE_KEYS) {
    return errorCode as AuthErrorCode;
  }

  return "unknown_error";
}

/**
 * Detects whether an error originated from Supabase's refresh-token /
 * session-refresh internals (e.g. "Invalid Refresh Token: Refresh Token Not
 * Found", "AuthSessionMissingError", "session_not_found"). Used by callers
 * that need to treat these as recoverable side-effects rather than fatal
 * failures of the in-flight request.
 *
 * BUG-AUTH-4 (2026-05-30): added so that `useInvite.acceptInvite` can
 * distinguish a Supabase auto-refresh side-effect (which leaves the join
 * successful on the backend) from a genuine accept failure, and so
 * `getAccessToken` can fall back to `null` instead of poisoning a caller's
 * try/catch chain.
 *
 * @param error - Any thrown value.
 * @returns true if the error message/code matches a known refresh-token
 *   failure surface from Supabase auth-js.
 */
export function isRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as {
    message?: unknown;
    code?: unknown;
    name?: unknown;
    status?: unknown;
  };

  const message =
    typeof maybe.message === "string" ? maybe.message.toLowerCase() : "";
  const code = typeof maybe.code === "string" ? maybe.code.toLowerCase() : "";
  const name = typeof maybe.name === "string" ? maybe.name.toLowerCase() : "";

  if (
    code === "refresh_token_not_found" ||
    code === "refresh_token_already_used" ||
    code === "session_not_found"
  ) {
    return true;
  }

  if (name === "authsessionmissingerror") {
    return true;
  }

  if (
    message.includes("refresh token not found") ||
    message.includes("invalid refresh token") ||
    message.includes("refresh_token_not_found") ||
    message.includes("auth session missing")
  ) {
    return true;
  }

  return false;
}
