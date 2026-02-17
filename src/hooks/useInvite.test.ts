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
});
