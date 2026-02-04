import type {
  BootstrapResponse,
  Workspace,
  WorkspaceInvite,
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
  ): Promise<T> {
    const token = await this.getAccessToken();

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
    // This is a public endpoint - don't send auth header
    const response = await fetch(`${this.baseUrl}/workspace-invites/${token}`);

    if (!response.ok) {
      handleRateLimitResponse(response);

      const error: ApiError = await response.json().catch(() => ({
        statusCode: response.status,
        message: response.statusText,
      }));
      throw error;
    }

    return response.json();
  }

  /**
   * Accept an invite
   */
  async acceptInvite(token: string): Promise<Workspace> {
    return this.request<Workspace>(`/workspace-invites/${token}/accept`, {
      method: "POST",
    });
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
