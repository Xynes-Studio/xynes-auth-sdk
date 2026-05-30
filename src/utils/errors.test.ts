import { describe, it, expect } from "vitest";
import {
  normalizeAuthError,
  isRetryableError,
  getErrorMessage,
  isRefreshTokenError,
} from "./errors";
import type { AuthErrorCode } from "../types";

describe("error utilities", () => {
  describe("normalizeAuthError", () => {
    it('should normalize Supabase "Invalid login credentials" error', () => {
      const error = normalizeAuthError({
        message: "Invalid login credentials",
        code: "invalid_credentials",
      });
      expect(error.code).toBe("invalid_credentials");
      expect(error.message).toContain("email or password");
    });

    it("should normalize email not confirmed error", () => {
      const error = normalizeAuthError({
        message: "Email not confirmed",
        code: "email_not_confirmed",
      });
      expect(error.code).toBe("email_not_verified");
    });

    it("should normalize user already registered error", () => {
      const error = normalizeAuthError({
        message: "User already registered",
        code: "user_already_exists",
      });
      expect(error.code).toBe("email_already_exists");
    });

    it("should normalize weak password error", () => {
      const error = normalizeAuthError({
        message: "Password should be at least 8 characters",
        code: "weak_password",
      });
      expect(error.code).toBe("weak_password");
    });

    it("should normalize rate limited error", () => {
      const error = normalizeAuthError({
        message:
          "For security purposes, you can only request this once every 60 seconds",
        code: "over_request_rate_limit",
      });
      expect(error.code).toBe("rate_limited");
    });

    it("should normalize network errors", () => {
      const error = normalizeAuthError({
        message: "Failed to fetch",
      });
      expect(error.code).toBe("network_error");
    });

    it("should return unknown_error for unrecognized errors", () => {
      const error = normalizeAuthError({
        message: "Some random error",
        code: "random_code",
      });
      expect(error.code).toBe("unknown_error");
    });

    it("should handle string errors", () => {
      const error = normalizeAuthError("Invalid login credentials");
      expect(error.code).toBe("invalid_credentials");
    });

    it("should handle null/undefined", () => {
      const error = normalizeAuthError(null);
      expect(error.code).toBe("unknown_error");
    });
  });

  describe("isRetryableError", () => {
    it("should return true for network errors", () => {
      expect(isRetryableError("network_error")).toBe(true);
    });

    it("should return true for rate limited errors", () => {
      expect(isRetryableError("rate_limited")).toBe(true);
    });

    it("should return false for credential errors", () => {
      expect(isRetryableError("invalid_credentials")).toBe(false);
      expect(isRetryableError("weak_password")).toBe(false);
      expect(isRetryableError("email_already_exists")).toBe(false);
    });
  });

  describe("getErrorMessage", () => {
    const errorMessages: Record<AuthErrorCode, string> = {
      invalid_credentials: "Invalid email or password. Please try again.",
      email_not_verified: "Please verify your email before signing in.",
      user_not_found: "No account found with this email.",
      email_already_exists: "An account with this email already exists.",
      weak_password: "Password is too weak. Please use a stronger password.",
      invalid_email: "Please enter a valid email address.",
      network_error:
        "Unable to connect. Please check your internet connection.",
      session_expired: "Your session has expired. Please sign in again.",
      rate_limited: "Too many attempts. Please wait a moment and try again.",
      invite_not_found: "This invitation is invalid or has expired.",
      already_in_workspace: "You are already a member of this workspace.",
      unknown_error: "An unexpected error occurred. Please try again.",
    };

    Object.entries(errorMessages).forEach(([code, expectedMessage]) => {
      it(`should return correct message for ${code}`, () => {
        expect(getErrorMessage(code as AuthErrorCode)).toBe(expectedMessage);
      });
    });
  });

  describe("isRefreshTokenError (BUG-AUTH-4)", () => {
    it("should detect Supabase 'Invalid Refresh Token: Refresh Token Not Found' message", () => {
      expect(
        isRefreshTokenError({
          message: "Invalid Refresh Token: Refresh Token Not Found",
          name: "AuthApiError",
        }),
      ).toBe(true);
    });

    it("should detect the refresh_token_not_found Supabase code", () => {
      expect(
        isRefreshTokenError({
          message: "Refresh token not found",
          code: "refresh_token_not_found",
        }),
      ).toBe(true);
    });

    it("should detect refresh_token_already_used", () => {
      expect(
        isRefreshTokenError({
          message: "Refresh token already used",
          code: "refresh_token_already_used",
        }),
      ).toBe(true);
    });

    it("should detect AuthSessionMissingError name", () => {
      expect(
        isRefreshTokenError({
          message: "Auth session missing!",
          name: "AuthSessionMissingError",
        }),
      ).toBe(true);
    });

    it("should detect session_not_found code", () => {
      expect(
        isRefreshTokenError({
          message: "Session not found",
          code: "session_not_found",
        }),
      ).toBe(true);
    });

    it("should be case-insensitive on the message body", () => {
      expect(
        isRefreshTokenError({
          message: "INVALID REFRESH TOKEN: REFRESH TOKEN NOT FOUND",
        }),
      ).toBe(true);
    });

    it("should NOT match generic auth errors (invalid credentials)", () => {
      expect(
        isRefreshTokenError({
          message: "Invalid login credentials",
          code: "invalid_credentials",
        }),
      ).toBe(false);
    });

    it("should NOT match network errors", () => {
      expect(
        isRefreshTokenError({
          message: "Failed to fetch",
        }),
      ).toBe(false);
    });

    it("should NOT match invite-not-found errors", () => {
      expect(
        isRefreshTokenError({
          statusCode: 404,
          message: "Invite not found",
          code: "invite_not_found",
        }),
      ).toBe(false);
    });

    it("should handle null / undefined / non-objects", () => {
      expect(isRefreshTokenError(null)).toBe(false);
      expect(isRefreshTokenError(undefined)).toBe(false);
      expect(isRefreshTokenError("Invalid Refresh Token")).toBe(false);
      expect(isRefreshTokenError(404)).toBe(false);
    });

    it("should handle objects missing message / code / name without throwing", () => {
      expect(isRefreshTokenError({})).toBe(false);
      expect(isRefreshTokenError({ message: 42 })).toBe(false);
      expect(isRefreshTokenError({ code: 42 })).toBe(false);
    });
  });
});
