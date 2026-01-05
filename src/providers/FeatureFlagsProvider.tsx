"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type {
  FeatureFlags,
  FeatureFlagsContextValue,
  FeatureFlagsResponse,
  FeatureFlagsState,
  FeatureFlagKey,
  OAuthProviderConfig,
} from "../types/feature-flags";
import { DEFAULT_FEATURE_FLAGS } from "../types/feature-flags";

/**
 * Feature flags provider props
 */
export interface FeatureFlagsProviderProps {
  children: ReactNode;
  /**
   * API base URL for fetching flags
   * @example "http://localhost:4100"
   */
  apiBaseUrl: string;
  /**
   * Optional initial flags (for SSR or testing)
   */
  initialFlags?: Partial<FeatureFlags>;
  /**
   * Polling interval in milliseconds (0 = disabled)
   * @default 0
   */
  pollingInterval?: number;
  /**
   * Whether to fetch flags immediately on mount
   * @default true
   */
  fetchOnMount?: boolean;
  /**
   * Optional access token getter for authenticated flag fetching
   */
  getAccessToken?: () => Promise<string | null>;
}

/**
 * Feature flags context
 */
const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(
  null
);

/**
 * Feature flags provider component
 *
 * Fetches feature flags from the backend and provides them to the app.
 *
 * @example
 * ```tsx
 * <FeatureFlagsProvider apiBaseUrl="http://localhost:4100">
 *   <App />
 * </FeatureFlagsProvider>
 * ```
 */
export function FeatureFlagsProvider({
  children,
  apiBaseUrl,
  initialFlags,
  pollingInterval = 0,
  fetchOnMount = true,
  getAccessToken,
}: FeatureFlagsProviderProps) {
  const [state, setState] = useState<FeatureFlagsState>({
    flags: { ...DEFAULT_FEATURE_FLAGS, ...initialFlags },
    isLoading: fetchOnMount,
    isAuthenticated: false,
    error: null,
    lastFetched: null,
  });

  /**
   * Fetch flags from the backend
   */
  const fetchFlags = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add auth token if available
      if (getAccessToken) {
        const token = await getAccessToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }

      // Use AbortController for request timeout (10 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${apiBaseUrl}/flags`, {
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch flags: ${response.statusText}`);
      }

      const data: FeatureFlagsResponse = await response.json();

      setState({
        flags: { ...DEFAULT_FEATURE_FLAGS, ...data.flags },
        isLoading: false,
        isAuthenticated: data.authenticated,
        error: null,
        lastFetched: new Date(),
      });
    } catch (error) {
      console.warn(
        "[FeatureFlags] Failed to fetch flags, using defaults:",
        error
      );
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error("Unknown error"),
      }));
    }
  }, [apiBaseUrl, getAccessToken]);

  /**
   * Check if a specific flag is enabled
   */
  const isEnabled = useCallback(
    (flag: FeatureFlagKey): boolean => {
      return state.flags[flag] ?? false;
    },
    [state.flags]
  );

  /**
   * Get OAuth provider configuration
   */
  const getOAuthProviders = useCallback((): OAuthProviderConfig => {
    return {
      google: state.flags.xynes_auth_oauth_google,
      github: state.flags.xynes_auth_oauth_github,
      apple: state.flags.xynes_auth_oauth_apple,
    };
  }, [state.flags]);

  /**
   * Check if any OAuth provider is enabled
   */
  const hasOAuthProviders = useCallback((): boolean => {
    const providers = getOAuthProviders();
    return providers.google || providers.github || providers.apple;
  }, [getOAuthProviders]);

  // Fetch flags on mount
  useEffect(() => {
    if (fetchOnMount) {
      fetchFlags();
    }
  }, [fetchOnMount, fetchFlags]);

  // Set up polling if enabled
  useEffect(() => {
    if (pollingInterval > 0) {
      const interval = setInterval(fetchFlags, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [pollingInterval, fetchFlags]);

  // Memoize context value
  const contextValue = useMemo<FeatureFlagsContextValue>(
    () => ({
      ...state,
      isEnabled,
      getOAuthProviders,
      hasOAuthProviders,
      refetch: fetchFlags,
    }),
    [state, isEnabled, getOAuthProviders, hasOAuthProviders, fetchFlags]
  );

  return (
    <FeatureFlagsContext.Provider value={contextValue}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Hook to access feature flags context
 *
 * @throws Error if used outside of FeatureFlagsProvider
 *
 * @example
 * ```tsx
 * const { isEnabled, flags } = useFeatureFlags();
 *
 * if (isEnabled('xynes_auth_oauth_google')) {
 *   // Show Google OAuth button
 * }
 * ```
 */
export function useFeatureFlags(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext);

  if (!context) {
    throw new Error(
      "useFeatureFlags must be used within a FeatureFlagsProvider"
    );
  }

  return context;
}

/**
 * Hook to check a single feature flag
 *
 * @param flag - The feature flag key to check
 * @returns boolean indicating if the flag is enabled
 *
 * @example
 * ```tsx
 * const isGoogleEnabled = useFeatureFlag('xynes_auth_oauth_google');
 * ```
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(flag);
}

/**
 * Hook to get OAuth provider configuration
 *
 * @returns Object with enabled OAuth providers
 *
 * @example
 * ```tsx
 * const { google, github, apple } = useOAuthProviders();
 * ```
 */
export function useOAuthProviders(): OAuthProviderConfig {
  const { getOAuthProviders } = useFeatureFlags();
  return getOAuthProviders();
}

/**
 * Hook to check if the app is in maintenance mode
 *
 * @returns boolean indicating if maintenance mode is active
 */
export function useMaintenanceMode(): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled("xynes_maintenance_mode");
}
