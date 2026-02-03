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
});

