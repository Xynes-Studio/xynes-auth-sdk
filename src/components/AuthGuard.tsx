"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "../providers/AuthProvider";

const REDIRECT_DEDUP_WINDOW_MS = 1500;
const recentRedirectAttempts = new Map<string, number>();

function pruneExpiredRedirectAttempts(now: number): void {
  for (const [key, timestamp] of recentRedirectAttempts.entries()) {
    if (now - timestamp > REDIRECT_DEDUP_WINDOW_MS) {
      recentRedirectAttempts.delete(key);
    }
  }
}

function hasRecentRedirectAttempt(key: string, now: number): boolean {
  const previous = recentRedirectAttempts.get(key);
  if (!previous) {
    return false;
  }
  return now - previous <= REDIRECT_DEDUP_WINDOW_MS;
}

/**
 * @internal test helper for isolating redirect cache state in component tests.
 */
export function __resetAuthGuardRedirectCacheForTests(): void {
  recentRedirectAttempts.clear();
}

/**
 * AuthGuard props
 */
export interface AuthGuardProps {
  children: ReactNode;
  /**
   * Callback when user is not authenticated
   */
  onUnauthenticated?: () => void;
  /**
   * Component to show while loading
   */
  loadingComponent?: ReactNode;
  /**
   * If true, allows unauthenticated access (for public pages that optionally use auth)
   */
  optional?: boolean;
  /**
   * Strategy to run when unauthenticated.
   * - callback: invokes onUnauthenticated when provided.
   * - redirectToAuth: calls useAuth().redirectToLogin with optional returnUrl.
   */
  unauthenticatedMode?: "callback" | "redirectToAuth";
  /**
   * Explicit URL to use as auth-app return target when unauthenticatedMode=redirectToAuth.
   * Defaults to current location inside redirectToLogin when omitted.
   */
  returnUrl?: string;
}

/**
 * AuthGuard - protects routes that require authentication
 */
export function AuthGuard({
  children,
  onUnauthenticated,
  loadingComponent = <DefaultLoadingComponent />,
  optional = false,
  unauthenticatedMode = "callback",
  returnUrl,
}: AuthGuardProps) {
  const { isLoading, isAuthenticated, redirectToLogin } = useAuth();
  const hasHandledUnauthenticatedRef = useRef(false);

  useEffect(() => {
    if (isLoading || optional || isAuthenticated) {
      hasHandledUnauthenticatedRef.current = false;
      return;
    }

    if (hasHandledUnauthenticatedRef.current) {
      return;
    }

    hasHandledUnauthenticatedRef.current = true;
    if (unauthenticatedMode === "redirectToAuth") {
      const target = returnUrl ?? window.location.href;
      const redirectKey = `redirectToAuth:${target}`;
      const now = Date.now();
      pruneExpiredRedirectAttempts(now);

      if (hasRecentRedirectAttempt(redirectKey, now)) {
        return;
      }

      recentRedirectAttempts.set(redirectKey, now);
      redirectToLogin(returnUrl);
      return;
    }

    onUnauthenticated?.();
  }, [
    isLoading,
    isAuthenticated,
    optional,
    onUnauthenticated,
    redirectToLogin,
    returnUrl,
    unauthenticatedMode,
  ]);

  // Show loading while checking auth
  if (isLoading) {
    return <>{loadingComponent}</>;
  }

  // If not authenticated and not optional, don't render children
  if (!isAuthenticated && !optional) {
    return <>{loadingComponent}</>;
  }

  return <>{children}</>;
}

/**
 * Default loading component
 */
function DefaultLoadingComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
