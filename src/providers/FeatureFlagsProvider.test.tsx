import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  FeatureFlagsProvider,
  useFeatureFlags,
  useFeatureFlag,
  useOAuthProviders,
  useMaintenanceMode,
} from "./FeatureFlagsProvider";
import { DEFAULT_FEATURE_FLAGS } from "../types/feature-flags";
import type { FeatureFlagsResponse } from "../types/feature-flags";

// Test component to access hook values
function TestConsumer() {
  const { flags, isLoading, isAuthenticated, error, isEnabled } =
    useFeatureFlags();
  return (
    <div>
      <span data-testid="loading">{isLoading.toString()}</span>
      <span data-testid="authenticated">{isAuthenticated.toString()}</span>
      <span data-testid="error">{error?.message ?? "none"}</span>
      <span data-testid="google">
        {flags.xynes_auth_oauth_google.toString()}
      </span>
      <span data-testid="github">
        {flags.xynes_auth_oauth_github.toString()}
      </span>
      <span data-testid="mfa-enabled">
        {isEnabled("xynes_auth_mfa").toString()}
      </span>
    </div>
  );
}

function OAuthConsumer() {
  const providers = useOAuthProviders();
  return (
    <div>
      <span data-testid="oauth-google">{providers.google.toString()}</span>
      <span data-testid="oauth-github">{providers.github.toString()}</span>
      <span data-testid="oauth-apple">{providers.apple.toString()}</span>
    </div>
  );
}

function SingleFlagConsumer() {
  const isGoogleEnabled = useFeatureFlag("xynes_auth_oauth_google");
  const isMaintenanceMode = useMaintenanceMode();
  return (
    <div>
      <span data-testid="single-google">{isGoogleEnabled.toString()}</span>
      <span data-testid="maintenance">{isMaintenanceMode.toString()}</span>
    </div>
  );
}

describe("FeatureFlagsProvider", () => {
  const mockFlagsResponse: FeatureFlagsResponse = {
    flags: {
      xynes_auth_oauth_google: true,
      xynes_auth_oauth_github: true,
      xynes_auth_oauth_apple: false,
      xynes_auth_email_signup: true,
      xynes_auth_password_reset: true,
      xynes_auth_mfa: false,
      xynes_auth_remember_me: true,
      xynes_auth_session_management: false,
      xynes_auth_rate_limit_ui: true,
      xynes_auth_profile_edit: true,
      xynes_workspace_creation: true,
      xynes_workspace_switching: true,
      xynes_workspace_multiple: true,
      xynes_invite_system: true,
      xynes_invite_revocation: true,
      xynes_maintenance_mode: false,
    },
    authenticated: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches flags on mount and updates state", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockFlagsResponse),
    });

    render(
      <FeatureFlagsProvider apiBaseUrl="http://localhost:4100">
        <TestConsumer />
      </FeatureFlagsProvider>,
    );

    // Initially loading
    expect(screen.getByTestId("loading").textContent).toBe("true");

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByTestId("google").textContent).toBe("true");
    expect(screen.getByTestId("github").textContent).toBe("true");
    expect(screen.getByTestId("authenticated").textContent).toBe("false");
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:4100/flags",
      expect.any(Object),
    );
  });

  it("normalizes gateway-style flag keys from the response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          flags: {
            enableOAuthGoogle: true,
            enableOAuthGitHub: false,
            enablePasswordReset: true,
          },
          authenticated: false,
        }),
    });

    render(
      <FeatureFlagsProvider apiBaseUrl="http://localhost:4100">
        <TestConsumer />
      </FeatureFlagsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByTestId("google").textContent).toBe("true");
    expect(screen.getByTestId("github").textContent).toBe("false");
  });

  it("uses default flags when fetch fails", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error"),
    );

    render(
      <FeatureFlagsProvider apiBaseUrl="http://localhost:4100">
        <TestConsumer />
      </FeatureFlagsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    // Should use defaults (OAuth disabled for safety)
    expect(screen.getByTestId("google").textContent).toBe(
      DEFAULT_FEATURE_FLAGS.xynes_auth_oauth_google.toString(),
    );
    expect(screen.getByTestId("error").textContent).toBe("Network error");

    consoleSpy.mockRestore();
  });

  it("respects fetchOnMount=false", async () => {
    render(
      <FeatureFlagsProvider
        apiBaseUrl="http://localhost:4100"
        fetchOnMount={false}
      >
        <TestConsumer />
      </FeatureFlagsProvider>,
    );

    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("uses initial flags when provided", async () => {
    render(
      <FeatureFlagsProvider
        apiBaseUrl="http://localhost:4100"
        fetchOnMount={false}
        initialFlags={{
          xynes_auth_oauth_google: true,
          xynes_auth_mfa: true,
        }}
      >
        <TestConsumer />
      </FeatureFlagsProvider>,
    );

    expect(screen.getByTestId("google").textContent).toBe("true");
    expect(screen.getByTestId("mfa-enabled").textContent).toBe("true");
  });

  it("applies override flags after fetch", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockFlagsResponse),
    });

    render(
      <FeatureFlagsProvider
        apiBaseUrl="http://localhost:4100"
        flagOverrides={{
          xynes_auth_oauth_github: false,
        }}
      >
        <TestConsumer />
      </FeatureFlagsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByTestId("google").textContent).toBe("true");
    expect(screen.getByTestId("github").textContent).toBe("false");
  });

  it("handles authenticated flag response", async () => {
    const authenticatedResponse = {
      ...mockFlagsResponse,
      authenticated: true,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(authenticatedResponse),
    });

    render(
      <FeatureFlagsProvider apiBaseUrl="http://localhost:4100">
        <TestConsumer />
      </FeatureFlagsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated").textContent).toBe("true");
    });
  });

  it("includes auth token when getAccessToken is provided", async () => {
    const mockToken = "test-jwt-token";
    const getAccessToken = vi.fn().mockResolvedValue(mockToken);

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockFlagsResponse),
    });

    render(
      <FeatureFlagsProvider
        apiBaseUrl="http://localhost:4100"
        getAccessToken={getAccessToken}
      >
        <TestConsumer />
      </FeatureFlagsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(getAccessToken).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:4100/flags",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockToken}`,
        }),
      }),
    );
  });
});

describe("useOAuthProviders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns OAuth provider configuration", async () => {
    const response: FeatureFlagsResponse = {
      flags: {
        ...DEFAULT_FEATURE_FLAGS,
        xynes_auth_oauth_google: true,
        xynes_auth_oauth_github: false,
        xynes_auth_oauth_apple: true,
      },
      authenticated: false,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(response),
    });

    render(
      <FeatureFlagsProvider apiBaseUrl="http://localhost:4100">
        <OAuthConsumer />
      </FeatureFlagsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("oauth-google").textContent).toBe("true");
      expect(screen.getByTestId("oauth-github").textContent).toBe("false");
      expect(screen.getByTestId("oauth-apple").textContent).toBe("true");
    });
  });
});

describe("useFeatureFlag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns single flag value", async () => {
    const response: FeatureFlagsResponse = {
      flags: {
        ...DEFAULT_FEATURE_FLAGS,
        xynes_auth_oauth_google: true,
        xynes_maintenance_mode: true,
      },
      authenticated: false,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(response),
    });

    render(
      <FeatureFlagsProvider apiBaseUrl="http://localhost:4100">
        <SingleFlagConsumer />
      </FeatureFlagsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("single-google").textContent).toBe("true");
      expect(screen.getByTestId("maintenance").textContent).toBe("true");
    });
  });
});

describe("useMaintenanceMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns maintenance mode status", async () => {
    const response: FeatureFlagsResponse = {
      flags: {
        ...DEFAULT_FEATURE_FLAGS,
        xynes_maintenance_mode: true,
      },
      authenticated: false,
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(response),
    });

    render(
      <FeatureFlagsProvider apiBaseUrl="http://localhost:4100">
        <SingleFlagConsumer />
      </FeatureFlagsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("maintenance").textContent).toBe("true");
    });
  });
});

describe("useFeatureFlags outside provider", () => {
  it("throws error when used outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow("useFeatureFlags must be used within a FeatureFlagsProvider");

    consoleSpy.mockRestore();
  });
});
