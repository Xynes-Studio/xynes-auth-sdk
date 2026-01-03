/**
 * Unit Tests for Module Registry
 * Tier 1: Pure Function Tests - 100% coverage target
 *
 * @description Tests for the module registry pattern that enables
 * plugin-based architecture for auth features
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  ModuleRegistry,
  moduleRegistry,
  MODULE_IDS,
  type AuthModule,
  type RouteConfig,
} from "./module-registry";

describe("ModuleRegistry", () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    registry = new ModuleRegistry();
  });

  describe("constructor", () => {
    it("should create an empty registry", () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe("register", () => {
    it("should register a module", () => {
      const module: AuthModule = {
        id: "test-module",
        name: "Test Module",
        enabled: true,
      };

      registry.register(module);

      expect(registry.get("test-module")).toEqual(module);
    });

    it("should override existing module with same id", () => {
      const module1: AuthModule = {
        id: "test-module",
        name: "Test Module v1",
        enabled: true,
      };
      const module2: AuthModule = {
        id: "test-module",
        name: "Test Module v2",
        enabled: false,
      };

      registry.register(module1);
      registry.register(module2);

      expect(registry.get("test-module")?.name).toBe("Test Module v2");
    });

    it("should register module with routes", () => {
      const routes: RouteConfig[] = [
        {
          path: "/login",
          layout: "auth",
          guard: "unauthenticated",
        },
      ];

      const module: AuthModule = {
        id: "auth-core",
        name: "Auth Core",
        enabled: true,
        routes,
      };

      registry.register(module);

      expect(registry.get("auth-core")?.routes).toEqual(routes);
    });
  });

  describe("get", () => {
    it("should return undefined for non-existent module", () => {
      expect(registry.get("non-existent")).toBeUndefined();
    });

    it("should return the module by id", () => {
      const module: AuthModule = {
        id: "test",
        name: "Test",
        enabled: true,
      };

      registry.register(module);

      expect(registry.get("test")).toEqual(module);
    });
  });

  describe("getAll", () => {
    it("should return all registered modules", () => {
      const module1: AuthModule = { id: "m1", name: "M1", enabled: true };
      const module2: AuthModule = { id: "m2", name: "M2", enabled: false };

      registry.register(module1);
      registry.register(module2);

      expect(registry.getAll()).toHaveLength(2);
      expect(registry.getAll()).toContainEqual(module1);
      expect(registry.getAll()).toContainEqual(module2);
    });
  });

  describe("getEnabled", () => {
    it("should return only enabled modules", () => {
      const enabled: AuthModule = {
        id: "enabled",
        name: "Enabled",
        enabled: true,
      };
      const disabled: AuthModule = {
        id: "disabled",
        name: "Disabled",
        enabled: false,
      };

      registry.register(enabled);
      registry.register(disabled);

      const result = registry.getEnabled();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("enabled");
    });

    it("should return empty array when no modules are enabled", () => {
      const disabled: AuthModule = {
        id: "disabled",
        name: "Disabled",
        enabled: false,
      };
      registry.register(disabled);

      expect(registry.getEnabled()).toEqual([]);
    });
  });

  describe("getRoutes", () => {
    it("should return routes from all enabled modules", () => {
      const module1: AuthModule = {
        id: "m1",
        name: "M1",
        enabled: true,
        routes: [
          { path: "/login", layout: "auth", guard: "unauthenticated" },
          { path: "/signup", layout: "auth", guard: "unauthenticated" },
        ],
      };
      const module2: AuthModule = {
        id: "m2",
        name: "M2",
        enabled: true,
        routes: [{ path: "/dashboard", layout: "app", guard: "authenticated" }],
      };

      registry.register(module1);
      registry.register(module2);

      const routes = registry.getRoutes();

      expect(routes).toHaveLength(3);
      expect(routes.map((r) => r.path)).toContain("/login");
      expect(routes.map((r) => r.path)).toContain("/signup");
      expect(routes.map((r) => r.path)).toContain("/dashboard");
    });

    it("should not return routes from disabled modules", () => {
      const enabled: AuthModule = {
        id: "enabled",
        name: "Enabled",
        enabled: true,
        routes: [{ path: "/enabled", layout: "auth", guard: "public" }],
      };
      const disabled: AuthModule = {
        id: "disabled",
        name: "Disabled",
        enabled: false,
        routes: [{ path: "/disabled", layout: "auth", guard: "public" }],
      };

      registry.register(enabled);
      registry.register(disabled);

      const routes = registry.getRoutes();

      expect(routes).toHaveLength(1);
      expect(routes[0].path).toBe("/enabled");
    });

    it("should return empty array for modules without routes", () => {
      const module: AuthModule = {
        id: "no-routes",
        name: "No Routes",
        enabled: true,
      };

      registry.register(module);

      expect(registry.getRoutes()).toEqual([]);
    });
  });

  describe("unregister", () => {
    it("should remove a registered module", () => {
      const module: AuthModule = { id: "test", name: "Test", enabled: true };
      registry.register(module);

      registry.unregister("test");

      expect(registry.get("test")).toBeUndefined();
    });

    it("should not throw when unregistering non-existent module", () => {
      expect(() => registry.unregister("non-existent")).not.toThrow();
    });
  });

  describe("setEnabled", () => {
    it("should enable a disabled module", () => {
      const module: AuthModule = { id: "test", name: "Test", enabled: false };
      registry.register(module);

      registry.setEnabled("test", true);

      expect(registry.get("test")?.enabled).toBe(true);
    });

    it("should disable an enabled module", () => {
      const module: AuthModule = { id: "test", name: "Test", enabled: true };
      registry.register(module);

      registry.setEnabled("test", false);

      expect(registry.get("test")?.enabled).toBe(false);
    });

    it("should not throw when module does not exist", () => {
      expect(() => registry.setEnabled("non-existent", true)).not.toThrow();
    });
  });

  describe("clear", () => {
    it("should remove all modules", () => {
      registry.register({ id: "m1", name: "M1", enabled: true });
      registry.register({ id: "m2", name: "M2", enabled: true });

      registry.clear();

      expect(registry.getAll()).toEqual([]);
    });
  });
});

describe("MODULE_IDS", () => {
  it("should have CORE_AUTH constant", () => {
    expect(MODULE_IDS.CORE_AUTH).toBe("core-auth");
  });

  it("should have WORKSPACE constant", () => {
    expect(MODULE_IDS.WORKSPACE).toBe("workspace");
  });

  it("should have INVITE constant", () => {
    expect(MODULE_IDS.INVITE).toBe("invite");
  });

  it("should have PASSWORD_RESET constant", () => {
    expect(MODULE_IDS.PASSWORD_RESET).toBe("password-reset");
  });

  it("should have OAUTH_PROVIDERS constant", () => {
    expect(MODULE_IDS.OAUTH_PROVIDERS).toBe("oauth-providers");
  });

  it("should have SESSION_MANAGEMENT constant", () => {
    expect(MODULE_IDS.SESSION_MANAGEMENT).toBe("session-management");
  });

  it("should have SECURITY constant", () => {
    expect(MODULE_IDS.SECURITY).toBe("security");
  });
});

describe("moduleRegistry singleton", () => {
  it("should be an instance of ModuleRegistry", () => {
    expect(moduleRegistry).toBeInstanceOf(ModuleRegistry);
  });
});
