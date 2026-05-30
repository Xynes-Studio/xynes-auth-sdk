# @xynes/auth-sdk

Authentication SDK for Xynes applications. Provides React hooks, providers, and utilities for Supabase auth integration with a modular, plugin-based architecture.

## Features

- 🔐 **Supabase Auth Integration** - Email/password and OAuth authentication
- 🏢 **Workspace Management** - Multi-workspace support with role-based access
- 🔌 **Plugin Architecture** - Module registry for extending functionality
- 🎛️ **Feature Flags** - Runtime configuration for enabling/disabling features
- 🛡️ **Security Utilities** - Redirect validation, error normalization
- 📦 **Tree-shakeable** - ESM/CJS dual build with TypeScript support

## Installation

```bash
npm install @xynes/auth-sdk
# or
pnpm add @xynes/auth-sdk
```

## Quick Start

### 1. Create SDK Configuration

```tsx
// lib/auth-config.ts
import { createAuthConfig } from '@xynes/auth-sdk';

export const authConfig = createAuthConfig({
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  },
  auth: {
    appUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL!,
    cookieDomain: '.xynes.com',
  },
  features: {
    enableOAuthGoogle: true,
    enableOAuthGitHub: true,
    enableMFA: false, // Phase 2
  },
});
```

### 2. Configure the AuthProvider

```tsx
// app/providers.tsx
import { AuthProvider, WorkspaceProvider } from '@xynes/auth-sdk';
import { authConfig } from '@/lib/auth-config';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider config={authConfig}>
      <WorkspaceProvider>
        {children}
      </WorkspaceProvider>
    </AuthProvider>
  );
}
```

### 3. Use the useAuth hook

```tsx
'use client';
import { useAuth } from '@xynes/auth-sdk';

export function UserMenu() {
  const { user, isAuthenticated, signOut, redirectToLogin } = useAuth();

  if (!isAuthenticated) {
    return <button onClick={() => redirectToLogin()}>Sign In</button>;
  }

  return (
    <div>
      <span>Welcome, {user?.displayName}</span>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### 4. Protect routes with AuthGuard

```tsx
import { AuthGuard } from '@xynes/auth-sdk';

export default function DashboardLayout({ children }) {
  // AuthGuard redirects unauthenticated visitors to the configured auth-app
  // login URL by default (since FE-AUTH-BUG-002), with a safe `?redirect=`
  // back to the original page. No callback wiring required.
  return <AuthGuard>{children}</AuthGuard>;
}
```

**Opt-out paths:**

```tsx
// 1. Render children even when unauthenticated.
<AuthGuard optional>{children}</AuthGuard>

// 2. Legacy callback mode (does nothing without onUnauthenticated; renders
//    the loading component otherwise).
<AuthGuard unauthenticatedMode="callback">{children}</AuthGuard>

// 3. Provide a custom callback (always wins over the default redirect).
<AuthGuard onUnauthenticated={() => router.replace("/landing")}>
  {children}
</AuthGuard>

// 4. Override the post-login return URL (still flows through the
//    allowlist that `useAuth().redirectToLogin()` enforces).
<AuthGuard returnUrl="https://app.example.com/dashboard/integrations">
  {children}
</AuthGuard>
```

## Core Architecture

### Module Registry

The SDK uses a plugin-based architecture for extensibility:

```tsx
import { moduleRegistry, MODULE_IDS } from '@xynes/auth-sdk';

// Register a custom module
moduleRegistry.register({
  id: 'custom-analytics',
  name: 'Custom Analytics',
  enabled: true,
  routes: [
    { path: '/analytics', layout: 'app', guard: 'authenticated' },
  ],
});

// Get all enabled routes
const routes = moduleRegistry.getRoutes();

// Enable/disable modules at runtime
moduleRegistry.setEnabled(MODULE_IDS.INVITE, false);
```

**Built-in Module IDs:**
- `core-auth` - Login, signup, logout
- `workspace` - Workspace management
- `invite` - Invite system
- `password-reset` - Password reset flow
- `oauth-providers` - OAuth support
- `session-management` - Session management
- `security` - Security utilities

### Feature Flags

The SDK supports two feature flag systems:

#### 1. Static Feature Flags (Config-based)

Use static flags from configuration:

```tsx
import { 
  createFeatureFlags, 
  isFeatureEnabled, 
  DEFAULT_FLAGS 
} from '@xynes/auth-sdk';

// Create custom flags
const flags = createFeatureFlags({
  enableMFA: true,
  enableOAuthApple: true,
});

// Check if feature is enabled
if (isFeatureEnabled(flags, 'enableMFA')) {
  // Show MFA setup UI
}
```

#### 2. Dynamic Feature Flags (Backend-driven)

Use the `FeatureFlagsProvider` to fetch flags from your backend API at runtime:

```tsx
// app/providers.tsx
import { FeatureFlagsProvider } from '@xynes/auth-sdk';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FeatureFlagsProvider
      apiBaseUrl={process.env.NEXT_PUBLIC_API_URL}
      pollingInterval={60000} // Optional: poll every 60s
    >
      {children}
    </FeatureFlagsProvider>
  );
}
```

**Using Feature Flag Hooks:**

```tsx
import { 
  useFeatureFlags, 
  useFeatureFlag, 
  useOAuthProviders, 
  useMaintenanceMode 
} from '@xynes/auth-sdk';

// Get all flags
const { flags, isLoading, error, refetch } = useFeatureFlags();

// Get a single flag
const mfaEnabled = useFeatureFlag('xynes_auth_mfa');

// Get OAuth providers configuration
const oauthProviders = useOAuthProviders();
// Returns: { google: boolean, github: boolean, apple: boolean }

// Check maintenance mode
const isMaintenanceMode = useMaintenanceMode();
```

**Provider Props:**

| Prop | Type | Description |
|------|------|-------------|
| `apiBaseUrl` | `string` | Base URL for the `/flags` endpoint |
| `initialFlags` | `FeatureFlags` | Optional initial flag values |
| `pollingInterval` | `number` | Optional polling interval in ms (0 to disable) |
| `authToken` | `string` | Optional auth token for the API request |

**Backend API Contract:**

Your backend should expose a `GET /flags` endpoint that returns:

```json
{
  "flags": {
    "xynes_auth_oauth_google": true,
    "xynes_auth_oauth_github": true,
    "xynes_auth_oauth_apple": false,
    "xynes_auth_email_signup": true,
    "xynes_auth_mfa": false,
    "xynes_maintenance_mode": false
    // ... other flags
  }
}
```

**Available Backend Feature Flags:**

| Category | Flag | Default |
|----------|------|---------|
| OAuth | `xynes_auth_oauth_google` | `false` |
| OAuth | `xynes_auth_oauth_github` | `false` |
| OAuth | `xynes_auth_oauth_apple` | `false` |
| Auth | `xynes_auth_email_signup` | `true` |
| Auth | `xynes_auth_password_reset` | `true` |
| Auth | `xynes_auth_mfa` | `false` |
| Auth | `xynes_auth_remember_me` | `true` |
| Auth | `xynes_auth_session_management` | `false` |
| Auth | `xynes_auth_rate_limit_ui` | `true` |
| Auth | `xynes_auth_profile_edit` | `true` |
| Workspace | `xynes_workspace_creation` | `true` |
| Workspace | `xynes_workspace_switching` | `true` |
| Workspace | `xynes_workspace_multiple` | `true` |
| Invite | `xynes_invite_enabled` | `true` |
| Invite | `xynes_invite_revocation` | `true` |
| System | `xynes_maintenance_mode` | `false` |

**Static Feature Flags (Config-based):**

| Category | Flag | Default |
|----------|------|---------|
| Auth | `enableEmailAuth` | `true` |
| Auth | `enableOAuthGoogle` | `true` |
| Auth | `enableOAuthGitHub` | `true` |
| Auth | `enableOAuthApple` | `false` |
| Workspace | `enableWorkspaceCreation` | `true` |
| Workspace | `enableWorkspaceSwitching` | `true` |
| Workspace | `enableMultipleWorkspaces` | `true` |
| Invite | `enableInvites` | `true` |
| Invite | `enableInviteRevocation` | `true` |
| Security | `enableMFA` | `false` |
| Security | `enableSessionManagement` | `false` |
| Security | `enableRateLimitUI` | `true` |
| Security | `enableCSPReporting` | `true` |
| UX | `enableRememberMe` | `true` |
| UX | `enablePasswordReset` | `true` |
| UX | `enableProfileEdit` | `true` |

## API Reference

### Configuration

#### `createAuthConfig(input)`

Create SDK configuration with defaults:

```tsx
const config = createAuthConfig({
  supabase: { url: '...', anonKey: '...' },
  api: { baseUrl: '...' },
  auth: { appUrl: '...', cookieDomain: '.xynes.com' },
  crossApp: {
    redirects: {
      appUrl: 'https://cms.xynes.com',
      allowedDomains: ['xynes.com', 'localhost:3000'],
      fallbackPath: '/dashboard',
    },
    session: {
      cookieDomain: '.xynes.com',
      secureCookies: true,
      cookieName: 'xynes_session',
    },
  },
  features: { enableMFA: true },
  modules: { 'invite': { enabled: false } },
});
```

#### `validateAuthConfig(config)`

Validate configuration:

```tsx
const result = validateAuthConfig(config);
if (!result.valid) {
  console.error('Config errors:', result.errors);
}
```

### Providers

#### `AuthProvider`

Main authentication provider. Wrap your app with this provider.

```tsx
<AuthProvider config={authConfig}>
  {children}
</AuthProvider>
```

#### `WorkspaceProvider`

Manages workspace selection. Must be nested inside `AuthProvider`.

```tsx
<AuthProvider config={authConfig}>
  <WorkspaceProvider>
    {children}
  </WorkspaceProvider>
</AuthProvider>
```

### Hooks

#### `useAuth()`

Returns auth state and methods:

```tsx
const {
  user,             // User object or null
  workspaces,       // Array of workspaces
  isLoading,        // Loading state
  isAuthenticated,  // Auth status
  error,            // Auth error if any
  signUp,           // Sign up with email/password
  signInWithPassword, // Sign in with email/password
  signInWithOAuth,  // Sign in with OAuth provider
  signOut,          // Sign out
  refreshSession,   // Force a Supabase session refresh + re-bootstrap
  refreshWorkspaces, // Re-fetch /me without rotating tokens (BUG-AUTH-2)
  redirectToLogin,  // Redirect to auth app login
  redirectToSignup, // Redirect to auth app signup
  getAccessToken,   // Get the current access token
} = useAuth();
```

##### `refreshWorkspaces()` (BUG-AUTH-2, 2026-05-30)

Call this **after a server-side workspace mutation** (e.g. just created or
joined a workspace) to make the in-memory `useAuth().workspaces` array
reflect the mutation **before the next render** — so a downstream
`useWorkspace().selectWorkspace(newId)` succeeds without a hard reload.

Posture:

- No-op when logged out.
- Bypasses the per-token bootstrap dedupe latch, so a same-token caller
  still hits `/me`.
- On 401/403 from `/me`: signs the user out (mirrors the canonical
  signed-out state).
- On a transient network failure: leaves the existing in-memory
  `workspaces` array untouched. Never throws.
- Does **not** rotate the Supabase refresh token (that's `refreshSession()`).

#### `useWorkspace()`

Returns workspace state:

```tsx
const {
  currentWorkspace,  // Currently selected workspace
  isLoading,         // Loading state
  selectWorkspace,   // Select a workspace by ID
  clearWorkspace,    // Clear workspace selection
} = useWorkspace();
```

#### `useInvite(token, apiBaseUrl)`

Manages invite resolution and acceptance:

```tsx
const {
  invite,       // Resolved invite or null
  isLoading,    // Loading state
  error,        // Error if any
  acceptInvite, // Accept the invite
  isAccepting,  // Accepting state
} = useInvite(token, apiBaseUrl);
```

Invite contract notes:
- `resolveInvite` handles gateway envelope and plain JSON responses.
- Invite role is normalized from either `role` or `roleKey`.
- `useInvite().acceptInvite()` returns the accepted workspace when available; if accept response omits workspace details, it falls back to workspace lookup.

### Utilities

#### Validation

```tsx
import { validateEmail, validatePassword, getPasswordStrength } from '@xynes/auth-sdk';

validateEmail('user@example.com'); // { isValid: true }
validatePassword('weak'); // { isValid: false, error: '...' }
getPasswordStrength('MySecure123!'); // 'strong'
```

#### Redirect Safety

```tsx
import {
  isValidRedirectUrl,
  getSafeRedirectUrl,
  buildAuthLoginUrl,
  buildAuthLogoutUrl,
} from '@xynes/auth-sdk';

// Prevent open redirect attacks
isValidRedirectUrl('https://evil.com', ['xynes.com']); // false
getSafeRedirectUrl(userInput, '/dashboard', ['xynes.com']);

// Build canonical auth-app login/logout URLs with safe redirect targets
buildAuthLoginUrl({
  authAppUrl: 'https://auth.xynes.com',
  redirectUrl: 'https://cms.xynes.com/content?tab=draft',
  allowedDomains: ['xynes.com', 'localhost:3000'],
});

buildAuthLogoutUrl({
  authAppUrl: 'https://auth.xynes.com',
  redirectUrl: '/signed-out',
  allowedDomains: ['xynes.com', 'localhost:3000'],
});
```

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://api.xynes.com
NEXT_PUBLIC_AUTH_APP_URL=https://auth.xynes.com
```

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run linting
pnpm lint
```

### Project Structure

```
src/
├── core/          # Core SDK infrastructure
│   ├── config.ts       # SDK configuration
│   ├── feature-flags.ts # Static feature flags system
│   └── module-registry.ts # Plugin architecture
├── api/           # API clients (AccountsClient)
├── components/    # React components (AuthGuard)
├── hooks/         # React hooks (useInvite, useWorkspaces)
├── providers/     # Context providers
│   ├── AuthProvider.tsx      # Authentication context
│   ├── WorkspaceProvider.tsx # Workspace context
│   └── FeatureFlagsProvider.tsx # Dynamic feature flags context
├── types/         # TypeScript type definitions
│   ├── feature-flags.ts # Backend feature flag types
│   └── ...             # Other type definitions
└── utils/         # Pure utilities (validation, errors, redirect)
```

### Testing Strategy

Following ADR-001 testing standards:

| Layer | Coverage | Target |
|-------|----------|--------|
| Core (Tier 1) | 99%+ | 100% |
| Utils (Tier 1) | 95%+ | 100% |
| Hooks (Tier 2) | 98%+ | 70% |
| Providers (Tier 3) | Smoke | N/A |

Run tests:
```bash
pnpm test           # Run all tests
pnpm test:coverage  # Run with coverage report
```

## Documentation

- [Architecture Guide](./docs/ARCHITECTURE.md) - Design patterns and folder structure
- [Testing Guide](./docs/TESTING.md) - Testing standards and best practices
- [FRONTEND-STORIES.md](../infra/docs/FRONTEND-STORIES.md) - Feature stories

## License

MIT © Xynes Studio
