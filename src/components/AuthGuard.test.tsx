import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthGuard } from "./AuthGuard";
import * as AuthProviderModule from "../providers/AuthProvider";

const mockUseAuth = vi.spyOn(AuthProviderModule, "useAuth");
const mockRedirectToLogin = vi.fn();

function setAuthState({
  isLoading,
  isAuthenticated,
}: {
  isLoading: boolean;
  isAuthenticated: boolean;
}) {
  mockUseAuth.mockReturnValue({
    user: null,
    workspaces: [],
    isLoading,
    isAuthenticated,
    error: null,
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    redirectToLogin: mockRedirectToLogin,
    redirectToSignup: vi.fn(),
    refreshSession: vi.fn(),
    getAccessToken: vi.fn(),
  });
}

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading component while auth is loading", () => {
    setAuthState({ isLoading: true, isAuthenticated: false });

    render(
      <AuthGuard loadingComponent={<div>custom-loading</div>}>
        <div>secret</div>
      </AuthGuard>
    );

    expect(screen.getByText("custom-loading")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    setAuthState({ isLoading: false, isAuthenticated: true });

    render(
      <AuthGuard>
        <div>secret</div>
      </AuthGuard>
    );

    expect(screen.getByText("secret")).toBeInTheDocument();
    expect(mockRedirectToLogin).not.toHaveBeenCalled();
  });

  it("keeps existing callback mode working", () => {
    setAuthState({ isLoading: false, isAuthenticated: false });
    const onUnauthenticated = vi.fn();

    render(
      <AuthGuard onUnauthenticated={onUnauthenticated}>
        <div>secret</div>
      </AuthGuard>
    );

    expect(onUnauthenticated).toHaveBeenCalledTimes(1);
    expect(mockRedirectToLogin).not.toHaveBeenCalled();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users in redirect-to-auth mode", () => {
    setAuthState({ isLoading: false, isAuthenticated: false });

    render(
      <AuthGuard unauthenticatedMode="redirectToAuth">
        <div>secret</div>
      </AuthGuard>
    );

    expect(mockRedirectToLogin).toHaveBeenCalledTimes(1);
    expect(mockRedirectToLogin).toHaveBeenCalledWith(undefined);
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("passes explicit returnUrl when redirecting", () => {
    setAuthState({ isLoading: false, isAuthenticated: false });

    render(
      <AuthGuard
        unauthenticatedMode="redirectToAuth"
        returnUrl="https://cms.test.com/protected?tab=drafts"
      >
        <div>secret</div>
      </AuthGuard>
    );

    expect(mockRedirectToLogin).toHaveBeenCalledTimes(1);
    expect(mockRedirectToLogin).toHaveBeenCalledWith(
      "https://cms.test.com/protected?tab=drafts"
    );
  });

  it("does not redirect more than once while still unauthenticated", () => {
    setAuthState({ isLoading: false, isAuthenticated: false });

    const { rerender } = render(
      <AuthGuard unauthenticatedMode="redirectToAuth">
        <div>secret</div>
      </AuthGuard>
    );

    rerender(
      <AuthGuard unauthenticatedMode="redirectToAuth">
        <div>secret</div>
      </AuthGuard>
    );

    expect(mockRedirectToLogin).toHaveBeenCalledTimes(1);
  });

  it("renders children for optional guard when unauthenticated", () => {
    setAuthState({ isLoading: false, isAuthenticated: false });

    render(
      <AuthGuard optional>
        <div>public</div>
      </AuthGuard>
    );

    expect(screen.getByText("public")).toBeInTheDocument();
    expect(mockRedirectToLogin).not.toHaveBeenCalled();
  });
});
