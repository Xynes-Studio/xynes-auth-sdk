import type { FeatureFlagKey, FeatureFlags } from "../types/feature-flags";
import { DEFAULT_FEATURE_FLAGS } from "../types/feature-flags";

const FLAG_KEY_MAP: Record<string, FeatureFlagKey> = {
  enableOAuthGoogle: "xynes_auth_oauth_google",
  enableOAuthGitHub: "xynes_auth_oauth_github",
  enableOAuthGithub: "xynes_auth_oauth_github",
  enableOAuthApple: "xynes_auth_oauth_apple",
  enableEmailAuth: "xynes_auth_email_signup",
  enablePasswordReset: "xynes_auth_password_reset",
  enableMFA: "xynes_auth_mfa",
  enableRememberMe: "xynes_auth_remember_me",
  enableSessionManagement: "xynes_auth_session_management",
  enableRateLimitUI: "xynes_auth_rate_limit_ui",
  enableProfileEdit: "xynes_auth_profile_edit",
  enableWorkspaceCreation: "xynes_workspace_creation",
  enableWorkspaceSwitching: "xynes_workspace_switching",
  enableMultipleWorkspaces: "xynes_workspace_multiple",
  enableInvites: "xynes_invite_system",
  enableInviteRevocation: "xynes_invite_revocation",
  maintenanceMode: "xynes_maintenance_mode",
};

/**
 * Normalize feature flag keys and values into SDK format.
 *
 * - Accepts SDK keys (xynes_*) and gateway-style keys (enableOAuthGoogle, etc)
 * - Filters non-boolean values
 */
export function normalizeFeatureFlags(
  input: Partial<Record<string, unknown>> | null | undefined,
): Partial<FeatureFlags> {
  if (!input || typeof input !== "object") {
    return {};
  }

  const normalized: Partial<FeatureFlags> = {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "boolean") continue;

    if (key in DEFAULT_FEATURE_FLAGS) {
      normalized[key as FeatureFlagKey] = value;
      continue;
    }

    const mappedKey = FLAG_KEY_MAP[key];
    if (mappedKey) {
      normalized[mappedKey] = value;
    }
  }

  return normalized;
}
