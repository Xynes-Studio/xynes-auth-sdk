import { describe, it, expect } from "vitest";
import { normalizeFeatureFlags } from "./feature-flags";

describe("normalizeFeatureFlags", () => {
  it("maps gateway-style keys to SDK keys", () => {
    const result = normalizeFeatureFlags({
      enableOAuthGoogle: true,
      enableOAuthGitHub: false,
      enablePasswordReset: true,
      enableAuthDashboardAppsV1: false,
      maintenanceMode: true,
    });

    expect(result).toEqual({
      xynes_auth_oauth_google: true,
      xynes_auth_oauth_github: false,
      xynes_auth_password_reset: true,
      xynes_auth_dashboard_apps_v1: false,
      xynes_maintenance_mode: true,
    });
  });

  it("preserves SDK keys when provided", () => {
    const result = normalizeFeatureFlags({
      xynes_auth_oauth_google: false,
      xynes_workspace_multiple: true,
      xynes_auth_dashboard_apps_v1: false,
    });

    expect(result).toEqual({
      xynes_auth_oauth_google: false,
      xynes_workspace_multiple: true,
      xynes_auth_dashboard_apps_v1: false,
    });
  });

  it("ignores non-boolean values", () => {
    const result = normalizeFeatureFlags({
      enableOAuthApple: "true",
      enableInvites: 1,
      enableMFA: null,
      enableOAuthGithub: false,
    });

    expect(result).toEqual({
      xynes_auth_oauth_github: false,
    });
  });

  it("returns empty object for invalid input", () => {
    expect(normalizeFeatureFlags(undefined)).toEqual({});
    expect(normalizeFeatureFlags(null)).toEqual({});
    expect(normalizeFeatureFlags("invalid")).toEqual({});
  });
});
