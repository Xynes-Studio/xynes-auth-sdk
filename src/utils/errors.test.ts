import { describe, it, expect } from "vitest";
import {
  normalizeAuthError,
  isRetryableError,
  getErrorMessage,
  getAuthErrorMessageKey,
  AUTH_ERROR_MESSAGE_KEYS,
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

  describe("AUTH_ERROR_MESSAGE_KEYS", () => {
    it("is an identity map — every value equals its key", () => {
      for (const [code, key] of Object.entries(AUTH_ERROR_MESSAGE_KEYS)) {
        expect(key).toBe(code);
      }
    });

    it("includes every AuthErrorCode value", () => {
      // Spot-check the closed set (the AuthErrorCode union is verified at
      // compile time; this is a runtime guard that ensures the map is
      // exhaustive in practice).
      const expected: AuthErrorCode[] = [
        "invalid_credentials",
        "email_not_verified",
        "user_not_found",
        "email_already_exists",
        "weak_password",
        "invalid_email",
        "network_error",
        "session_expired",
        "rate_limited",
        "invite_not_found",
        "already_in_workspace",
        "unknown_error",
      ];
      for (const code of expected) {
        expect(AUTH_ERROR_MESSAGE_KEYS[code]).toBe(code);
      }
    });
  });

  describe("getAuthErrorMessageKey", () => {
    it("returns the same key for a known AuthErrorCode", () => {
      expect(getAuthErrorMessageKey("invalid_credentials")).toBe(
        "invalid_credentials",
      );
      expect(getAuthErrorMessageKey("network_error")).toBe("network_error");
      expect(getAuthErrorMessageKey("unknown_error")).toBe("unknown_error");
    });

    it("falls back to 'unknown_error' for an unrecognized code", () => {
      expect(getAuthErrorMessageKey("not_a_real_code")).toBe("unknown_error");
      expect(getAuthErrorMessageKey("")).toBe("unknown_error");
    });

    it("coerces hostile prototype-pollution-style inputs to 'unknown_error'", () => {
      // Defense-in-depth: an attacker who controls the upstream `error.code`
      // value cannot use `__proto__` / `constructor` / `toString` to escape
      // the closed catalog set, because the resolver uses
      // `hasOwnProperty` against the AUTH_ERROR_MESSAGE_KEYS map (which is
      // a plain object literal that does not declare those keys).
      expect(getAuthErrorMessageKey("__proto__")).toBe("unknown_error");
      expect(getAuthErrorMessageKey("constructor")).toBe("unknown_error");
      expect(getAuthErrorMessageKey("toString")).toBe("unknown_error");
      expect(getAuthErrorMessageKey("hasOwnProperty")).toBe("unknown_error");
    });

    it("treats non-string inputs as unknown (defense-in-depth)", () => {
      // The type signature says `string`, but a hostile caller (or a
      // malformed JSON payload deserialized as `unknown`) might pass
      // numbers, objects, null, or undefined. All must resolve to
      // 'unknown_error', never throw.
      // @ts-expect-error - intentionally invalid runtime input
      expect(getAuthErrorMessageKey(123)).toBe("unknown_error");
      // @ts-expect-error - intentionally invalid runtime input
      expect(getAuthErrorMessageKey(null)).toBe("unknown_error");
      // @ts-expect-error - intentionally invalid runtime input
      expect(getAuthErrorMessageKey(undefined)).toBe("unknown_error");
      // @ts-expect-error - intentionally invalid runtime input
      expect(getAuthErrorMessageKey({ code: "invalid_credentials" })).toBe(
        "unknown_error",
      );
    });
  });
});
