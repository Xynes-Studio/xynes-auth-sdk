"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import type { Workspace } from "../types";
import { useAuth } from "./AuthProvider";

/**
 * Workspace context value
 */
interface WorkspaceContextValue {
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  selectWorkspace: (workspaceId: string) => void;
  clearWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * Cookie/localStorage key for storing selected workspace
 */
const WORKSPACE_STORAGE_KEY = "xynes_workspace_id";

/**
 * WorkspaceProvider props
 */
export interface WorkspaceProviderProps {
  children: ReactNode;
}

/**
 * WorkspaceProvider - manages workspace selection state
 */
export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { workspaces, isLoading: authLoading } = useAuth();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load saved workspace ID on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedId = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (savedId) {
        setSelectedWorkspaceId(savedId);
      }
      setIsLoading(false);
    }
  }, []);

  // Auto-select workspace when workspaces change
  useEffect(() => {
    if (authLoading || isLoading) return;

    // If we have a selected workspace, verify it still exists
    if (selectedWorkspaceId) {
      const exists = workspaces.some((w) => w.id === selectedWorkspaceId);
      if (!exists && workspaces.length > 0) {
        // Selected workspace no longer exists, select the first one
        setSelectedWorkspaceId(workspaces[0].id);
        localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaces[0].id);
      }
    } else if (workspaces.length === 1) {
      // Auto-select if only one workspace
      setSelectedWorkspaceId(workspaces[0].id);
      localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaces[0].id);
    }
  }, [workspaces, authLoading, isLoading, selectedWorkspaceId]);

  const currentWorkspace = useMemo(() => {
    if (!selectedWorkspaceId) return null;
    return workspaces.find((w) => w.id === selectedWorkspaceId) ?? null;
  }, [workspaces, selectedWorkspaceId]);

  const selectWorkspace = useCallback((workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    if (typeof window !== "undefined") {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
    }
  }, []);

  const clearWorkspace = useCallback(() => {
    setSelectedWorkspaceId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      currentWorkspace,
      isLoading: isLoading || authLoading,
      selectWorkspace,
      clearWorkspace,
    }),
    [currentWorkspace, isLoading, authLoading, selectWorkspace, clearWorkspace]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * Hook to access workspace state
 */
export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }

  return context;
}
