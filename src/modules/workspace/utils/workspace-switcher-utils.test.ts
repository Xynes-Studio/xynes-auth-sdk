/**
 * Unit tests for workspace-switcher-utils.ts
 * 
 * Tier 1 tests: Pure functions - 100% coverage target
 * Following ADR-001 testing standards.
 */

import { describe, it, expect } from "vitest";
import {
  getWorkspaceInitials,
  formatWorkspaceRole,
  sortWorkspacesForSwitcher,
  getOtherWorkspaces,
  sanitizeWorkspaceSlug,
  buildWorkspaceDashboardUrl,
  getWorkspaceSwitcherAriaLabel,
} from "./workspace-switcher-utils";
import type { Workspace } from "../../../types";

// Factory function for creating test workspaces
function createWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "ws-1",
    name: "Test Workspace",
    slug: "test-workspace",
    planType: "free",
    role: "workspace_member",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("getWorkspaceInitials", () => {
  it("should return two initials for multi-word names", () => {
    expect(getWorkspaceInitials("Acme Corporation")).toBe("AC");
    expect(getWorkspaceInitials("My Awesome Project")).toBe("MA");
  });

  it("should return single initial for single-word names", () => {
    expect(getWorkspaceInitials("Workspace")).toBe("W");
    expect(getWorkspaceInitials("acme")).toBe("A");
  });

  it("should handle empty strings", () => {
    expect(getWorkspaceInitials("")).toBe("");
    expect(getWorkspaceInitials("   ")).toBe("");
  });

  it("should handle names with extra whitespace", () => {
    expect(getWorkspaceInitials("  Acme   Corp  ")).toBe("AC");
  });

  it("should return uppercase initials", () => {
    expect(getWorkspaceInitials("lowercase name")).toBe("LN");
    expect(getWorkspaceInitials("UPPERCASE NAME")).toBe("UN");
  });

  it("should handle names with special characters", () => {
    expect(getWorkspaceInitials("My-Project")).toBe("M");
    expect(getWorkspaceInitials("Test_Workspace")).toBe("T");
  });
});

describe("formatWorkspaceRole", () => {
  it("should format owner role", () => {
    expect(formatWorkspaceRole("workspace_owner")).toBe("Owner");
  });

  it("should format admin role", () => {
    expect(formatWorkspaceRole("workspace_admin")).toBe("Admin");
  });

  it("should format member role", () => {
    expect(formatWorkspaceRole("workspace_member")).toBe("Member");
  });
});

describe("sortWorkspacesForSwitcher", () => {
  const workspaces: Workspace[] = [
    createWorkspace({ id: "ws-1", name: "Zebra Corp" }),
    createWorkspace({ id: "ws-2", name: "Acme Inc" }),
    createWorkspace({ id: "ws-3", name: "Beta Labs" }),
  ];

  it("should sort alphabetically when no current workspace", () => {
    const sorted = sortWorkspacesForSwitcher(workspaces, null);
    expect(sorted.map((w) => w.name)).toEqual([
      "Acme Inc",
      "Beta Labs",
      "Zebra Corp",
    ]);
  });

  it("should put current workspace first", () => {
    const sorted = sortWorkspacesForSwitcher(workspaces, "ws-3");
    expect(sorted[0].id).toBe("ws-3");
    expect(sorted[0].name).toBe("Beta Labs");
  });

  it("should keep other workspaces sorted alphabetically after current", () => {
    const sorted = sortWorkspacesForSwitcher(workspaces, "ws-3");
    expect(sorted.map((w) => w.name)).toEqual([
      "Beta Labs", // current first
      "Acme Inc",
      "Zebra Corp",
    ]);
  });

  it("should handle empty array", () => {
    const sorted = sortWorkspacesForSwitcher([], null);
    expect(sorted).toEqual([]);
  });

  it("should handle non-existent current workspace ID", () => {
    const sorted = sortWorkspacesForSwitcher(workspaces, "non-existent");
    expect(sorted.map((w) => w.name)).toEqual([
      "Acme Inc",
      "Beta Labs",
      "Zebra Corp",
    ]);
  });
});

describe("getOtherWorkspaces", () => {
  const workspaces: Workspace[] = [
    createWorkspace({ id: "ws-1", name: "Workspace 1" }),
    createWorkspace({ id: "ws-2", name: "Workspace 2" }),
    createWorkspace({ id: "ws-3", name: "Workspace 3" }),
  ];

  it("should return all workspaces when no current", () => {
    const others = getOtherWorkspaces(workspaces, null);
    expect(others).toHaveLength(3);
  });

  it("should exclude current workspace", () => {
    const others = getOtherWorkspaces(workspaces, "ws-2");
    expect(others).toHaveLength(2);
    expect(others.find((w) => w.id === "ws-2")).toBeUndefined();
  });

  it("should handle empty array", () => {
    const others = getOtherWorkspaces([], "ws-1");
    expect(others).toEqual([]);
  });

  it("should return all when current ID not found", () => {
    const others = getOtherWorkspaces(workspaces, "non-existent");
    expect(others).toHaveLength(3);
  });
});

describe("sanitizeWorkspaceSlug", () => {
  it("should allow valid slug characters", () => {
    expect(sanitizeWorkspaceSlug("my-workspace-123")).toBe("my-workspace-123");
  });

  it("should remove uppercase letters", () => {
    expect(sanitizeWorkspaceSlug("MyWorkspace")).toBe("yorkspace");
  });

  it("should remove special characters", () => {
    expect(sanitizeWorkspaceSlug("my_workspace!@#")).toBe("myworkspace");
  });

  it("should remove spaces", () => {
    expect(sanitizeWorkspaceSlug("my workspace")).toBe("myworkspace");
  });

  it("should handle empty string", () => {
    expect(sanitizeWorkspaceSlug("")).toBe("");
  });

  it("should preserve hyphens", () => {
    expect(sanitizeWorkspaceSlug("my--double--hyphen")).toBe(
      "my--double--hyphen"
    );
  });
});

describe("buildWorkspaceDashboardUrl", () => {
  it("should build URL with console URL", () => {
    const url = buildWorkspaceDashboardUrl(
      "my-workspace",
      "https://console.xynes.com"
    );
    expect(url).toBe("https://console.xynes.com/my-workspace");
  });

  it("should handle trailing slash in console URL", () => {
    const url = buildWorkspaceDashboardUrl(
      "my-workspace",
      "https://console.xynes.com/"
    );
    expect(url).toBe("https://console.xynes.com/my-workspace");
  });

  it("should fall back to local route when no console URL", () => {
    const url = buildWorkspaceDashboardUrl("my-workspace");
    expect(url).toBe("/dashboard/my-workspace");
  });

  it("should fall back to local route for empty console URL", () => {
    const url = buildWorkspaceDashboardUrl("my-workspace", "");
    expect(url).toBe("/dashboard/my-workspace");
  });

  it("should sanitize the slug", () => {
    const url = buildWorkspaceDashboardUrl("My Workspace!", "https://console.xynes.com");
    expect(url).toBe("https://console.xynes.com/yorkspace");
  });
});

describe("getWorkspaceSwitcherAriaLabel", () => {
  it("should return select workspace when no current", () => {
    expect(getWorkspaceSwitcherAriaLabel(null, 0)).toBe("Select workspace");
    expect(getWorkspaceSwitcherAriaLabel(null, 5)).toBe("Select workspace");
  });

  it("should show current workspace name when only one workspace", () => {
    expect(getWorkspaceSwitcherAriaLabel("My Workspace", 1)).toBe(
      "Current workspace: My Workspace"
    );
  });

  it("should show singular 'workspace' for one other", () => {
    expect(getWorkspaceSwitcherAriaLabel("My Workspace", 2)).toBe(
      "Current workspace: My Workspace. 1 other workspace available."
    );
  });

  it("should show plural 'workspaces' for multiple others", () => {
    expect(getWorkspaceSwitcherAriaLabel("My Workspace", 5)).toBe(
      "Current workspace: My Workspace. 4 other workspaces available."
    );
  });
});
