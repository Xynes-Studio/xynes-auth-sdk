/**
 * Core Module
 *
 * @description Core utilities for the auth SDK including
 * module registry, feature flags, and configuration.
 */

// Module Registry
export {
  ModuleRegistry,
  moduleRegistry,
  MODULE_IDS,
  type AuthModule,
  type RouteConfig,
  type LayoutType,
  type GuardType,
  type ModuleId,
} from "./module-registry";

// Feature Flags
export {
  DEFAULT_FLAGS,
  createFeatureFlags,
  isFeatureEnabled,
  mergeFeatureFlags,
  type AuthFeatureFlags,
} from "./feature-flags";

// Configuration
export {
  createAuthConfig,
  validateAuthConfig,
  type AuthSDKConfig,
  type AuthSDKConfigInput,
  type SupabaseConfig,
  type ApiConfig,
  type AuthAppConfig,
  type ModuleOverride,
  type ValidationResult,
} from "./config";
