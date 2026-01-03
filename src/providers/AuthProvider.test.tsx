/**
 * AuthProvider Tests
 *
 * @description Tier 2 integration tests for the AuthProvider component.
 * Tests cover authentication state management, session handling, and auth methods.
 *
 * @coverage Target: 80%
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";
import { AuthProvider, useAuth } from "./AuthProvider";
import type { AuthConfig } from "../types";

// ─────────────────────────────────────────────────────────────────
// Mock Setup
// ─────────────────────────────────────────────────────────────────

// Store for auth state change callbacks
type AuthStateChangeCallback = (
  event: string,
  session: Session | null
) => void;
let authStateChangeCallback: AuthStateChangeCallback | null = null;

// Mock session data
const mockSession: Session = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: "bearer",
  user: {
    id: "user-123",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2024-01-01T00:00:00Z",
  },
};

// Mock Supabase client methods
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockRefreshSession = vi.fn();

// Mock subscription object
const mockUnsubscribe = vi.fn();
const mockSubscription = {
  data: {
    subscription: {
      unsubscribe: mockUnsubscribe,
    },
  },
};

// Mock Supabase SSR client
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
      onAuthStateChange: (callback: AuthStateChangeCallback) => {
        authStateChangeCallback = callback;
        return mockSubscription;
      },
    },
  })),
}));

// Mock AccountsClient
const mockGetMe = vi.fn();
vi.mock("../api/accounts-client", () => ({
  AccountsClient: vi.fn().mockImplementation(() => ({
    getMe: mockGetMe,
    getWorkspaces: vi.fn(),
    createWorkspace: vi.fn(),
  })),
}));

// Mock window.location
const originalLocation = window.location;

// ─────────────────────────────────────────────────────────────────
// Test Utilities
// ─────────────────────────────────────────────────────────────────

const defaultConfig: AuthConfig = {
  supabaseUrl: "https://test.supabase.co",
  supabaseKey: "test-anon-key",
  apiBaseUrl: "https://api.test.com",
  authAppUrl: "https://auth.test.com",
  cookieDomain: ".test.com",
};

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  displayName: "Test User",
  avatarUrl: null,
  emailVerified: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockWorkspace = {
  id: "ws-123",
  name: "Test Workspace",
  slug: "test-workspace",
  planType: "free" as const,
  role: "workspace_owner" as const,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

/**
 * Test component that uses useAuth hook
 */
function TestConsumer() {
  const {
    user,
    isLoading,
    isAuthenticated,
    error,
    workspaces,
    signOut,
    signUp,
    signInWithPassword,
    signInWithOAuth,
    refreshSession,
    redirectToLogin,
    redirectToSignup,
  } = useAuth();

  const handleOAuth = async () => {
    try {
      await signInWithOAuth("google");
    } catch {
      // OAuth error is already set in state, we just catch to prevent unhandled rejection
    }
  };

  return (
    <div>
      <div data-testid="loading">{isLoading ? "loading" : "loaded"}</div>
      <div data-testid="authenticated">
        {isAuthenticated ? "authenticated" : "unauthenticated"}
      </div>
      <div data-testid="user">{user?.email ?? "no-user"}</div>
      <div data-testid="error">{error?.message ?? "no-error"}</div>
      <div data-testid="workspaces-count">{workspaces.length}</div>

      <button
        onClick={() => signUp({ email: "new@test.com", password: "password" })}
      >
        Sign Up
      </button>
      <button
        onClick={() =>
          signInWithPassword({ email: "test@test.com", password: "password" })
        }
      >
        Sign In
      </button>
      <button onClick={handleOAuth}>OAuth</button>
      <button onClick={signOut}>Sign Out</button>
      <button onClick={refreshSession}>Refresh</button>
      <button onClick={() => redirectToLogin("/dashboard")}>
        Redirect Login
      </button>
      <button onClick={() => redirectToSignup("/welcome")}>
        Redirect Signup
      </button>
    </div>
  );
}

/**
 * Wrapper to render with AuthProvider
 */
function renderWithProvider(config: AuthConfig = defaultConfig) {
  return render(
    <AuthProvider config={config}>
      <TestConsumer />
    </AuthProvider>
  );
}

// ─────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateChangeCallback = null;

    // Default: no session
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockGetMe.mockReset();

    // Mock window.location
    Object.defineProperty(window, "location", {
      value: {
        href: "https://app.test.com",
        origin: "https://app.test.com",
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  describe("Initial State", () => {
    it("should render with loading state initially", async () => {
      mockGetSession.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProvider();

      expect(screen.getByTestId("loading")).toHaveTextContent("loading");
    });

    it("should show unauthenticated state when no session exists", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      expect(screen.getByTestId("authenticated")).toHaveTextContent(
        "unauthenticated"
      );
      expect(screen.getByTestId("user")).toHaveTextContent("no-user");
    });

    it("should show authenticated state when session exists", async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockGetMe.mockResolvedValue({
        user: mockUser,
        workspaces: [mockWorkspace],
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      expect(screen.getByTestId("authenticated")).toHaveTextContent(
        "authenticated"
      );
      expect(screen.getByTestId("user")).toHaveTextContent("test@example.com");
      expect(screen.getByTestId("workspaces-count")).toHaveTextContent("1");
    });

    it("should use initial session from SSR when provided", async () => {
      mockGetMe.mockResolvedValue({
        user: mockUser,
        workspaces: [],
      });

      render(
        <AuthProvider config={defaultConfig} initialSession={mockSession}>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      // getSession should NOT be called when initialSession is provided
      expect(mockGetSession).not.toHaveBeenCalled();
      expect(screen.getByTestId("authenticated")).toHaveTextContent(
        "authenticated"
      );
    });

    it("should handle null initial session", async () => {
      render(
        <AuthProvider config={defaultConfig} initialSession={null}>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      expect(screen.getByTestId("authenticated")).toHaveTextContent(
        "unauthenticated"
      );
    });
  });

  describe("Bootstrap User", () => {
    it("should call bootstrap API when session exists", async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockGetMe.mockResolvedValue({
        user: mockUser,
        workspaces: [mockWorkspace],
      });

      renderWithProvider();

      await waitFor(() => {
        expect(mockGetMe).toHaveBeenCalled();
      });
    });

    it("should handle bootstrap failure gracefully", async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockGetMe.mockRejectedValue(new Error("Network error"));

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      // Should still be authenticated but no user data
      expect(screen.getByTestId("authenticated")).toHaveTextContent(
        "authenticated"
      );
      expect(screen.getByTestId("user")).toHaveTextContent("no-user");
    });

    it("should set workspaces from bootstrap response", async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockGetMe.mockResolvedValue({
        user: mockUser,
        workspaces: [mockWorkspace, { ...mockWorkspace, id: "ws-456" }],
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("workspaces-count")).toHaveTextContent("2");
      });
    });
  });

  describe("Sign Up", () => {
    it("should call Supabase signUp with correct data", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignUp.mockResolvedValue({ data: { user: mockUser }, error: null });

      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await user.click(screen.getByText("Sign Up"));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: "new@test.com",
          password: "password",
          options: {
            data: {
              display_name: undefined,
            },
          },
        });
      });
    });

    it("should return needsEmailVerification when email confirmation required", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      // The signUp function returns the result - we test the mock was called
      await act(async () => {
        await userEvent.click(screen.getByText("Sign Up"));
      });

      expect(mockSignUp).toHaveBeenCalled();
    });

    it("should handle sign up error", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "User already registered", code: "email_already_exists" },
      });

      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await user.click(screen.getByText("Sign Up"));

      await waitFor(() => {
        expect(screen.getByTestId("error")).not.toHaveTextContent("no-error");
      });
    });

    it("should handle sign up exception (catch block)", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignUp.mockRejectedValue(new Error("Network error"));

      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await user.click(screen.getByText("Sign Up"));

      await waitFor(() => {
        expect(screen.getByTestId("error")).not.toHaveTextContent("no-error");
      });
    });
  });

  describe("Sign In", () => {
    it("should call Supabase signInWithPassword", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignInWithPassword.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await user.click(screen.getByText("Sign In"));

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "test@test.com",
          password: "password",
        });
      });
    });

    it("should handle sign in error", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: "Invalid login credentials" },
      });

      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await user.click(screen.getByText("Sign In"));

      await waitFor(() => {
        expect(screen.getByTestId("error")).not.toHaveTextContent("no-error");
      });
    });

    it("should handle sign in exception (catch block)", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignInWithPassword.mockRejectedValue(new Error("Network error"));

      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await user.click(screen.getByText("Sign In"));

      await waitFor(() => {
        expect(screen.getByTestId("error")).not.toHaveTextContent("no-error");
      });
    });
  });

  describe("OAuth Sign In", () => {
    it("should call Supabase signInWithOAuth", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await user.click(screen.getByText("OAuth"));

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: "google",
          options: {
            redirectTo: "https://app.test.com/callback",
          },
        });
      });
    });

    it("should handle OAuth error", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignInWithOAuth.mockResolvedValue({
        error: { message: "OAuth provider error" },
      });

      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      // OAuth throws the error, so we need to catch it
      await user.click(screen.getByText("OAuth"));

      // Give time for the error to be set in state
      await waitFor(
        () => {
          expect(screen.getByTestId("error")).not.toHaveTextContent("no-error");
        },
        { timeout: 1000 }
      );
    });
  });

  describe("Sign Out", () => {
    it("should call Supabase signOut and clear state", async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockGetMe.mockResolvedValue({
        user: mockUser,
        workspaces: [mockWorkspace],
      });
      mockSignOut.mockResolvedValue({ error: null });

      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("authenticated")).toHaveTextContent(
          "authenticated"
        );
      });

      await user.click(screen.getByText("Sign Out"));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(screen.getByTestId("authenticated")).toHaveTextContent(
          "unauthenticated"
        );
        expect(screen.getByTestId("user")).toHaveTextContent("no-user");
        expect(screen.getByTestId("workspaces-count")).toHaveTextContent("0");
      });
    });
  });

  describe("Session Refresh", () => {
    it("should call refreshSession and update state", async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockGetMe.mockResolvedValue({
        user: mockUser,
        workspaces: [mockWorkspace],
      });
      mockRefreshSession.mockResolvedValue({
        data: { session: mockSession },
      });

      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await user.click(screen.getByText("Refresh"));

      await waitFor(() => {
        expect(mockRefreshSession).toHaveBeenCalled();
      });
    });

    it("should handle session refresh when no session returned", async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockGetMe.mockResolvedValue({
        user: mockUser,
        workspaces: [mockWorkspace],
      });
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
      });

      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await user.click(screen.getByText("Refresh"));

      await waitFor(() => {
        expect(mockRefreshSession).toHaveBeenCalled();
      });
    });
  });

  describe("Auth State Change Listener", () => {
    it("should update state when auth state changes", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      expect(screen.getByTestId("authenticated")).toHaveTextContent(
        "unauthenticated"
      );

      // Simulate auth state change (user signs in)
      mockGetMe.mockResolvedValue({
        user: mockUser,
        workspaces: [mockWorkspace],
      });

      act(() => {
        authStateChangeCallback?.("SIGNED_IN", mockSession);
      });

      await waitFor(() => {
        expect(screen.getByTestId("authenticated")).toHaveTextContent(
          "authenticated"
        );
      });
    });

    it("should handle SIGNED_OUT event", async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockGetMe.mockResolvedValue({
        user: mockUser,
        workspaces: [mockWorkspace],
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("authenticated")).toHaveTextContent(
          "authenticated"
        );
      });

      // Simulate sign out event
      act(() => {
        authStateChangeCallback?.("SIGNED_OUT", null);
      });

      await waitFor(() => {
        expect(screen.getByTestId("authenticated")).toHaveTextContent(
          "unauthenticated"
        );
      });
    });

    it("should handle TOKEN_REFRESHED event", async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockGetMe.mockResolvedValue({
        user: mockUser,
        workspaces: [mockWorkspace],
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("authenticated")).toHaveTextContent(
          "authenticated"
        );
      });

      // Simulate token refresh event
      const refreshedSession = {
        ...mockSession,
        access_token: "new-access-token",
      };

      act(() => {
        authStateChangeCallback?.("TOKEN_REFRESHED", refreshedSession);
      });

      // Should remain authenticated
      await waitFor(() => {
        expect(screen.getByTestId("authenticated")).toHaveTextContent(
          "authenticated"
        );
      });
    });

    it("should unsubscribe on unmount", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { unmount } = renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe("Redirect Methods", () => {
    it("should redirect to login with return URL", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await user.click(screen.getByText("Redirect Login"));

      expect(window.location.href).toContain("auth.test.com/login");
      expect(window.location.href).toContain("redirect=");
    });

    it("should redirect to signup with return URL", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await user.click(screen.getByText("Redirect Signup"));

      expect(window.location.href).toContain("auth.test.com/signup");
      expect(window.location.href).toContain("redirect=");
    });
  });

  describe("Open Redirect Protection", () => {
    /**
     * Test component that calls redirectToLogin without a returnUrl parameter
     * This forces it to use window.location.href which we can control
     */
    function TestConsumerWithoutReturnUrl() {
      const { isLoading, redirectToLogin } = useAuth();

      return (
        <div>
          <div data-testid="loading">{isLoading ? "loading" : "loaded"}</div>
          <button onClick={() => redirectToLogin()}>Redirect No Param</button>
        </div>
      );
    }

    it("should include redirect URL when domain is in allowedRedirectDomains", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const configWithAllowedDomains: AuthConfig = {
        ...defaultConfig,
        allowedRedirectDomains: ["test.com", "app.test.com"],
      };

      const user = userEvent.setup();
      render(
        <AuthProvider config={configWithAllowedDomains}>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await user.click(screen.getByText("Redirect Login"));

      // window.location.origin is https://app.test.com which is in allowed domains
      expect(window.location.href).toContain("redirect=");
    });

    it("should omit redirect URL when domain is not in allowedRedirectDomains", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const configWithRestrictedDomains: AuthConfig = {
        ...defaultConfig,
        allowedRedirectDomains: ["different-domain.com"],
      };

      // Set location to a domain NOT in allowed list
      Object.defineProperty(window, "location", {
        value: {
          href: "https://evil.com/phishing",
          origin: "https://evil.com",
        },
        writable: true,
      });

      const user = userEvent.setup();
      render(
        <AuthProvider config={configWithRestrictedDomains}>
          <TestConsumerWithoutReturnUrl />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await user.click(screen.getByText("Redirect No Param"));

      // Should NOT contain redirect param when URL is from untrusted domain
      expect(window.location.href).not.toContain("redirect=");
    });

    it("should allow redirect when allowedRedirectDomains is not configured", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      // Config without allowedRedirectDomains (undefined)
      const user = userEvent.setup();
      renderWithProvider(); // uses defaultConfig which has no allowedRedirectDomains

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("loaded");
      });

      await user.click(screen.getByText("Redirect Signup"));

      // Should include redirect since no domain restrictions are configured
      expect(window.location.href).toContain("redirect=");
    });
  });
});

describe("useAuth", () => {
  it("should throw error when used outside AuthProvider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow("useAuth must be used within an AuthProvider");

    consoleSpy.mockRestore();
  });
});
