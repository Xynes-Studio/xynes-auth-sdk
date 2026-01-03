/**
 * Unit Tests for Feature Flags
 * Tier 1: Pure Function Tests - 100% coverage target
 *
 * @description Tests for feature flags system that enables
 * runtime configuration of auth features
 */
import { describe, it, expect } from "vitest";
import {
  DEFAULT_FLAGS,
  createFeatureFlags,
  isFeatureEnabled,
  mergeFeatureFlags,
  type AuthFeatureFlags,
} from "./feature-flags";

describe("DEFAULT_FLAGS", () => {
  describe("Core Auth Flags", () => {
    it("should have enableEmailAuth set to true", () => {
      expect(DEFAULT_FLAGS.enableEmailAuth).toBe(true);
    });

    it("should have enableOAuthGoogle set to true", () => {
      expect(DEFAULT_FLAGS.enableOAuthGoogle).toBe(true);
    });

    it("should have enableOAuthGitHub set to true", () => {
      expect(DEFAULT_FLAGS.enableOAuthGitHub).toBe(true);
    });

    it("should have enableOAuthApple set to false", () => {
      expect(DEFAULT_FLAGS.enableOAuthApple).toBe(false);
    });
  });

  describe("Workspace Flags", () => {
    it("should have enableWorkspaceCreation set to true", () => {
      expect(DEFAULT_FLAGS.enableWorkspaceCreation).toBe(true);
    });

    it("should have enableWorkspaceSwitching set to true", () => {
      expect(DEFAULT_FLAGS.enableWorkspaceSwitching).toBe(true);
    });

    it("should have enableMultipleWorkspaces set to true", () => {
      expect(DEFAULT_FLAGS.enableMultipleWorkspaces).toBe(true);
    });
  });

  describe("Invite Flags", () => {
    it("should have enableInvites set to true", () => {
      expect(DEFAULT_FLAGS.enableInvites).toBe(true);
    });

    it("should have enableInviteRevocation set to true", () => {
      expect(DEFAULT_FLAGS.enableInviteRevocation).toBe(true);
    });
  });

  describe("Security Flags", () => {
    it("should have enableMFA set to false", () => {
      expect(DEFAULT_FLAGS.enableMFA).toBe(false);
    });

    it("should have enableSessionManagement set to false", () => {
      expect(DEFAULT_FLAGS.enableSessionManagement).toBe(false);
    });

    it("should have enableRateLimitUI set to true", () => {
      expect(DEFAULT_FLAGS.enableRateLimitUI).toBe(true);
    });

    it("should have enableCSPReporting set to true", () => {
      expect(DEFAULT_FLAGS.enableCSPReporting).toBe(true);
    });
  });

  describe("UX Flags", () => {
    it("should have enableRememberMe set to true", () => {
      expect(DEFAULT_FLAGS.enableRememberMe).toBe(true);
    });

    it("should have enablePasswordReset set to true", () => {
      expect(DEFAULT_FLAGS.enablePasswordReset).toBe(true);
    });

    it("should have enableProfileEdit set to true", () => {
      expect(DEFAULT_FLAGS.enableProfileEdit).toBe(true);
    });
  });
});

describe("createFeatureFlags", () => {
  it("should return default flags when no overrides provided", () => {
    const flags = createFeatureFlags();
    expect(flags).toEqual(DEFAULT_FLAGS);
  });

  it("should merge overrides with defaults", () => {
    const flags = createFeatureFlags({
      enableMFA: true,
      enableOAuthApple: true,
    });

    expect(flags.enableMFA).toBe(true);
    expect(flags.enableOAuthApple).toBe(true);
    // Defaults should be preserved
    expect(flags.enableEmailAuth).toBe(true);
    expect(flags.enableOAuthGoogle).toBe(true);
  });

  it("should allow disabling default-enabled flags", () => {
    const flags = createFeatureFlags({
      enableEmailAuth: false,
      enableOAuthGoogle: false,
    });

    expect(flags.enableEmailAuth).toBe(false);
    expect(flags.enableOAuthGoogle).toBe(false);
  });

  it("should handle empty overrides object", () => {
    const flags = createFeatureFlags({});
    expect(flags).toEqual(DEFAULT_FLAGS);
  });
});

describe("isFeatureEnabled", () => {
  it("should return true for enabled feature", () => {
    const flags: AuthFeatureFlags = {
      ...DEFAULT_FLAGS,
      enableEmailAuth: true,
    };

    expect(isFeatureEnabled(flags, "enableEmailAuth")).toBe(true);
  });

  it("should return false for disabled feature", () => {
    const flags: AuthFeatureFlags = {
      ...DEFAULT_FLAGS,
      enableMFA: false,
    };

    expect(isFeatureEnabled(flags, "enableMFA")).toBe(false);
  });

  it("should work with all flag keys", () => {
    const allKeys: (keyof AuthFeatureFlags)[] = [
      "enableEmailAuth",
      "enableOAuthGoogle",
      "enableOAuthGitHub",
      "enableOAuthApple",
      "enableWorkspaceCreation",
      "enableWorkspaceSwitching",
      "enableMultipleWorkspaces",
      "enableInvites",
      "enableInviteRevocation",
      "enableMFA",
      "enableSessionManagement",
      "enableRateLimitUI",
      "enableCSPReporting",
      "enableRememberMe",
      "enablePasswordReset",
      "enableProfileEdit",
    ];

    allKeys.forEach((key) => {
      expect(() => isFeatureEnabled(DEFAULT_FLAGS, key)).not.toThrow();
    });
  });
});

describe("mergeFeatureFlags", () => {
  it("should merge two flag objects", () => {
    const base: AuthFeatureFlags = {
      ...DEFAULT_FLAGS,
      enableMFA: false,
    };
    const overrides: Partial<AuthFeatureFlags> = {
      enableMFA: true,
      enableOAuthApple: true,
    };

    const result = mergeFeatureFlags(base, overrides);

    expect(result.enableMFA).toBe(true);
    expect(result.enableOAuthApple).toBe(true);
    expect(result.enableEmailAuth).toBe(true); // Preserved from base
  });

  it("should not mutate the original objects", () => {
    const base: AuthFeatureFlags = { ...DEFAULT_FLAGS };
    const overrides: Partial<AuthFeatureFlags> = { enableMFA: true };

    mergeFeatureFlags(base, overrides);

    expect(base.enableMFA).toBe(false);
  });

  it("should handle empty overrides", () => {
    const base: AuthFeatureFlags = { ...DEFAULT_FLAGS };
    const result = mergeFeatureFlags(base, {});

    expect(result).toEqual(base);
  });

  it("should create a new object", () => {
    const base: AuthFeatureFlags = { ...DEFAULT_FLAGS };
    const result = mergeFeatureFlags(base, {});

    expect(result).not.toBe(base);
  });
});

describe("AuthFeatureFlags type", () => {
  it("should have all required properties", () => {
    const flags: AuthFeatureFlags = {
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
    };

    // If this compiles, the type is correct
    expect(flags).toBeDefined();
  });
});
