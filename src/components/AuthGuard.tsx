"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "../providers/AuthProvider";

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
