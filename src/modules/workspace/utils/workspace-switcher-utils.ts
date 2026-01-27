/**
 * Pure utility functions for WorkspaceSwitcher component
 * 
 * These functions are extracted for easy unit testing (Tier 1 - 100% coverage target)
 * Following ADR-001 testing standards.
 */

import type { Workspace } from "../../../types";

/**
 * Get the initials for a workspace name
 * Used for avatar fallback display
 * 
 * @param name - The workspace name
 * @returns Up to 2 uppercase characters representing initials
 * 
 * @example
 * getWorkspaceInitials("Acme Corporation") // "AC"
 * getWorkspaceInitials("my-project") // "M"
 * getWorkspaceInitials("") // ""
 */
export function getWorkspaceInitials(name: string): string {
  if (!name.trim()) {
    return "";
  }

  const words = name.trim().split(/\s+/);
  
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  
  // Single word - return first character only
  return words[0][0].toUpperCase();
}

/**
 * Format workspace role for display
 * Converts internal role identifiers to human-readable labels
 * 
 * @param role - The workspace role
 * @returns Human-readable role label
 */
export function formatWorkspaceRole(role: Workspace["role"]): string {
  const roleLabels: Record<Workspace["role"], string> = {
    workspace_owner: "Owner",
    workspace_admin: "Admin",
    workspace_member: "Member",
  };
  
  return roleLabels[role] ?? "Member";
}

/**
 * Sort workspaces for display in the switcher
 * Priority: Current workspace first, then by name alphabetically
 * 
 * @param workspaces - Array of workspaces to sort
 * @param currentWorkspaceId - ID of the currently selected workspace
 * @returns Sorted array with current workspace first
 */
export function sortWorkspacesForSwitcher(
  workspaces: Workspace[],
  currentWorkspaceId: string | null
): Workspace[] {
  if (!currentWorkspaceId) {
    return [...workspaces].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Separate current and other workspaces
  const current = workspaces.find((w) => w.id === currentWorkspaceId);
  const others = workspaces
    .filter((w) => w.id !== currentWorkspaceId)
    .sort((a, b) => a.name.localeCompare(b.name));

  return current ? [current, ...others] : others;
}

/**
 * Filter workspaces excluding the current one for the "switch to" list
 * 
 * @param workspaces - Array of all workspaces
 * @param currentWorkspaceId - ID of the currently selected workspace
 * @returns Workspaces excluding the current one
 */
export function getOtherWorkspaces(
  workspaces: Workspace[],
  currentWorkspaceId: string | null
): Workspace[] {
  if (!currentWorkspaceId) {
    return workspaces;
  }
  
  return workspaces.filter((w) => w.id !== currentWorkspaceId);
}

/**
 * Sanitize workspace slug for use in URLs
 * Defense in depth - ensures slug is safe even if backend validation fails
 * 
 * @param slug - The workspace slug
 * @returns Sanitized slug safe for URL use
 */
export function sanitizeWorkspaceSlug(slug: string): string {
  // Only allow lowercase letters, numbers, and hyphens
  return slug.replace(/[^a-z0-9-]/g, "");
}

/**
 * Build the workspace dashboard URL
 * 
 * @param slug - The workspace slug
 * @param consoleUrl - Optional console base URL (from environment)
 * @returns The full URL to the workspace dashboard
 */
export function buildWorkspaceDashboardUrl(
  slug: string,
  consoleUrl?: string
): string {
  const safeSlug = sanitizeWorkspaceSlug(slug);
  
  if (consoleUrl) {
    // Ensure no double slashes
    const baseUrl = consoleUrl.replace(/\/$/, "");
    return `${baseUrl}/${safeSlug}`;
  }
  
  // Fallback to local route for testing
  return `/dashboard/${safeSlug}`;
}

/**
 * Get aria-label for the workspace switcher trigger
 * Provides accessible description for screen readers
 * 
 * @param currentWorkspaceName - Name of the current workspace (or null)
 * @param workspaceCount - Total number of workspaces available
 * @returns Accessible label string
 */
export function getWorkspaceSwitcherAriaLabel(
  currentWorkspaceName: string | null,
  workspaceCount: number
): string {
  if (!currentWorkspaceName) {
    return "Select workspace";
  }
  
  const otherCount = workspaceCount - 1;
  if (otherCount === 0) {
    return `Current workspace: ${currentWorkspaceName}`;
  }
  
  if (otherCount === 1) {
    return `Current workspace: ${currentWorkspaceName}. 1 other workspace available.`;
  }
  
  return `Current workspace: ${currentWorkspaceName}. ${otherCount} other workspaces available.`;
}
