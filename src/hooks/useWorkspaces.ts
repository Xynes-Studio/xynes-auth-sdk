"use client";

import { useAuth } from "../providers/AuthProvider";
import type { Workspace } from "../types";

/**
 * Return type for useWorkspaces hook
 */
export interface UseWorkspacesResult {
  workspaces: Workspace[];
  isLoading: boolean;
  hasWorkspaces: boolean;
  hasSingleWorkspace: boolean;
  hasMultipleWorkspaces: boolean;
}

/**
 * Convenience hook for working with workspaces list
 */
export function useWorkspaces(): UseWorkspacesResult {
  const { workspaces, isLoading } = useAuth();

  return {
    workspaces,
    isLoading,
    hasWorkspaces: workspaces.length > 0,
    hasSingleWorkspace: workspaces.length === 1,
    hasMultipleWorkspaces: workspaces.length > 1,
  };
}
