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

  // Create Supabase client
  const supabase = useMemo<SupabaseClient>(() => {
    return createBrowserClient(config.supabaseUrl, config.supabaseKey);
  }, [config.supabaseUrl, config.supabaseKey]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
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

  /**
   * Bootstrap user from accounts service
   */
  const bootstrapUser = useCallback(async (): Promise<{
    user: User;
    workspaces: Workspace[];
  } | null> => {
    try {
      const response = await accountsClient.getMe();
      return response;
    } catch (error) {
      console.error("Failed to bootstrap user:", error);
      return null;
    }
  }, [accountsClient]);

  /**
   * Handle session change
   */
  const handleSessionChange = useCallback(
    async (session: Session | null) => {
      if (!session) {
        setState({
          user: null,
          workspaces: [],
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      const bootstrap = await bootstrapUser();

      if (bootstrap) {
        setState({
          user: bootstrap.user,
          workspaces: bootstrap.workspaces,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      } else {
        // Session exists but couldn't bootstrap - might be new user
        setState({
          user: null,
          workspaces: [],
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      }
    },
    [bootstrapUser]
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
  const redirectToLogin = useCallback(
    (returnUrl?: string): void => {
      const targetUrl = returnUrl || window.location.href;
      // Security: Validate redirect URL if allowedRedirectDomains is configured
      const safeRedirectUrl =
        config.allowedRedirectDomains &&
        config.allowedRedirectDomains.length > 0 &&
        !isValidRedirectUrl(targetUrl, config.allowedRedirectDomains)
          ? undefined // Don't pass unsafe redirect URL
          : targetUrl;

      const url = buildAuthRedirectUrl(
        config.authAppUrl,
        "login",
        safeRedirectUrl
      );
      window.location.href = url;
    },
    [config.authAppUrl, config.allowedRedirectDomains]
  );

  /**
   * Redirect to signup page
   * @security Validates redirect URL against allowedRedirectDomains to prevent open redirects
   */
  const redirectToSignup = useCallback(
    (returnUrl?: string): void => {
      const targetUrl = returnUrl || window.location.href;
      // Security: Validate redirect URL if allowedRedirectDomains is configured
      const safeRedirectUrl =
        config.allowedRedirectDomains &&
        config.allowedRedirectDomains.length > 0 &&
        !isValidRedirectUrl(targetUrl, config.allowedRedirectDomains)
          ? undefined // Don't pass unsafe redirect URL
          : targetUrl;

      const url = buildAuthRedirectUrl(
        config.authAppUrl,
        "signup",
        safeRedirectUrl
      );
      window.location.href = url;
    },
    [config.authAppUrl, config.allowedRedirectDomains]
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
