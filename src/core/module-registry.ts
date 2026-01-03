/**
 * Module Registry
 *
 * @description Plugin-based architecture for auth features.
 * Enables dynamic route registration and feature toggling.
 *
 * @example
 * ```typescript
 * import { moduleRegistry, MODULE_IDS } from '@xynes/auth-sdk';
 *
 * // Register a custom module
 * moduleRegistry.register({
 *   id: 'custom-module',
 *   name: 'Custom Module',
 *   enabled: true,
 *   routes: [{ path: '/custom', layout: 'auth', guard: 'public' }],
 * });
 *
 * // Get all enabled routes
 * const routes = moduleRegistry.getRoutes();
 * ```
 */

import type { AuthFeatureFlags } from "./feature-flags";

/**
 * Layout types for route rendering
 */
export type LayoutType = "auth" | "app" | "minimal";

/**
 * Route guard types
 */
export type GuardType = "public" | "authenticated" | "unauthenticated";

/**
 * Route configuration for dynamic routing
 */
export interface RouteConfig {
  /** Route path (e.g., '/login', '/signup') */
  path: string;
  /** Layout wrapper to use */
  layout: LayoutType;
  /** Access guard type */
  guard: GuardType;
  /** Whether to preload the route component */
  preload?: boolean;
  /** Feature flag that controls route availability */
  featureFlag?: keyof AuthFeatureFlags;
}

/**
 * Auth module definition
 */
export interface AuthModule {
  /** Unique module identifier */
  id: string;
  /** Human-readable module name */
  name: string;
  /** Whether the module is enabled */
  enabled: boolean;
  /** Routes provided by this module */
  routes?: RouteConfig[];
  /** Provider components to wrap the app */
  providers?: string[];
  /** Hooks exported by this module */
  hooks?: Record<string, unknown>;
}

/**
 * Module IDs for built-in modules
 */
export const MODULE_IDS = {
  /** Core authentication (login, signup, logout) */
  CORE_AUTH: "core-auth",
  /** Workspace management */
  WORKSPACE: "workspace",
  /** Invite system */
  INVITE: "invite",
  /** Password reset flow */
  PASSWORD_RESET: "password-reset",
  /** OAuth provider support */
  OAUTH_PROVIDERS: "oauth-providers",
  /** Session management */
  SESSION_MANAGEMENT: "session-management",
  /** Security utilities */
  SECURITY: "security",
} as const;

export type ModuleId = (typeof MODULE_IDS)[keyof typeof MODULE_IDS];

/**
 * Module Registry for plugin-based auth architecture
 *
 * Manages registration and retrieval of auth modules,
 * enabling dynamic feature composition.
 */
export class ModuleRegistry {
  private modules: Map<string, AuthModule> = new Map();

  /**
   * Register a module
   *
   * @param module - The module to register
   *
   * @example
   * ```typescript
   * registry.register({
   *   id: 'my-module',
   *   name: 'My Module',
   *   enabled: true,
   * });
   * ```
   */
  register(module: AuthModule): void {
    this.modules.set(module.id, module);
  }

  /**
   * Get a module by ID
   *
   * @param id - Module identifier
   * @returns The module or undefined if not found
   */
  get(id: string): AuthModule | undefined {
    return this.modules.get(id);
  }

  /**
   * Get all registered modules
   *
   * @returns Array of all modules
   */
  getAll(): AuthModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get only enabled modules
   *
   * @returns Array of enabled modules
   */
  getEnabled(): AuthModule[] {
    return this.getAll().filter((m) => m.enabled);
  }

  /**
   * Get all routes from enabled modules
   *
   * @returns Flattened array of route configs from enabled modules
   */
  getRoutes(): RouteConfig[] {
    return this.getEnabled().flatMap((m) => m.routes ?? []);
  }

  /**
   * Unregister a module
   *
   * @param id - Module identifier to remove
   */
  unregister(id: string): void {
    this.modules.delete(id);
  }

  /**
   * Enable or disable a module
   *
   * @param id - Module identifier
   * @param enabled - Whether to enable or disable
   */
  setEnabled(id: string, enabled: boolean): void {
    const module = this.modules.get(id);
    if (module) {
      this.modules.set(id, { ...module, enabled });
    }
  }

  /**
   * Clear all modules from the registry
   */
  clear(): void {
    this.modules.clear();
  }
}

/**
 * Global module registry singleton
 *
 * Use this instance for registering and managing auth modules
 * across the application.
 */
export const moduleRegistry = new ModuleRegistry();
