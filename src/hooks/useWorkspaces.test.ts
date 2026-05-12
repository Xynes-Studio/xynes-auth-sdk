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
    planType: "free",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    role: "workspace_owner",
  },
  {
    id: "ws-2",
    name: "Workspace 2",
    slug: "workspace-2",
    planType: "pro",
    createdAt: "2024-01-02",
    updatedAt: "2024-01-02",
    role: "workspace_member",
  },
];

const createMockAuthValue = (overrides = {}) => ({
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
  ...overrides,
});

describe("useWorkspaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return loading state and empty workspaces initially", () => {
    mockUseAuth.mockReturnValue(createMockAuthValue({ isLoading: true }));

    const { result } = renderHook(() => useWorkspaces());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.workspaces).toEqual([]);
    expect(result.current.hasWorkspaces).toBe(false);
    expect(result.current.hasSingleWorkspace).toBe(false);
    expect(result.current.hasMultipleWorkspaces).toBe(false);
  });

  it("should return hasWorkspaces = true when workspaces exist", () => {
    mockUseAuth.mockReturnValue(
      createMockAuthValue({
        isAuthenticated: true,
        workspaces: mockWorkspaces,
      })
    );

    const { result } = renderHook(() => useWorkspaces());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.workspaces).toEqual(mockWorkspaces);
    expect(result.current.hasWorkspaces).toBe(true);
    expect(result.current.hasSingleWorkspace).toBe(false);
    expect(result.current.hasMultipleWorkspaces).toBe(true);
  });

  it("should return hasSingleWorkspace = true when only one workspace", () => {
    mockUseAuth.mockReturnValue(
      createMockAuthValue({
        isAuthenticated: true,
        workspaces: [mockWorkspaces[0]],
      })
    );

    const { result } = renderHook(() => useWorkspaces());

    expect(result.current.hasSingleWorkspace).toBe(true);
    expect(result.current.hasMultipleWorkspaces).toBe(false);
  });

  it("should return hasMultipleWorkspaces = true when more than one workspace", () => {
    mockUseAuth.mockReturnValue(
      createMockAuthValue({
        isAuthenticated: true,
        workspaces: mockWorkspaces,
      })
    );

    const { result } = renderHook(() => useWorkspaces());

    expect(result.current.hasWorkspaces).toBe(true);
    expect(result.current.hasMultipleWorkspaces).toBe(true);
  });
});
