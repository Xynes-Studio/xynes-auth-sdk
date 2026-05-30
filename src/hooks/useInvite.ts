"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { WorkspaceInvite, Workspace, AuthError } from "../types";
import { AccountsClient } from "../api/accounts-client";
import {
  getErrorMessage,
  isRefreshTokenError,
  normalizeAuthError,
} from "../utils/errors";
import { useAuth } from "../providers/AuthProvider";

/**
 * Return type for useInvite hook
 */
export interface UseInviteResult {
  invite: WorkspaceInvite | null;
  isLoading: boolean;
  error: AuthError | null;
  acceptInvite: () => Promise<Workspace | null>;
  isAccepting: boolean;
}

/**
 * Hook to manage invite resolution and acceptance
 *
 * @param token - The invite token from the URL
 * @param apiBaseUrl - Base URL for the accounts API
 */
export function useInvite(
  token: string | null,
  apiBaseUrl: string
): UseInviteResult {
  const { isAuthenticated, getAccessToken } = useAuth();
  const [invite, setInvite] = useState<WorkspaceInvite | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  // Create accounts client
  const accountsClient = useMemo(
    () =>
      new AccountsClient({
        baseUrl: apiBaseUrl,
        getAccessToken,
      }),
    [apiBaseUrl, getAccessToken]
  );

  // Resolve invite on mount or token change
  useEffect(() => {
    if (!token) {
      setInvite(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    accountsClient
      .resolveInvite(token)
      .then((resolvedInvite) => {
        setInvite(resolvedInvite);
      })
      .catch((err) => {
        // Safely check for status code (handle network errors/standard Error objects)
        if (
          typeof err === "object" &&
          err !== null &&
          "statusCode" in err &&
          (err as { statusCode: number }).statusCode === 404
        ) {
          setError({
            code: "invite_not_found",
            message: getErrorMessage("invite_not_found"),
          });
        } else {
          const authError = normalizeAuthError(err);
          setError(authError);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, apiBaseUrl]);

  /**
   * Accept the invite (requires authentication).
   *
   * BUG-AUTH-4 (2026-05-30): if the underlying HTTP call throws a
   * Supabase refresh-token side-effect (e.g. "Invalid Refresh Token:
   * Refresh Token Not Found") that fires DURING but is unrelated to the
   * accept POST, the join may have actually succeeded on the backend.
   * Before surfacing the error, we re-list the user's workspaces and
   * check whether the invite's target workspace is now present. If yes,
   * we return that workspace silently (the join did succeed; the error
   * was a transient auth-side-effect). Only if the recovery check
   * confirms the join did NOT happen do we surface the original error.
   */
  const acceptInvite = useCallback(async (): Promise<Workspace | null> => {
    if (!token || !isAuthenticated) {
      return null;
    }

    setIsAccepting(true);
    setError(null);

    try {
      const result = await accountsClient.acceptInvite(token);
      if (result.workspace) {
        return result.workspace;
      }

      // Backward-compatible fallback for older accept payloads without workspace.
      if (result.workspaceId) {
        const workspaces = await accountsClient.getWorkspaces();
        return workspaces.find((workspace) => workspace.id === result.workspaceId) ?? null;
      }

      return null;
    } catch (err) {
      // BUG-AUTH-4: when the thrown error is a Supabase refresh-token
      // side-effect, verify whether the join actually succeeded before
      // surfacing the error. The invite token gives us the target
      // workspace id, so we can match it against the freshly-loaded
      // workspace list.
      if (isRefreshTokenError(err) && invite?.workspaceId) {
        try {
          const workspaces = await accountsClient.getWorkspaces();
          const matched = workspaces.find(
            (workspace) => workspace.id === invite.workspaceId,
          );
          if (matched) {
            // Join did succeed; the error was incidental — do NOT
            // poison the UI with a generic "unexpected error".
            return matched;
          }
        } catch (recoveryErr) {
          // Recovery failed — fall through to surface the original
          // error. We deliberately do not surface the recovery error
          // because the original `err` is the one the caller asked
          // about.
          console.warn(
            "[useInvite] Recovery getWorkspaces() failed:",
            recoveryErr,
          );
        }

        // Recovery confirmed the join did NOT happen. Surface a
        // session-expired error rather than "unknown_error" so the user
        // sees actionable copy.
        const sessionError: AuthError = {
          code: "session_expired",
          message: getErrorMessage("session_expired"),
        };
        setError(sessionError);
        return null;
      }

      const authError = normalizeAuthError(err);
      setError(authError);
      return null;
    } finally {
      setIsAccepting(false);
    }
  }, [token, isAuthenticated, accountsClient, invite]);

  return {
    invite,
    isLoading,
    error,
    acceptInvite,
    isAccepting,
  };
}
