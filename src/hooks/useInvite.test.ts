import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useInvite } from "./useInvite";
import * as AuthProviderModule from "../providers/AuthProvider";

// Mock the useAuth hook directly
const mockUseAuth = vi.spyOn(AuthProviderModule, "useAuth");

// Store mock functions for access in tests
const mockResolveInvite = vi.fn();
const mockAcceptInvite = vi.fn();
const mockGetWorkspaces = vi.fn();

// Mock AccountsClient constructor
vi.mock("../api/accounts-client", () => ({
  AccountsClient: vi.fn().mockImplementation(() => ({
    resolveInvite: mockResolveInvite,
    acceptInvite: mockAcceptInvite,
    getWorkspaces: mockGetWorkspaces,
  })),
}));

const mockInvite = {
  id: "invite-1",
  workspaceId: "ws-1",
  workspaceName: "Test Workspace",
  workspaceSlug: "test-workspace",
  invitedBy: "admin@example.com",
  role: "workspace_member" as const,
  expiresAt: "2025-01-01",
};

describe("useInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveInvite.mockReset();
    mockAcceptInvite.mockReset();
    mockGetWorkspaces.mockReset();

    // Default mock for useAuth - not authenticated
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      workspaces: [],
      error: null,
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      refreshWorkspaces: vi.fn(),
      redirectToLogin: vi.fn(),
      redirectToSignup: vi.fn(),
      getAccessToken: vi.fn(),
    });
  });

  it("should return initial state when no token provided", () => {
    const { result } = renderHook(() =>
      useInvite(null, "http://localhost:4100")
    );

    expect(result.current.invite).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isAccepting).toBe(false);
    expect(typeof result.current.acceptInvite).toBe("function");
  });

  it("should set loading state when token is provided", () => {
    mockResolveInvite.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() =>
      useInvite("test-token", "http://localhost:4100")
    );

    expect(result.current.isLoading).toBe(true);
  });

  it("should resolve invite successfully", async () => {
    mockResolveInvite.mockResolvedValueOnce(mockInvite);

    const { result } = renderHook(() =>
      useInvite("valid-token", "http://localhost:4100")
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.invite).toEqual(mockInvite);
    expect(result.current.error).toBeNull();
  });

  it("should handle resolve error", async () => {
    mockResolveInvite.mockRejectedValueOnce(new Error("Invite not found"));

    const { result } = renderHook(() =>
      useInvite("invalid-token", "http://localhost:4100")
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.invite).toBeNull();
    expect(result.current.error).not.toBeNull();
  });

  it("should return null from acceptInvite when no token", async () => {
    const { result } = renderHook(() =>
      useInvite(null, "http://localhost:4100")
    );

    let acceptResult: unknown;
    await act(async () => {
      acceptResult = await result.current.acceptInvite();
    });

    expect(acceptResult).toBeNull();
  });

  it("should return null from acceptInvite when not authenticated", async () => {
    mockResolveInvite.mockResolvedValueOnce(mockInvite);

    const { result } = renderHook(() =>
      useInvite("test-token", "http://localhost:4100")
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Since user is not authenticated, acceptInvite should return null
    let acceptResult: unknown;
    await act(async () => {
      acceptResult = await result.current.acceptInvite();
    });

    expect(acceptResult).toBeNull();
  });

  it("should accept invite when authenticated", async () => {
    const mockWorkspace = {
      id: "ws-1",
      name: "Test Workspace",
      slug: "test-workspace",
      planType: "free" as const,
      role: "workspace_member" as const,
    };

    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        email: "test@example.com",
        displayName: "Test User",
        avatarUrl: null,
        emailVerified: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
      isLoading: false,
      isAuthenticated: true,
      workspaces: [],
      error: null,
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      refreshWorkspaces: vi.fn(),
      redirectToLogin: vi.fn(),
      redirectToSignup: vi.fn(),
      getAccessToken: vi.fn(),
    });

    mockResolveInvite.mockResolvedValueOnce(mockInvite);
    mockAcceptInvite.mockResolvedValueOnce({
      accepted: true,
      workspaceId: "ws-1",
      roleKey: "workspace_member",
      workspaceMemberCreated: true,
      workspace: mockWorkspace,
    });

    const { result } = renderHook(() =>
      useInvite("test-token", "http://localhost:4100")
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let acceptResult: unknown;
    await act(async () => {
      acceptResult = await result.current.acceptInvite();
    });

    expect(acceptResult).toEqual(mockWorkspace);
  });

  it("should fall back to getWorkspaces when accept response omits workspace object", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        email: "test@example.com",
        displayName: "Test User",
        avatarUrl: null,
        emailVerified: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
      isLoading: false,
      isAuthenticated: true,
      workspaces: [],
      error: null,
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      refreshWorkspaces: vi.fn(),
      redirectToLogin: vi.fn(),
      redirectToSignup: vi.fn(),
      getAccessToken: vi.fn(),
    });

    const fallbackWorkspace = {
      id: "ws-1",
      name: "Test Workspace",
      slug: "test-workspace",
      planType: "free" as const,
      role: "workspace_member" as const,
    };

    mockResolveInvite.mockResolvedValueOnce(mockInvite);
    mockAcceptInvite.mockResolvedValueOnce({
      accepted: true,
      workspaceId: "ws-1",
      roleKey: "workspace_member",
      workspaceMemberCreated: true,
      workspace: null,
    });
    mockGetWorkspaces.mockResolvedValueOnce([fallbackWorkspace]);

    const { result } = renderHook(() =>
      useInvite("test-token", "http://localhost:4100")
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let acceptResult: unknown;
    await act(async () => {
      acceptResult = await result.current.acceptInvite();
    });

    expect(mockGetWorkspaces).toHaveBeenCalled();
    expect(acceptResult).toEqual(fallbackWorkspace);
  });

  it("should handle accept invite error", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        email: "test@example.com",
        displayName: "Test User",
        avatarUrl: null,
        emailVerified: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
      isLoading: false,
      isAuthenticated: true,
      workspaces: [],
      error: null,
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      refreshWorkspaces: vi.fn(),
      redirectToLogin: vi.fn(),
      redirectToSignup: vi.fn(),
      getAccessToken: vi.fn(),
    });

    mockResolveInvite.mockResolvedValueOnce(mockInvite);
    mockAcceptInvite.mockRejectedValueOnce(
      new Error("Failed to accept invite")
    );

    const { result } = renderHook(() =>
      useInvite("test-token", "http://localhost:4100")
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let acceptResult: unknown;
    await act(async () => {
      acceptResult = await result.current.acceptInvite();
    });

    expect(acceptResult).toBeNull();
    expect(result.current.error).not.toBeNull();
  });

  it("should clear invite when token changes to null", async () => {
    mockResolveInvite.mockResolvedValueOnce(mockInvite);

    const { result, rerender } = renderHook(
      ({ token }) => useInvite(token, "http://localhost:4100"),
      {
        initialProps: { token: "test-token" as string | null },
      }
    );

    await waitFor(() => {
      expect(result.current.invite).toEqual(mockInvite);
    });

    // Clear the token
    rerender({ token: null });

    expect(result.current.invite).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  describe("BUG-AUTH-4 — refresh-token recovery on acceptInvite", () => {
    const authenticatedUseAuth = () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          displayName: "Test User",
          avatarUrl: null,
          emailVerified: true,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
        isLoading: false,
        isAuthenticated: true,
        workspaces: [],
        error: null,
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
        refreshSession: vi.fn(),
        refreshWorkspaces: vi.fn(),
        redirectToLogin: vi.fn(),
        redirectToSignup: vi.fn(),
        getAccessToken: vi.fn(),
      });
    };

    it("returns the workspace from getWorkspaces() when acceptInvite throws a refresh-token error AND the join actually succeeded", async () => {
      authenticatedUseAuth();

      const joinedWorkspace = {
        id: "ws-1",
        name: "Test Workspace",
        slug: "test-workspace",
        planType: "free" as const,
        role: "workspace_member" as const,
      };

      mockResolveInvite.mockResolvedValueOnce(mockInvite);
      // The underlying HTTP call throws a Supabase refresh-token side-effect
      // (the join still happens on the backend, but the in-flight call sees
      // the error).
      mockAcceptInvite.mockRejectedValueOnce({
        message: "Invalid Refresh Token: Refresh Token Not Found",
        name: "AuthApiError",
      });
      // Recovery: getWorkspaces() returns the just-joined workspace.
      mockGetWorkspaces.mockResolvedValueOnce([joinedWorkspace]);

      const { result } = renderHook(() =>
        useInvite("test-token", "http://localhost:4100")
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let acceptResult: unknown;
      await act(async () => {
        acceptResult = await result.current.acceptInvite();
      });

      expect(acceptResult).toEqual(joinedWorkspace);
      // BUG-AUTH-4 key invariant: NO error is surfaced to the UI when
      // the recovery check confirms the join did succeed.
      expect(result.current.error).toBeNull();
      expect(mockGetWorkspaces).toHaveBeenCalledTimes(1);
    });

    it("surfaces session_expired (NOT unknown_error) when recovery confirms the join did NOT happen", async () => {
      authenticatedUseAuth();

      mockResolveInvite.mockResolvedValueOnce(mockInvite);
      mockAcceptInvite.mockRejectedValueOnce({
        message: "Invalid Refresh Token: Refresh Token Not Found",
        name: "AuthApiError",
      });
      // Recovery: getWorkspaces() returns no workspaces (the join did NOT happen).
      mockGetWorkspaces.mockResolvedValueOnce([]);

      const { result } = renderHook(() =>
        useInvite("test-token", "http://localhost:4100")
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let acceptResult: unknown;
      await act(async () => {
        acceptResult = await result.current.acceptInvite();
      });

      expect(acceptResult).toBeNull();
      expect(result.current.error?.code).toBe("session_expired");
      // We deliberately avoid the generic "unknown_error" copy that the
      // user reported in the bug ("An unexpected error occurred").
      expect(result.current.error?.code).not.toBe("unknown_error");
    });

    it("falls back to the original error path when getWorkspaces() throws during recovery", async () => {
      authenticatedUseAuth();

      mockResolveInvite.mockResolvedValueOnce(mockInvite);
      mockAcceptInvite.mockRejectedValueOnce({
        message: "Invalid Refresh Token: Refresh Token Not Found",
        name: "AuthApiError",
      });
      // Recovery itself fails (e.g. transient network).
      mockGetWorkspaces.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useInvite("test-token", "http://localhost:4100")
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let acceptResult: unknown;
      await act(async () => {
        acceptResult = await result.current.acceptInvite();
      });

      // The hook still surfaces a session_expired (not unknown_error) so
      // the user gets actionable copy rather than the generic
      // "unexpected error" the bug reporter saw.
      expect(acceptResult).toBeNull();
      expect(result.current.error?.code).toBe("session_expired");
    });

    it("does NOT trigger the recovery path for non-refresh-token errors (e.g. network, 404)", async () => {
      authenticatedUseAuth();

      mockResolveInvite.mockResolvedValueOnce(mockInvite);
      mockAcceptInvite.mockRejectedValueOnce({
        message: "Failed to fetch",
      });

      const { result } = renderHook(() =>
        useInvite("test-token", "http://localhost:4100")
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let acceptResult: unknown;
      await act(async () => {
        acceptResult = await result.current.acceptInvite();
      });

      expect(acceptResult).toBeNull();
      expect(result.current.error?.code).toBe("network_error");
      // Recovery is scoped to refresh-token errors; getWorkspaces is
      // NOT called for unrelated failures.
      expect(mockGetWorkspaces).not.toHaveBeenCalled();
    });

    it("does NOT trigger recovery when invite resolution failed (no workspaceId to check against)", async () => {
      authenticatedUseAuth();

      // Invite never resolved (e.g. invalid token).
      mockResolveInvite.mockRejectedValueOnce({
        statusCode: 404,
        message: "Invite not found",
      });

      const { result } = renderHook(() =>
        useInvite("test-token", "http://localhost:4100")
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Invite resolution itself failed; acceptInvite never reaches the
      // refresh-token branch because the early `!isAuthenticated` /
      // result-shape guards short-circuit.
      mockAcceptInvite.mockRejectedValueOnce({
        message: "Invalid Refresh Token: Refresh Token Not Found",
        name: "AuthApiError",
      });

      let acceptResult: unknown;
      await act(async () => {
        acceptResult = await result.current.acceptInvite();
      });

      // Because `invite?.workspaceId` is undefined, recovery is skipped
      // and we fall through to the original normalize path.
      expect(acceptResult).toBeNull();
      expect(mockGetWorkspaces).not.toHaveBeenCalled();
    });
  });
});
