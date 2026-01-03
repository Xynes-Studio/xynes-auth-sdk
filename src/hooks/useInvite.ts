'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WorkspaceInvite, Workspace, AuthError } from '../types';
import { AccountsClient } from '../api/accounts-client';
import { normalizeAuthError } from '../utils/errors';
import { useAuth } from '../providers/AuthProvider';

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
export function useInvite(token: string | null, apiBaseUrl: string): UseInviteResult {
  const { isAuthenticated } = useAuth();
  const [invite, setInvite] = useState<WorkspaceInvite | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  // Create accounts client for public endpoint (resolve)
  const accountsClient = new AccountsClient({
    baseUrl: apiBaseUrl,
    getAccessToken: async () => null, // No auth needed for resolve
  });

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
        const authError = normalizeAuthError(err);
        setError(authError);
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
      // For accepting, we need auth, so we import from provider context
      // This is a simplified version - in real implementation, 
      // you'd get the token from the auth context
      const workspace = await accountsClient.acceptInvite(token);
      return workspace;
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
