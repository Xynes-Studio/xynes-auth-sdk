"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { WorkspaceInvite, Workspace, AuthError } from "../types";
import { AccountsClient } from "../api/accounts-client";
import { normalizeAuthError, getErrorMessage } from "../utils/errors";
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
   * Accept the invite (requires authentication)
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
      const authError = normalizeAuthError(err);
      setError(authError);
      return null;
    } finally {
      setIsAccepting(false);
    }
  }, [token, isAuthenticated, accountsClient]);

  return {
    invite,
    isLoading,
    error,
    acceptInvite,
    isAccepting,
  };
}
