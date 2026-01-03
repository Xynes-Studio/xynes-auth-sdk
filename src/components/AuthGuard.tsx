"use client";

import { useEffect, type ReactNode } from "react";
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
}

/**
 * AuthGuard - protects routes that require authentication
 */
export function AuthGuard({
  children,
  onUnauthenticated,
  loadingComponent = <DefaultLoadingComponent />,
  optional = false,
}: AuthGuardProps) {
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !optional) {
      onUnauthenticated?.();
    }
  }, [isLoading, isAuthenticated, optional, onUnauthenticated]);

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
