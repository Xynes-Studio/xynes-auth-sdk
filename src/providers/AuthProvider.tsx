"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient, Session } from "@supabase/supabase-js";
import type {
  AuthConfig,
  AuthState,
  User,
  Workspace,
  OAuthProvider,
  SignUpInput,
  SignInInput,
  AuthResult,
} from "../types";
import { AccountsClient } from "../api/accounts-client";
import { normalizeAuthError } from "../utils/errors";
import { buildAuthRedirectUrl, isValidRedirectUrl } from "../utils/redirect";

/**
 * Extended auth context with methods
 */
interface AuthContextValue extends AuthState {
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  signInWithPassword: (input: SignInInput) => Promise<AuthResult>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
  redirectToLogin: (returnUrl?: string) => void;
  redirectToSignup: (returnUrl?: string) => void;
  refreshSession: () => Promise<void>;
  /**
   * BUG-AUTH-2 (2026-05-30): Re-fetch `/me` without going through Supabase
   * refresh-token rotation. Used by callers that just mutated the
   * server-side workspace set (e.g. just created or joined a workspace)
   * and need the in-memory `workspaces` array to reflect the mutation
   * before the next render — so a downstream `selectWorkspace(...)` can
   * succeed without a hard reload.
   *
   * Posture: no-op when logged out; never throws; transient network
   * failures are swallowed and leave the existing in-memory `workspaces`
   * untouched (we deliberately do NOT route through `handleSessionChange`,
   * which would wipe the list to `[]` on a transient failure).
   */
  refreshWorkspaces: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider props
 */
export interface AuthProviderProps {
  children: ReactNode;
  config: AuthConfig;
  /**
   * Optional initial session for SSR
   */
  initialSession?: Session | null;
}

/**
 * AuthProvider component - provides auth state and methods to the app
 */
export function AuthProvider({
  children,
  config,
  initialSession,
}: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    workspaces: [],
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });
  const stateRef = useRef<AuthState>({
    user: null,
    workspaces: [],
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Track the latest session to avoid access-token races when bootstrapping.
  const sessionRef = useRef<Session | null>(initialSession ?? null);
  const lastSuccessfulBootstrapTokenRef = useRef<string | null>(null);
  const bootstrapInFlightRef = useRef<{
    token: string | null;
    promise: Promise<{
      bootstrap: { user: User; workspaces: Workspace[] } | null;
      unauthorized: boolean;
    }> | null;
  }>({ token: null, promise: null });

  // Create Supabase client
  const supabase = useMemo<SupabaseClient>(() => {
    return createBrowserClient(config.supabaseUrl, config.supabaseKey);
  }, [config.supabaseUrl, config.supabaseKey]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    // Prefer the in-memory session token (more reliable during app start / auth events).
    const inMemory = sessionRef.current?.access_token ?? null;
    if (inMemory) return inMemory;

    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, [supabase]);

  // Create accounts API client
  const accountsClient = useMemo(() => {
    return new AccountsClient({
      baseUrl: config.apiBaseUrl,
      getAccessToken,
    });
  }, [config.apiBaseUrl, getAccessToken]);

  const isUnauthorizedError = useCallback((error: unknown): boolean => {
    if (!error || typeof error !== "object") return false;
    const maybe = error as { statusCode?: unknown; code?: unknown };
    const status =
      typeof maybe.statusCode === "number" ? maybe.statusCode : undefined;
    if (status === 401 || status === 403) return true;
    if (typeof maybe.code === "string" && maybe.code.toUpperCase() === "UNAUTHORIZED") {
      return true;
    }
    return false;
  }, []);

  /**
   * Bootstrap user from accounts service
   */
  const bootstrapUser = useCallback(async (): Promise<{
    bootstrap: { user: User; workspaces: Workspace[] } | null;
    unauthorized: boolean;
  }> => {
    const token = sessionRef.current?.access_token ?? null;
    if (bootstrapInFlightRef.current.promise && bootstrapInFlightRef.current.token === token) {
      return bootstrapInFlightRef.current.promise;
    }

    try {
      const promise = accountsClient
        .getMe()
        .then((response) => ({ bootstrap: response, unauthorized: false }))
        .catch((error) => {
          console.error("Failed to bootstrap user:", error);
          return { bootstrap: null, unauthorized: isUnauthorizedError(error) };
        });

      bootstrapInFlightRef.current = { token, promise };
      const result = await promise;
      return result;
    } catch (error) {
      console.error("Failed to bootstrap user:", error);
      return { bootstrap: null, unauthorized: isUnauthorizedError(error) };
    } finally {
      // Clear inflight if this was the latest token (avoid pinning promise forever).
      if (bootstrapInFlightRef.current.token === token) {
        bootstrapInFlightRef.current = { token: null, promise: null };
      }
    }
  }, [accountsClient, isUnauthorizedError]);

  /**
   * Handle session change
   */
  const handleSessionChange = useCallback(
    async (session: Session | null) => {
      sessionRef.current = session;
      if (!session) {
        const next: AuthState = {
          user: null,
          workspaces: [],
          isLoading: false,
          isAuthenticated: false,
          error: null,
        };
        lastSuccessfulBootstrapTokenRef.current = null;
        stateRef.current = next;
        setState(next);
        return;
      }

      const token = session.access_token ?? null;
      // If we already bootstrapped successfully for this exact token, don't spam /me.
      if (
        token &&
        lastSuccessfulBootstrapTokenRef.current === token &&
        stateRef.current.isAuthenticated &&
        stateRef.current.user
      ) {
        const next: AuthState = {
          ...stateRef.current,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        };
        stateRef.current = next;
        setState(next);
        return;
      }

      setState((prev) => {
        const next = { ...prev, isLoading: true };
        stateRef.current = next;
        return next;
      });

      const { bootstrap, unauthorized } = await bootstrapUser();
      const currentToken = sessionRef.current?.access_token ?? null;
      if (currentToken !== token) {
        return;
      }

      if (bootstrap) {
        const safeWorkspaces = Array.isArray(bootstrap.workspaces)
          ? bootstrap.workspaces
          : [];
        const next: AuthState = {
          user: bootstrap.user,
          workspaces: safeWorkspaces,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        };
        if (token) {
          lastSuccessfulBootstrapTokenRef.current = token;
        }
        stateRef.current = next;
        setState(next);
      } else {
        if (unauthorized) {
          // Token exists but backend rejected it -> treat as logged out.
          await supabase.auth.signOut();
          const next: AuthState = {
            user: null,
            workspaces: [],
            isLoading: false,
            isAuthenticated: false,
            error: null,
          };
          lastSuccessfulBootstrapTokenRef.current = null;
          stateRef.current = next;
          setState(next);
          return;
        }
        // Session exists but couldn't bootstrap - might be new user
        const next: AuthState = {
          user: null,
          workspaces: [],
          isLoading: false,
          isAuthenticated: true,
          error: null,
        };
        stateRef.current = next;
        setState(next);
      }
    },
    [bootstrapUser, isUnauthorizedError, supabase]
  );

  // Initialize auth state
  useEffect(() => {
    // If we have initial session (SSR), use it
    if (initialSession !== undefined) {
      handleSessionChange(initialSession);
      return;
    }

    // Otherwise, check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSessionChange(session);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSessionChange(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, initialSession, handleSessionChange]);

  /**
   * Sign up with email/password
   */
  const signUp = useCallback(
    async (input: SignUpInput): Promise<AuthResult> => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            data: {
              display_name: input.displayName,
            },
          },
        });

        if (error) {
          const authError = normalizeAuthError(error);
          setState((prev) => ({ ...prev, error: authError }));
          return { success: false, error: authError };
        }

        // Check if email confirmation is required
        if (data.user && !data.session) {
          return {
            success: true,
            needsEmailVerification: true,
          };
        }

        return { success: true };
      } catch (error) {
        const authError = normalizeAuthError(error);
        setState((prev) => ({ ...prev, error: authError }));
        return { success: false, error: authError };
      }
    },
    [supabase]
  );

  /**
   * Sign in with email/password
   */
  const signInWithPassword = useCallback(
    async (input: SignInInput): Promise<AuthResult> => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        });

        if (error) {
          const authError = normalizeAuthError(error);
          setState((prev) => ({ ...prev, error: authError }));
          return { success: false, error: authError };
        }

        return { success: true };
      } catch (error) {
        const authError = normalizeAuthError(error);
        setState((prev) => ({ ...prev, error: authError }));
        return { success: false, error: authError };
      }
    },
    [supabase]
  );

  /**
   * Sign in with OAuth provider
   */
  const signInWithOAuth = useCallback(
    async (provider: OAuthProvider): Promise<void> => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/callback`,
        },
      });

      if (error) {
        const authError = normalizeAuthError(error);
        setState((prev) => ({ ...prev, error: authError }));
        throw error;
      }
    },
    [supabase]
  );

  /**
   * Sign out
   */
  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    setState({
      user: null,
      workspaces: [],
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  }, [supabase]);

  /**
   * Redirect to login page
   * @security Validates redirect URL against allowedRedirectDomains to prevent open redirects
   */
  const resolveSafeAuthRedirectTarget = useCallback(
    (targetUrl: string): string | undefined => {
      const allowedDomains =
        config.crossApp?.redirects?.allowedDomains ??
        config.allowedRedirectDomains ??
        [];

      if (allowedDomains.length > 0) {
        return isValidRedirectUrl(targetUrl, allowedDomains)
          ? targetUrl
          : undefined;
      }

      // Fail-closed default: without an explicit allowlist, only relative paths are accepted.
      if (targetUrl.startsWith("/") && !targetUrl.startsWith("//")) {
        return targetUrl;
      }

      return undefined;
    },
    [config.crossApp?.redirects?.allowedDomains, config.allowedRedirectDomains]
  );

  const redirectToLogin = useCallback(
    (returnUrl?: string): void => {
      const targetUrl = returnUrl || window.location.href;
      const safeRedirectUrl = resolveSafeAuthRedirectTarget(targetUrl);

      const url = buildAuthRedirectUrl(
        config.authAppUrl,
        "login",
        safeRedirectUrl
      );
      window.location.href = url;
    },
    [config.authAppUrl, resolveSafeAuthRedirectTarget]
  );

  /**
   * Redirect to signup page
   * @security Validates redirect URL against allowedRedirectDomains to prevent open redirects
   */
  const redirectToSignup = useCallback(
    (returnUrl?: string): void => {
      const targetUrl = returnUrl || window.location.href;
      const safeRedirectUrl = resolveSafeAuthRedirectTarget(targetUrl);

      const url = buildAuthRedirectUrl(
        config.authAppUrl,
        "signup",
        safeRedirectUrl
      );
      window.location.href = url;
    },
    [config.authAppUrl, resolveSafeAuthRedirectTarget]
  );

  /**
   * Refresh session
   */
  const refreshSession = useCallback(async (): Promise<void> => {
    const { data } = await supabase.auth.refreshSession();
    if (data.session) {
      await handleSessionChange(data.session);
    }
  }, [supabase, handleSessionChange]);

  /**
   * BUG-AUTH-2 (2026-05-30): Re-fetch `/me` without going through Supabase
   * refresh-token rotation. See the docblock on `AuthContextValue.refreshWorkspaces`
   * for the contract. The implementation deliberately bypasses
   * `handleSessionChange` so a transient `/me` failure cannot wipe an
   * already-good workspaces list to `[]`.
   */
  const refreshWorkspaces = useCallback(async (): Promise<void> => {
    if (!sessionRef.current?.access_token) {
      return;
    }

    // Bust the per-token bootstrap dedupe latch so we actually hit /me.
    lastSuccessfulBootstrapTokenRef.current = null;

    try {
      const { bootstrap, unauthorized } = await bootstrapUser();

      // Session rotated mid-flight → another listener already handled it.
      if (!sessionRef.current?.access_token) {
        return;
      }

      if (bootstrap) {
        const safeWorkspaces = Array.isArray(bootstrap.workspaces)
          ? bootstrap.workspaces
          : [];
        const token = sessionRef.current.access_token;
        const next: AuthState = {
          user: bootstrap.user,
          workspaces: safeWorkspaces,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        };
        lastSuccessfulBootstrapTokenRef.current = token;
        stateRef.current = next;
        setState(next);
        return;
      }

      if (unauthorized) {
        await supabase.auth.signOut();
        const next: AuthState = {
          user: null,
          workspaces: [],
          isLoading: false,
          isAuthenticated: false,
          error: null,
        };
        lastSuccessfulBootstrapTokenRef.current = null;
        stateRef.current = next;
        setState(next);
        return;
      }

      // Transient / unknown bootstrap failure: deliberately leave state
      // untouched so the consumer keeps the previous workspace list.
    } catch (error) {
      // Defensive: bootstrapUser already swallows its inner errors, but
      // keep this catch so a future refactor cannot leak an unhandled
      // rejection into a click handler.
      console.error("Failed to refresh workspaces:", error);
    }
  }, [bootstrapUser, supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signUp,
      signInWithPassword,
      signInWithOAuth,
      signOut,
      redirectToLogin,
      redirectToSignup,
      refreshSession,
      refreshWorkspaces,
      getAccessToken,
    }),
    [
      state,
      signUp,
      signInWithPassword,
      signInWithOAuth,
      signOut,
      redirectToLogin,
      redirectToSignup,
      refreshSession,
      refreshWorkspaces,
      getAccessToken,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth state and methods
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
