# @xynes/auth-sdk

Authentication SDK for Xynes applications. Provides React hooks, providers, and utilities for Supabase auth integration.

## Installation

```bash
npm install @xynes/auth-sdk
# or
pnpm add @xynes/auth-sdk
```

## Quick Start

### 1. Configure the AuthProvider

```tsx
// app/providers.tsx
import { AuthProvider } from '@xynes/auth-sdk';

const authConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL!,
  authAppUrl: process.env.NEXT_PUBLIC_AUTH_APP_URL!,
  cookieDomain: '.xynes.com',
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider config={authConfig}>
      {children}
    </AuthProvider>
  );
}
```

### 2. Use the useAuth hook

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

### 3. Protect routes with AuthGuard

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

## API Reference

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
| Utils (Tier 1) | 95%+ | 100% |
| Hooks (Tier 2) | 98%+ | 70% |
| Providers (Tier 3) | Smoke | N/A |

Run tests:
```bash
pnpm test           # Run all tests
pnpm test:coverage  # Run with coverage report
```

