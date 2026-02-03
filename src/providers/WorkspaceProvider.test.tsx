/**
 * WorkspaceProvider Tests
 *
 * @description Tier 2 integration tests for workspace selection behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WorkspaceProvider, useWorkspace } from "./WorkspaceProvider";

// Mock useAuth to control workspaces and auth loading state
const mockUseAuth = vi.fn();
vi.mock("./AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

function Consumer() {
  const { currentWorkspace, isLoading, selectWorkspace, clearWorkspace } =
    useWorkspace();

  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="current">
        {currentWorkspace ? currentWorkspace.id : "none"}
      </div>
      <button onClick={() => selectWorkspace("ws-2")}>Select ws-2</button>
      <button onClick={clearWorkspace}>Clear</button>
    </div>
  );
}

describe("WorkspaceProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("auto-selects the only workspace when exactly one exists", async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      workspaces: [{ id: "ws-1" }],
    });

    render(
      <WorkspaceProvider>
        <Consumer />
      </WorkspaceProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    await waitFor(() => {
      expect(screen.getByTestId("current")).toHaveTextContent("ws-1");
    });

    expect(localStorage.getItem("xynes_workspace_id")).toBe("ws-1");
  });

  it("uses saved workspace id when present and still exists", async () => {
    localStorage.setItem("xynes_workspace_id", "ws-2");
    mockUseAuth.mockReturnValue({
      isLoading: false,
      workspaces: [{ id: "ws-1" }, { id: "ws-2" }],
    });

    render(
      <WorkspaceProvider>
        <Consumer />
      </WorkspaceProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("current")).toHaveTextContent("ws-2");
    });
  });

  it("falls back to first workspace when saved id no longer exists", async () => {
    localStorage.setItem("xynes_workspace_id", "ws-missing");
    mockUseAuth.mockReturnValue({
      isLoading: false,
      workspaces: [{ id: "ws-1" }, { id: "ws-2" }],
    });

    render(
      <WorkspaceProvider>
        <Consumer />
      </WorkspaceProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("current")).toHaveTextContent("ws-1");
    });

    expect(localStorage.getItem("xynes_workspace_id")).toBe("ws-1");
  });

  it("allows selecting and clearing workspace", async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      workspaces: [{ id: "ws-1" }, { id: "ws-2" }],
    });

    const user = userEvent.setup();
    render(
      <WorkspaceProvider>
        <Consumer />
      </WorkspaceProvider>
    );

    await user.click(screen.getByText("Select ws-2"));

    await waitFor(() => {
      expect(screen.getByTestId("current")).toHaveTextContent("ws-2");
    });
    expect(localStorage.getItem("xynes_workspace_id")).toBe("ws-2");

    await user.click(screen.getByText("Clear"));
    await waitFor(() => {
      expect(screen.getByTestId("current")).toHaveTextContent("none");
    });
    expect(localStorage.getItem("xynes_workspace_id")).toBeNull();
  });
});

