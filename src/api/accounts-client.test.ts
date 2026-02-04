import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { AccountsClient } from "./accounts-client";

describe("AccountsClient", () => {
  const getAccessToken = vi.fn<[], Promise<string | null>>();
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getAccessToken.mockResolvedValue("test-token");
    vi.stubGlobal("fetch", fetchMock);
    document.head.innerHTML =
      '<meta name="csrf-token" content="test-csrf-token" />';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("unwraps gateway envelopes for /me responses", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: {
          ok: true,
          data: {
            user: { id: "u1", email: "a@b.com" },
            workspaces: [{ id: "w1", slug: "acme" }],
          },
          meta: { requestId: "req_1" },
        },
        meta: { requestId: "req_1" },
      }),
    });

    const client = new AccountsClient({
      baseUrl: "http://localhost:4100",
      getAccessToken,
    });

    const result = await client.getMe();
    expect(result).toEqual({
      user: { id: "u1", email: "a@b.com" },
      workspaces: [{ id: "w1", slug: "acme" }],
    });
  });

  it("returns plain /me responses as-is", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: "u1", email: "a@b.com" },
        workspaces: [],
      }),
    });

    const client = new AccountsClient({
      baseUrl: "http://localhost:4100/",
      getAccessToken,
    });

    const result = await client.getMe();
    expect(result.workspaces).toEqual([]);
    expect(result.user.email).toBe("a@b.com");
  });

  it("attaches Authorization and CSRF headers", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: "u1" }, workspaces: [] }),
    });

    const client = new AccountsClient({
      baseUrl: "http://localhost:4100",
      getAccessToken,
    });

    await client.getMe();

    const [, init] = fetchMock.mock.calls[0];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-token");
    expect(headers["x-csrf-token"]).toBe("test-csrf-token");
  });

  it("creates workspace invites via POST /workspaces/{workspaceId}/invites", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        ok: true,
        data: {
          id: "inv_1",
          workspaceId: "ws_1",
          email: "colleague@example.com",
          roleKey: "workspace_member",
          status: "pending",
          expiresAt: "2026-02-10T12:00:00.000Z",
          token: "xyn_inv_testtoken",
        },
      }),
    });

    const client = new AccountsClient({
      baseUrl: "http://localhost:4100",
      getAccessToken,
    });

    const result = await client.createWorkspaceInvite("ws_1", {
      email: "colleague@example.com",
      roleKey: "workspace_member",
    });

    expect(result.token).toBe("xyn_inv_testtoken");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:4100/workspaces/ws_1/invites");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(
      JSON.stringify({
        email: "colleague@example.com",
        roleKey: "workspace_member",
      }),
    );

    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-token");
    expect(headers["x-csrf-token"]).toBe("test-csrf-token");
  });
});
