import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWorkspaces } from "./useWorkspaces";
import * as AuthProviderModule from "../providers/AuthProvider";
import type { Workspace } from "../types";

// Mock the useAuth hook directly
const mockUseAuth = vi.spyOn(AuthProviderModule, "useAuth");

const mockWorkspaces: Workspace[] = [
  {
    id: "ws-1",
    name: "Workspace 1",
    slug: "workspace-1",
    tier: "starter",
    createdAt: "2024-01-01",
    role: "owner",
  },
  {
    id: "ws-2",
    name: "Workspace 2",
    slug: "workspace-2",
    tier: "pro",
    createdAt: "2024-01-02",
    role: "member",
  },
];

describe("useWorkspaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return loading state and empty workspaces initially", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      workspaces: [],
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    const { result } = renderHook(() => useWorkspaces());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.workspaces).toEqual([]);
    expect(result.current.hasWorkspaces).toBe(false);
    expect(result.current.hasSingleWorkspace).toBe(false);
    expect(result.current.hasMultipleWorkspaces).toBe(false);
  });

  it("should return hasWorkspaces = true when workspaces exist", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: true,
      workspaces: mockWorkspaces,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    const { result } = renderHook(() => useWorkspaces());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.workspaces).toEqual(mockWorkspaces);
    expect(result.current.hasWorkspaces).toBe(true);
    expect(result.current.hasSingleWorkspace).toBe(false);
    expect(result.current.hasMultipleWorkspaces).toBe(true);
  });

  it("should return hasSingleWorkspace = true when only one workspace", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: true,
      workspaces: [mockWorkspaces[0]],
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    const { result } = renderHook(() => useWorkspaces());

    expect(result.current.hasSingleWorkspace).toBe(true);
    expect(result.current.hasMultipleWorkspaces).toBe(false);
  });

  it("should return hasMultipleWorkspaces = true when more than one workspace", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: true,
      workspaces: mockWorkspaces,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    const { result } = renderHook(() => useWorkspaces());

    expect(result.current.hasWorkspaces).toBe(true);
    expect(result.current.hasMultipleWorkspaces).toBe(true);
  });
});
