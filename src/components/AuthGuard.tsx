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
   * Callback to invoke when the visitor is unauthenticated.
   *
   * When provided, the callback ALWAYS wins over the default
   * `unauthenticatedMode` redirect — this preserves back-compat for any
   * external consumer pinned to the original callback-only contract.
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
   * - `redirectToAuth` (default since FE-AUTH-BUG-002): calls
   *   `useAuth().redirectToLogin(returnUrl)` so the visitor lands on the
   *   configured auth-app login URL with a safe `?redirect=` param.
   * - `callback`: legacy mode — does nothing unless `onUnauthenticated` is
   *   provided. Use this for pages that want to keep rendering
   *   `loadingComponent` indefinitely or implement a fully custom flow.
   *
   * Passing `onUnauthenticated` always short-circuits the mode and runs the
   * callback instead, regardless of this setting.
   *
   * @default "redirectToAuth"
   */
  unauthenticatedMode?: "callback" | "redirectToAuth";
  /**
   * Explicit URL to use as auth-app return target when unauthenticatedMode=redirectToAuth.
   * Defaults to current location inside redirectToLogin when omitted.
   */
  returnUrl?: string;
}

/**
 * AuthGuard - protects routes that require authentication.
 *
 * By default (since FE-AUTH-BUG-002), unauthenticated visitors are redirected
 * to the configured auth-app login URL via `useAuth().redirectToLogin()`. The
 * helper validates the return URL against `allowedRedirectDomains` so the
 * redirect is fail-closed against open-redirect abuse.
 *
 * Consumers can opt out in three ways:
 * - `optional={true}` — render children even when unauthenticated.
 * - `unauthenticatedMode="callback"` — legacy mode. Without
 *   `onUnauthenticated`, the guard keeps rendering `loadingComponent`.
 * - `onUnauthenticated={...}` — wins over the default redirect.
 */
export function AuthGuard({
  children,
  onUnauthenticated,
  loadingComponent = <DefaultLoadingComponent />,
  optional = false,
  unauthenticatedMode = "redirectToAuth",
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

    // Explicit callback ALWAYS wins, regardless of mode — preserves
    // back-compat for any external consumer pinned to the original
    // callback-only contract.
    if (onUnauthenticated) {
      onUnauthenticated();
      return;
    }

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
    }
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
