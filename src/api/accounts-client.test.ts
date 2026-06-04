import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { AccountsClient, AuthSessionMissingError } from "./accounts-client";

describe("AccountsClient", () => {
  const getAccessToken = vi.fn<() => Promise<string | null>>();
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

  it("resolves invite via envelope payload and normalizes role from roleKey", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        data: {
          id: "invite-1",
          workspaceId: "ws_1",
          workspaceSlug: "acme",
          workspaceName: "Acme",
          inviterName: "Owner",
          inviterEmail: "owner@acme.com",
          inviteeEmail: "invitee@acme.com",
          roleKey: "workspace_member",
          status: "pending",
          expiresAt: "2026-02-10T12:00:00.000Z",
          createdAt: "2026-02-01T12:00:00.000Z",
        },
      }),
    });

    const client = new AccountsClient({
      baseUrl: "http://localhost:4100",
      getAccessToken,
    });

    const result = await client.resolveInvite("invite-token");
    expect(result.workspaceId).toBe("ws_1");
    expect(result.roleKey).toBe("workspace_member");
    expect(result.role).toBe("workspace_member");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:4100/workspace-invites/invite-token");
    expect(init.method).toBe("GET");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("accepts invite and normalizes extended response with workspace", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        ok: true,
        data: {
          accepted: true,
          workspaceId: "ws_1",
          roleKey: "workspace_member",
          workspaceMemberCreated: true,
          workspace: {
            id: "ws_1",
            name: "Acme",
            slug: "acme",
            planType: "free",
            role: "workspace_member",
          },
        },
      }),
    });

    const client = new AccountsClient({
      baseUrl: "http://localhost:4100",
      getAccessToken,
    });

    const result = await client.acceptInvite("invite-token");
    expect(result.accepted).toBe(true);
    expect(result.workspaceId).toBe("ws_1");
    expect(result.workspace?.slug).toBe("acme");
    expect(result.workspace?.role).toBe("workspace_member");
  });

  describe("MAIL-6 — resendWorkspaceInvite", () => {
    it("calls POST /workspaces/{wsId}/invites/{inviteId}/resend and normalizes the response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            inviteId: "inv_1",
            emailAttempts: 2,
            emailSentAt: "2026-06-03T12:00:00.000Z",
            lastEmailErrorCode: null,
          },
        }),
      });

      const client = new AccountsClient({
        baseUrl: "http://localhost:4100",
        getAccessToken,
      });

      const result = await client.resendWorkspaceInvite("ws_1", "inv_1");

      expect(result).toEqual({
        inviteId: "inv_1",
        emailAttempts: 2,
        emailSentAt: "2026-06-03T12:00:00.000Z",
        lastEmailErrorCode: null,
      });

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
        "http://localhost:4100/workspaces/ws_1/invites/inv_1/resend",
      );
      expect(init.method).toBe("POST");
      expect(init.body).toBe(JSON.stringify({ inviteId: "inv_1" }));

      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer test-token");
      expect(headers["x-csrf-token"]).toBe("test-csrf-token");
    });

    it("encodes path segments to prevent URL injection", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            inviteId: "inv with space",
            emailAttempts: 1,
            emailSentAt: null,
            lastEmailErrorCode: null,
          },
        }),
      });

      const client = new AccountsClient({
        baseUrl: "http://localhost:4100",
        getAccessToken,
      });

      await client.resendWorkspaceInvite("ws/1", "inv with space");

      const [url] = fetchMock.mock.calls[0];
      // workspaceId and inviteId are encoded — '/' and space survive as %2F / %20.
      expect(url).toBe(
        "http://localhost:4100/workspaces/ws%2F1/invites/inv%20with%20space/resend",
      );
    });

    it("returns a documented-keys-only result when the upstream payload is malformed", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          // Hostile / malformed payload — string emailAttempts, leaked rawToken.
          data: {
            inviteId: "inv_1",
            emailAttempts: "not-a-number",
            emailSentAt: "",
            lastEmailErrorCode: 12345,
            rawToken: "xyn_inv_LEAK_DO_NOT_RETURN_TO_UI",
            keyHash: "$argon2id$leak",
          },
        }),
      });

      const client = new AccountsClient({
        baseUrl: "http://localhost:4100",
        getAccessToken,
      });

      const result = await client.resendWorkspaceInvite("ws_1", "inv_1");

      // Only documented keys survive.
      expect(Object.keys(result).sort()).toEqual([
        "emailAttempts",
        "emailSentAt",
        "inviteId",
        "lastEmailErrorCode",
      ]);
      expect(result.emailAttempts).toBe(0);
      expect(result.emailSentAt).toBeNull();
      expect(result.lastEmailErrorCode).toBeNull();
      // Hostile field absolutely must not bleed through.
      expect(
        (result as unknown as Record<string, unknown>).rawToken,
      ).toBeUndefined();
      expect(JSON.stringify(result)).not.toContain("LEAK");
    });

    it("falls back to the caller-provided inviteId when the upstream omits it", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, data: {} }),
      });

      const client = new AccountsClient({
        baseUrl: "http://localhost:4100",
        getAccessToken,
      });

      const result = await client.resendWorkspaceInvite("ws_1", "inv_fallback");
      expect(result.inviteId).toBe("inv_fallback");
      expect(result.emailAttempts).toBe(0);
      expect(result.emailSentAt).toBeNull();
      expect(result.lastEmailErrorCode).toBeNull();
    });

    it("forwards closed-set error envelopes from the gateway (RATE_LIMITED)", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        headers: {
          get: (name: string) =>
            name.toLowerCase() === "retry-after" ? null : null,
        },
        json: async () => ({
          ok: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many resend attempts for this invite",
          },
        }),
      });

      const client = new AccountsClient({
        baseUrl: "http://localhost:4100",
        getAccessToken,
      });

      let thrown: unknown;
      try {
        await client.resendWorkspaceInvite("ws_1", "inv_1");
      } catch (error) {
        thrown = error;
      }

      // ApiError envelope shape — the consumer can read .error.code.
      expect(thrown).toMatchObject({
        ok: false,
        error: { code: "RATE_LIMITED" },
      });
    });

    it("throws AuthSessionMissingError when the access token is null", async () => {
      getAccessToken.mockResolvedValue(null);

      const client = new AccountsClient({
        baseUrl: "http://localhost:4100",
        getAccessToken,
      });

      let thrown: unknown;
      try {
        await client.resendWorkspaceInvite("ws_1", "inv_1");
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(AuthSessionMissingError);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("trims workspaceId and inviteId before encoding", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            inviteId: "inv_1",
            emailAttempts: 1,
            emailSentAt: null,
            lastEmailErrorCode: null,
          },
        }),
      });

      const client = new AccountsClient({
        baseUrl: "http://localhost:4100",
        getAccessToken,
      });

      await client.resendWorkspaceInvite("  ws_1  ", "  inv_1  ");

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
        "http://localhost:4100/workspaces/ws_1/invites/inv_1/resend",
      );
      // The body carries the trimmed inviteId — the handler reads `payload.inviteId`.
      expect(init.body).toBe(JSON.stringify({ inviteId: "inv_1" }));
    });
  });

  describe("BUG-AUTH-4 — null-token throws AuthSessionMissingError for auth-required calls", () => {
    it("throws an isRefreshTokenError-compatible error when getAccessToken returns null", async () => {
      getAccessToken.mockResolvedValue(null);

      const client = new AccountsClient({
        baseUrl: "http://localhost:4100",
        getAccessToken,
      });

      let thrown: unknown;
      try {
        await client.acceptInvite("invite-token");
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(AuthSessionMissingError);
      expect(thrown).toMatchObject({
        name: "AuthSessionMissingError",
        message: "Auth session missing",
        code: "session_not_found",
      });
      // fetch must NOT have been called — we fail before the network hop.
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("does NOT throw before the fetch for auth-not-required calls (resolveInvite)", async () => {
      getAccessToken.mockResolvedValue(null);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            id: "inv1",
            workspaceId: "ws1",
            workspaceSlug: "acme",
            workspaceName: "Acme",
            inviterName: null,
            inviterEmail: null,
            inviteeEmail: "a@b.com",
            roleKey: "workspace_member",
            status: "pending",
            expiresAt: "2026-12-31T00:00:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        }),
      });

      const client = new AccountsClient({
        baseUrl: "http://localhost:4100",
        getAccessToken,
      });

      // resolveInvite uses { includeAuth: false } — should reach the fetch.
      const result = await client.resolveInvite("invite-token");
      expect(result.workspaceId).toBe("ws1");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
