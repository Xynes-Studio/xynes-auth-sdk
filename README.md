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
  const handleUnauthenticated = () => {
    window.location.href = `${AUTH_APP_URL}/login?redirect=${window.location.href}`;
  };

  return (
    <AuthGuard onUnauthenticated={handleUnauthenticated}>
      {children}
    </AuthGuard>
  );
}
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

Enable/disable features at runtime:

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

**Available Feature Flags:**

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
  redirectToLogin,  // Redirect to auth app login
  redirectToSignup, // Redirect to auth app signup
} = useAuth();
```

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
import { isValidRedirectUrl, getSafeRedirectUrl } from '@xynes/auth-sdk';

// Prevent open redirect attacks
isValidRedirectUrl('https://evil.com', ['xynes.com']); // false
getSafeRedirectUrl(userInput, '/dashboard', ['xynes.com']);
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
│   ├── feature-flags.ts # Feature flags system
│   └── module-registry.ts # Plugin architecture
├── api/           # API clients (AccountsClient)
├── components/    # React components (AuthGuard)
├── hooks/         # React hooks (useInvite, useWorkspaces)
├── providers/     # Context providers (AuthProvider, WorkspaceProvider)
├── types/         # TypeScript type definitions
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

## License

MIT © Xynes Studio

