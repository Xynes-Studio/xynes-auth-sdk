import { describe, it, expect } from 'vitest';
import {
  normalizeAuthError,
  isRetryableError,
  getErrorMessage,
} from './errors';
import type { AuthErrorCode } from '../types';

describe('error utilities', () => {
  describe('normalizeAuthError', () => {
    it('should normalize Supabase "Invalid login credentials" error', () => {
      const error = normalizeAuthError({
        message: 'Invalid login credentials',
        code: 'invalid_credentials',
      });
      expect(error.code).toBe('invalid_credentials');
      expect(error.message).toContain('email or password');
    });

    it('should normalize email not confirmed error', () => {
      const error = normalizeAuthError({
        message: 'Email not confirmed',
        code: 'email_not_confirmed',
      });
      expect(error.code).toBe('email_not_verified');
    });

    it('should normalize user already registered error', () => {
      const error = normalizeAuthError({
        message: 'User already registered',
        code: 'user_already_exists',
      });
      expect(error.code).toBe('email_already_exists');
    });

    it('should normalize weak password error', () => {
      const error = normalizeAuthError({
        message: 'Password should be at least 8 characters',
        code: 'weak_password',
      });
      expect(error.code).toBe('weak_password');
    });

    it('should normalize rate limited error', () => {
      const error = normalizeAuthError({
        message: 'For security purposes, you can only request this once every 60 seconds',
        code: 'over_request_rate_limit',
      });
      expect(error.code).toBe('rate_limited');
    });

    it('should normalize network errors', () => {
      const error = normalizeAuthError({
        message: 'Failed to fetch',
      });
      expect(error.code).toBe('network_error');
    });

    it('should return unknown_error for unrecognized errors', () => {
      const error = normalizeAuthError({
        message: 'Some random error',
        code: 'random_code',
      });
      expect(error.code).toBe('unknown_error');
    });

    it('should handle string errors', () => {
      const error = normalizeAuthError('Invalid login credentials');
      expect(error.code).toBe('invalid_credentials');
    });

    it('should handle null/undefined', () => {
      const error = normalizeAuthError(null);
      expect(error.code).toBe('unknown_error');
    });
  });

  describe('isRetryableError', () => {
    it('should return true for network errors', () => {
      expect(isRetryableError('network_error')).toBe(true);
    });

    it('should return true for rate limited errors', () => {
      expect(isRetryableError('rate_limited')).toBe(true);
    });

    it('should return false for credential errors', () => {
      expect(isRetryableError('invalid_credentials')).toBe(false);
      expect(isRetryableError('weak_password')).toBe(false);
      expect(isRetryableError('email_already_exists')).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    const errorMessages: Record<AuthErrorCode, string> = {
      invalid_credentials: 'Invalid email or password. Please try again.',
      email_not_verified: 'Please verify your email before signing in.',
      user_not_found: 'No account found with this email.',
      email_already_exists: 'An account with this email already exists.',
      weak_password: 'Password is too weak. Please use a stronger password.',
      invalid_email: 'Please enter a valid email address.',
      network_error: 'Unable to connect. Please check your internet connection.',
      session_expired: 'Your session has expired. Please sign in again.',
      rate_limited: 'Too many attempts. Please wait a moment and try again.',
      unknown_error: 'An unexpected error occurred. Please try again.',
    };

    Object.entries(errorMessages).forEach(([code, expectedMessage]) => {
      it(`should return correct message for ${code}`, () => {
        expect(getErrorMessage(code as AuthErrorCode)).toBe(expectedMessage);
      });
    });
  });
});
