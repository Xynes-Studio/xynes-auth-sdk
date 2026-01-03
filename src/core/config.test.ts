/**
 * Unit Tests for SDK Configuration
 * Tier 1: Pure Function Tests - 100% coverage target
 *
 * @description Tests for SDK configuration creation and validation
 */
import { describe, it, expect } from "vitest";
import {
  createAuthConfig,
  validateAuthConfig,
  type AuthSDKConfig,
} from "./config";

describe("createAuthConfig", () => {
  const validConfig = {
    supabase: {
      url: "https://test.supabase.co",
      anonKey: "test-anon-key",
    },
    api: {
      baseUrl: "https://api.example.com",
    },
    auth: {
      appUrl: "https://auth.example.com",
    },
  };

  it("should create config with required fields", () => {
    const config = createAuthConfig(validConfig);

    expect(config.supabase.url).toBe("https://test.supabase.co");
    expect(config.supabase.anonKey).toBe("test-anon-key");
    expect(config.api.baseUrl).toBe("https://api.example.com");
    expect(config.auth.appUrl).toBe("https://auth.example.com");
  });

  it("should set default cookie domain when not provided", () => {
    const config = createAuthConfig(validConfig);

    expect(config.auth.cookieDomain).toBeUndefined();
  });

  it("should use provided cookie domain", () => {
    const config = createAuthConfig({
      ...validConfig,
      auth: {
        ...validConfig.auth,
        cookieDomain: ".example.com",
      },
    });

    expect(config.auth.cookieDomain).toBe(".example.com");
  });

  it("should use default feature flags when not provided", () => {
    const config = createAuthConfig(validConfig);

    expect(config.features).toBeDefined();
    expect(config.features.enableEmailAuth).toBe(true);
    expect(config.features.enableOAuthGoogle).toBe(true);
  });

  it("should merge custom feature flags with defaults", () => {
    const config = createAuthConfig({
      ...validConfig,
      features: {
        enableMFA: true,
        enableOAuthApple: true,
      },
    });

    expect(config.features.enableMFA).toBe(true);
    expect(config.features.enableOAuthApple).toBe(true);
    // Defaults preserved
    expect(config.features.enableEmailAuth).toBe(true);
  });

  it("should include modules config when provided", () => {
    const config = createAuthConfig({
      ...validConfig,
      modules: {
        "core-auth": { enabled: true },
        workspace: { enabled: false },
      },
    });

    expect(config.modules).toEqual({
      "core-auth": { enabled: true },
      workspace: { enabled: false },
    });
  });
});

describe("validateAuthConfig", () => {
  it("should return valid for complete config", () => {
    const config: AuthSDKConfig = {
      supabase: {
        url: "https://test.supabase.co",
        anonKey: "test-key",
      },
      api: {
        baseUrl: "https://api.example.com",
      },
      auth: {
        appUrl: "https://auth.example.com",
      },
      features: {
        enableEmailAuth: true,
        enableOAuthGoogle: true,
        enableOAuthGitHub: true,
        enableOAuthApple: false,
        enableWorkspaceCreation: true,
        enableWorkspaceSwitching: true,
        enableMultipleWorkspaces: true,
        enableInvites: true,
        enableInviteRevocation: true,
        enableMFA: false,
        enableSessionManagement: false,
        enableRateLimitUI: true,
        enableCSPReporting: true,
        enableRememberMe: true,
        enablePasswordReset: true,
        enableProfileEdit: true,
      },
    };

    const result = validateAuthConfig(config);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should return error for missing supabase url", () => {
    const config = {
      supabase: {
        url: "",
        anonKey: "test-key",
      },
      api: {
        baseUrl: "https://api.example.com",
      },
      auth: {
        appUrl: "https://auth.example.com",
      },
      features: {} as AuthSDKConfig["features"],
    };

    const result = validateAuthConfig(config as AuthSDKConfig);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("supabase.url is required");
  });

  it("should return error for missing supabase anonKey", () => {
    const config = {
      supabase: {
        url: "https://test.supabase.co",
        anonKey: "",
      },
      api: {
        baseUrl: "https://api.example.com",
      },
      auth: {
        appUrl: "https://auth.example.com",
      },
      features: {} as AuthSDKConfig["features"],
    };

    const result = validateAuthConfig(config as AuthSDKConfig);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("supabase.anonKey is required");
  });

  it("should return error for missing api baseUrl", () => {
    const config = {
      supabase: {
        url: "https://test.supabase.co",
        anonKey: "test-key",
      },
      api: {
        baseUrl: "",
      },
      auth: {
        appUrl: "https://auth.example.com",
      },
      features: {} as AuthSDKConfig["features"],
    };

    const result = validateAuthConfig(config as AuthSDKConfig);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("api.baseUrl is required");
  });

  it("should return error for missing auth appUrl", () => {
    const config = {
      supabase: {
        url: "https://test.supabase.co",
        anonKey: "test-key",
      },
      api: {
        baseUrl: "https://api.example.com",
      },
      auth: {
        appUrl: "",
      },
      features: {} as AuthSDKConfig["features"],
    };

    const result = validateAuthConfig(config as AuthSDKConfig);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("auth.appUrl is required");
  });

  it("should return multiple errors when multiple fields missing", () => {
    const config = {
      supabase: {
        url: "",
        anonKey: "",
      },
      api: {
        baseUrl: "",
      },
      auth: {
        appUrl: "",
      },
      features: {} as AuthSDKConfig["features"],
    };

    const result = validateAuthConfig(config as AuthSDKConfig);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(4);
  });

  it("should validate URL format for supabase.url", () => {
    const config = {
      supabase: {
        url: "not-a-valid-url",
        anonKey: "test-key",
      },
      api: {
        baseUrl: "https://api.example.com",
      },
      auth: {
        appUrl: "https://auth.example.com",
      },
      features: {} as AuthSDKConfig["features"],
    };

    const result = validateAuthConfig(config as AuthSDKConfig);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("supabase.url must be a valid URL");
  });

  it("should validate URL format for api.baseUrl", () => {
    const config = {
      supabase: {
        url: "https://test.supabase.co",
        anonKey: "test-key",
      },
      api: {
        baseUrl: "invalid-url",
      },
      auth: {
        appUrl: "https://auth.example.com",
      },
      features: {} as AuthSDKConfig["features"],
    };

    const result = validateAuthConfig(config as AuthSDKConfig);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("api.baseUrl must be a valid URL");
  });

  it("should validate URL format for auth.appUrl", () => {
    const config = {
      supabase: {
        url: "https://test.supabase.co",
        anonKey: "test-key",
      },
      api: {
        baseUrl: "https://api.example.com",
      },
      auth: {
        appUrl: "not-valid",
      },
      features: {} as AuthSDKConfig["features"],
    };

    const result = validateAuthConfig(config as AuthSDKConfig);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("auth.appUrl must be a valid URL");
  });

  it("should accept valid cookie domain starting with dot", () => {
    const config = {
      supabase: {
        url: "https://test.supabase.co",
        anonKey: "test-key",
      },
      api: {
        baseUrl: "https://api.example.com",
      },
      auth: {
        appUrl: "https://auth.example.com",
        cookieDomain: ".xynes.com",
      },
      features: {} as AuthSDKConfig["features"],
    };

    const result = validateAuthConfig(config as AuthSDKConfig);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should accept valid cookie domain without dot", () => {
    const config = {
      supabase: {
        url: "https://test.supabase.co",
        anonKey: "test-key",
      },
      api: {
        baseUrl: "https://api.example.com",
      },
      auth: {
        appUrl: "https://auth.example.com",
        cookieDomain: "localhost",
      },
      features: {} as AuthSDKConfig["features"],
    };

    const result = validateAuthConfig(config as AuthSDKConfig);

    expect(result.valid).toBe(true);
  });

  it("should reject invalid cookie domain with special characters", () => {
    const config = {
      supabase: {
        url: "https://test.supabase.co",
        anonKey: "test-key",
      },
      api: {
        baseUrl: "https://api.example.com",
      },
      auth: {
        appUrl: "https://auth.example.com",
        cookieDomain: "invalid domain!",
      },
      features: {} as AuthSDKConfig["features"],
    };

    const result = validateAuthConfig(config as AuthSDKConfig);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("auth.cookieDomain must start with a dot (e.g., .xynes.com)");
  });

  it("should reject URLs with non-http protocols", () => {
    const config = {
      supabase: {
        url: "ftp://test.supabase.co",
        anonKey: "test-key",
      },
      api: {
        baseUrl: "https://api.example.com",
      },
      auth: {
        appUrl: "https://auth.example.com",
      },
      features: {} as AuthSDKConfig["features"],
    };

    const result = validateAuthConfig(config as AuthSDKConfig);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("supabase.url must be a valid URL");
  });
});
