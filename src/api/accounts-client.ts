import type {
  BootstrapResponse,
  Workspace,
  WorkspaceInvite,
  WorkspaceInviteAcceptResult,
  WorkspaceInviteCreateResult,
  WorkspaceRole,
} from "../types";
import { attachCsrfToken } from "./interceptors/csrf-interceptor";
import { handleRateLimitResponse } from "./interceptors/rate-limit-interceptor";

function unwrapGatewayEnvelope(value: unknown): unknown {
  // Some environments wrap responses in one or more `{ ok, data, meta }` envelopes.
  // We unwrap `data` recursively so SDK consumers receive the shape they expect.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = value;
  while (
    current &&
    typeof current === "object" &&
    "data" in current &&
    current.data !== undefined
  ) {
    current = current.data;
  }
  return current;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeWorkspaceRole(value: unknown): WorkspaceRole {
  if (
    value === "workspace_owner" ||
    value === "workspace_admin" ||
    value === "workspace_member"
  ) {
    return value;
  }
  return "workspace_member";
}

function normalizeWorkspace(value: unknown): Workspace | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = typeof record.id === "string" ? record.id : "";
  const name = typeof record.name === "string" ? record.name : "";
  const slug = typeof record.slug === "string" ? record.slug : "";
  if (!id || !name || !slug) return null;

  const planType =
    record.planType === "pro" || record.planType === "enterprise"
      ? record.planType
      : "free";

  return {
    id,
    name,
    slug,
    planType,
    role: normalizeWorkspaceRole(record.role),
    createdAt:
      typeof record.createdAt === "string" ? record.createdAt : undefined,
    updatedAt:
      typeof record.updatedAt === "string" ? record.updatedAt : undefined,
  };
}

function normalizeResolveInviteResponse(value: unknown): WorkspaceInvite {
  const record = asRecord(value);
  if (!record) {
    throw new Error("Invalid invite response shape");
  }

  const roleKey = normalizeWorkspaceRole(record.roleKey ?? record.role);
  const role = normalizeWorkspaceRole(record.role ?? record.roleKey);
  const status =
    record.status === "accepted" ||
    record.status === "expired" ||
    record.status === "cancelled"
      ? record.status
      : "pending";

  const expiresAt =
    typeof record.expiresAt === "string" && record.expiresAt.length > 0
      ? record.expiresAt
      : new Date(0).toISOString();

  const createdAt =
    typeof record.createdAt === "string" && record.createdAt.length > 0
      ? record.createdAt
      : new Date(0).toISOString();

  return {
    id: typeof record.id === "string" ? record.id : "",
    token: typeof record.token === "string" ? record.token : undefined,
    workspaceId:
      typeof record.workspaceId === "string" ? record.workspaceId : "",
    workspaceSlug:
      typeof record.workspaceSlug === "string" ? record.workspaceSlug : null,
    workspaceName:
      typeof record.workspaceName === "string" ? record.workspaceName : "",
    inviterName:
      typeof record.inviterName === "string" ? record.inviterName : null,
    inviterEmail:
      typeof record.inviterEmail === "string" ? record.inviterEmail : null,
    inviteeEmail:
      typeof record.inviteeEmail === "string" ? record.inviteeEmail : "",
    role,
    roleKey,
    status,
    expiresAt,
    createdAt,
  };
}

function normalizeAcceptInviteResponse(
  value: unknown,
): WorkspaceInviteAcceptResult {
  const record = asRecord(value);
  if (!record) {
    throw new Error("Invalid accept invite response shape");
  }

  // Backward compatibility: some backends returned a workspace object directly.
  const directWorkspace = normalizeWorkspace(record);
  if (directWorkspace) {
    return {
      accepted: true,
      workspaceId: directWorkspace.id,
      roleKey: normalizeWorkspaceRole(directWorkspace.role),
      workspaceMemberCreated: false,
      workspace: directWorkspace,
    };
  }

  const workspace = normalizeWorkspace(record.workspace);
  return {
    accepted: true,
    workspaceId:
      typeof record.workspaceId === "string"
        ? record.workspaceId
        : (workspace?.id ?? ""),
    roleKey: normalizeWorkspaceRole(record.roleKey ?? workspace?.role),
    workspaceMemberCreated: Boolean(record.workspaceMemberCreated),
    workspace,
  };
}

/**
 * Accounts API Client configuration
 */
export interface AccountsClientConfig {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
}

/**
 * API error response
 */
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

/**
 * Type-safe API client for the accounts service
 */
export class AccountsClient {
  private baseUrl: string;
  private getAccessToken: () => Promise<string | null>;

  constructor(config: AccountsClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.getAccessToken = config.getAccessToken;
  }

  /**
   * Makes an authenticated request to the API
   */
  private async request<T>(
    path: string,
    options: RequestInit = {},
    requestConfig?: { includeAuth?: boolean },
  ): Promise<T> {
    const includeAuth = requestConfig?.includeAuth !== false;
    const token = includeAuth ? await this.getAccessToken() : null;

    // BUG-AUTH-4 (2026-05-30): if auth is required but getAccessToken()
    // returned null (e.g. because AuthProvider.getAccessToken swallowed a
    // Supabase refresh-token error and returned null rather than throwing),
    // throw a recognizable "session missing" error now — BEFORE the fetch.
    // This lets callers such as useInvite.acceptInvite detect the session
    // issue via isRefreshTokenError() and attempt workspace-list recovery
    // instead of blindly forwarding an unauthenticated request that will 401
    // and be misidentified as an "unknown_error".
    if (includeAuth && !token) {
      throw {
        message: "Auth session missing",
        name: "AuthSessionMissingError",
      };
    }

    const normalizedHeaders = attachCsrfToken(options.headers || {});

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...normalizedHeaders,
    };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      handleRateLimitResponse(response);

      const error: ApiError = await response.json().catch(() => ({
        statusCode: response.status,
        message: response.statusText,
      }));
      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    const json = await response.json();
    return unwrapGatewayEnvelope(json) as T;
  }

  /**
   * Bootstrap user - gets user profile and workspaces
   * Called after successful authentication
   */
  async getMe(): Promise<BootstrapResponse> {
    return this.request<BootstrapResponse>("/me");
  }

  /**
   * Get user's workspaces
   */
  async getWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>("/workspaces");
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(data: {
    name: string;
    slug: string;
  }): Promise<Workspace> {
    return this.request<Workspace>("/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Create a workspace invite (RBAC protected).
   */
  async createWorkspaceInvite(
    workspaceId: string,
    data: {
      email: string;
      roleKey: WorkspaceRole;
    },
  ): Promise<WorkspaceInviteCreateResult> {
    const normalizedWorkspaceId = workspaceId.trim();
    const normalizedEmail = data.email.trim().toLowerCase();

    return this.request<WorkspaceInviteCreateResult>(
      `/workspaces/${encodeURIComponent(normalizedWorkspaceId)}/invites`,
      {
        method: "POST",
        body: JSON.stringify({
          email: normalizedEmail,
          roleKey: data.roleKey,
        }),
      },
    );
  }

  /**
   * Resolve an invite token (public - no auth required)
   */
  async resolveInvite(token: string): Promise<WorkspaceInvite> {
    const raw = await this.request<unknown>(
      `/workspace-invites/${encodeURIComponent(token)}`,
      { method: "GET" },
      { includeAuth: false },
    );
    return normalizeResolveInviteResponse(raw);
  }

  /**
   * Accept an invite
   */
  async acceptInvite(token: string): Promise<WorkspaceInviteAcceptResult> {
    const raw = await this.request<unknown>(
      `/workspace-invites/${encodeURIComponent(token)}/accept`,
      {
        method: "POST",
      },
    );
    return normalizeAcceptInviteResponse(raw);
  }
}

/**
 * Factory function to create an AccountsClient instance
 */
export function createAccountsClient(
  config: AccountsClientConfig,
): AccountsClient {
  return new AccountsClient(config);
}
