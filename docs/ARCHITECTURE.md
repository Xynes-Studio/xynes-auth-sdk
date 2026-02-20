# Architecture Guide

> **Version**: 0.1.0  
> **Last Updated**: 2025-01-03  
> **Pattern**: Modular Plugin Architecture

## Overview

The `@xynes/auth-sdk` is designed as a modular, plugin-based authentication SDK for React/Next.js applications. It follows global best practices for SDK design, security, and developer experience.

## Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Plugin-based Routes** | Dynamic route registration via module registry |
| **Feature Flags** | Enable/disable features at runtime per consumer app |
| **Tree-shakeable** | ESM/CJS dual build, unused code eliminated |
| **Type-safe** | Full TypeScript with strict mode |
| **Security-first** | Secure defaults, httpOnly cookies, input validation |
| **Testable** | Pure functions extracted for easy testing |

## Global Engineering Standards (React + Next.js Consumers)

- Keep SDK internals framework-agnostic where possible; React bindings stay in `src/providers`, `src/hooks`, and `src/components`.
- For Next.js consumers, pass runtime values via `createAuthConfig` and avoid environment reads inside SDK runtime modules.
- Keep redirect/security logic centralized in `src/utils/redirect.ts`; do not duplicate redirect validation in providers/hooks/components.
- Prefer additive, backward-compatible config changes by making new fields optional and validated.
- Keep public API discoverable through `src/index.ts` exports and mirrored usage examples in `README.md`.
- Use folder segregation consistently:
  - `src/core` for config/flags/registry contracts.
  - `src/types` for shared type contracts.
  - `src/utils` for pure Tier 1 logic.
  - `src/providers/hooks/components` for React runtime integration.

## Folder Structure

```
xynes-auth-sdk/
├── src/
│   ├── core/                    # 🔒 Core (always loaded)
│   │   ├── module-registry.ts   # Plugin registration system
│   │   ├── feature-flags.ts     # Feature toggle system
│   │   ├── config.ts            # SDK configuration
│   │   └── index.ts             # Barrel exports
│   │
│   ├── api/                     # 📡 API Client Layer
│   │   ├── accounts-client.ts   # Type-safe API client
│   │   └── index.ts             # Type exports
│   │
│   ├── providers/               # 🎨 React Context Providers
│   │   ├── AuthProvider.tsx     # Authentication state
│   │   ├── WorkspaceProvider.tsx# Workspace context
│   │   └── index.ts             # Type exports
│   │
│   ├── hooks/                   # 🪝 React Hooks
│   │   ├── useInvite.ts         # Invite resolution/acceptance
│   │   ├── useWorkspaces.ts     # Workspace utilities
│   │   └── index.ts             # Type exports
│   │
│   ├── components/              # 🧩 UI Components
│   │   ├── AuthGuard.tsx        # Route protection
│   │   └── index.ts             # Type exports
│   │
│   ├── utils/                   # 🛠️ Pure Utilities (Tier 1)
│   │   ├── validation.ts        # Input validation
│   │   ├── redirect.ts          # Secure redirect handling
│   │   ├── errors.ts            # Error normalization
│   │   └── index.ts             # Barrel exports
│   │
│   ├── types/                   # 📝 TypeScript Types
│   │   └── index.ts             # All type definitions
│   │
│   ├── test/                    # 🧪 Test Utilities
│   │   └── setup.ts             # Test setup & mocks
│   │
│   └── index.ts                 # 📦 Public API
│
├── docs/                        # 📚 Documentation
│   ├── DEVELOPER.md             # Contribution standards
│   ├── TESTING.md               # Testing guide
│   └── ARCHITECTURE.md          # This file
│
├── dist/                        # 📤 Build output
│   ├── index.js                 # CJS build
│   ├── index.mjs                # ESM build
│   └── index.d.ts               # Type definitions
│
├── package.json                 # Package config
├── tsconfig.json                # TypeScript config
├── tsup.config.ts               # Build config (ESM + CJS)
├── vitest.config.ts             # Test config
└── README.md                    # User documentation
```

## Module Registry Pattern

The SDK uses a registry pattern for maximum extensibility:

```typescript
// Module Registration
moduleRegistry.register({
  id: 'custom-analytics',
  name: 'Custom Analytics',
  enabled: true,
  routes: [
    { path: '/analytics', layout: 'app', guard: 'authenticated' },
  ],
});

// Get all enabled routes for dynamic routing
const routes = moduleRegistry.getRoutes();
```

### Built-in Module IDs

| ID | Description | Status |
|----|-------------|--------|
| `core-auth` | Login, signup, logout | ✅ |
| `workspace` | Workspace CRUD, selection | ✅ |
| `invite` | Invite system | ✅ |
| `password-reset` | Password reset flow | 📋 Planned |
| `oauth-providers` | OAuth support | 📋 Planned |
| `session-management` | Session management | 📋 Planned |
| `security` | Security utilities | 📋 Planned |

## Feature Flags System

Allows consumer apps to customize SDK behavior:

```typescript
// Create flags with overrides
const flags = createFeatureFlags({
  enableMFA: true,           // Override default
  enableOAuthApple: true,    // Enable for this app
});

// Check feature availability
if (isFeatureEnabled(flags, 'enableMFA')) {
  // Render MFA setup
}
```

### Flag Categories

| Category | Flags |
|----------|-------|
| **Auth** | `enableEmailAuth`, `enableOAuthGoogle`, `enableOAuthGitHub`, `enableOAuthApple` |
| **Workspace** | `enableWorkspaceCreation`, `enableWorkspaceSwitching`, `enableMultipleWorkspaces` |
| **Invite** | `enableInvites`, `enableInviteRevocation` |
| **Security** | `enableMFA`, `enableSessionManagement`, `enableRateLimitUI`, `enableCSPReporting` |
| **UX** | `enableRememberMe`, `enablePasswordReset`, `enableProfileEdit` |

## SDK Configuration

Centralized, validated configuration:

```typescript
const config = createAuthConfig({
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
    enableMFA: true,
  },
  modules: {
    'core-auth': { enabled: true },
    'invite': { enabled: false }, // Disable for this app
  },
});
```

### Configuration Validation

```typescript
const result = validateAuthConfig(config);

if (!result.isValid) {
  console.error('Invalid config:', result.errors);
  // ['supabase.url is required', 'api.baseUrl is required', ...]
}
```

## Build System

The SDK uses `tsup` for building:

```typescript
// tsup.config.ts
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],  // Dual build
  dts: true,                // TypeScript declarations
  splitting: false,         // Single bundle
  sourcemap: true,          // Debug support
  clean: true,              // Clean output
  external: ["react", "react-dom"],  // Peer deps
  treeshake: true,          // Remove unused code
});
```

### Bundle Outputs

| File | Format | Size |
|------|--------|------|
| `dist/index.js` | CommonJS | ~24 KB |
| `dist/index.mjs` | ES Modules | ~23 KB |
| `dist/index.d.ts` | TypeScript | ~21 KB |

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Consumer App (Next.js)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                     AuthProvider                            │   │
│   │  ┌─────────────────────────────────────────────────────────┐│   │
│   │  │                WorkspaceProvider                        ││   │
│   │  │                                                         ││   │
│   │  │  ┌─────────────────────────────────────────────────┐   ││   │
│   │  │  │              App Components                      │   ││   │
│   │  │  │                                                  │   ││   │
│   │  │  │   useAuth() → { user, isAuthenticated }         │   ││   │
│   │  │  │   useWorkspace() → { currentWorkspace }         │   ││   │
│   │  │  │   useInvite(token) → { invite, acceptInvite }   │   ││   │
│   │  │  │                                                  │   ││   │
│   │  │  └─────────────────────────────────────────────────┘   ││   │
│   │  └─────────────────────────────────────────────────────────┘│   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                  │                                   │
│                                  ▼                                   │
│                       ┌──────────────────┐                          │
│                       │  AccountsClient  │                          │
│                       └────────┬─────────┘                          │
│                                │                                     │
└────────────────────────────────┼─────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                         Accounts API                                │
│                    (api.xynes.com)                                  │
└────────────────────────────────────────────────────────────────────┘
```

## Security Considerations

### 1. Cookie Configuration

```typescript
const COOKIE_OPTIONS = {
  httpOnly: true,        // Not accessible via JS
  secure: true,          // HTTPS only in production
  sameSite: 'lax',       // CSRF protection
  domain: '.xynes.com',  // Shared across subdomains
};
```

### 2. Redirect Validation

```typescript
// Only allow redirects to trusted domains
isValidRedirectUrl('https://cms.xynes.com/dashboard'); // true
isValidRedirectUrl('https://malicious.com');           // false
```

### 3. Input Validation

```typescript
// All user input validated with Zod schemas
validateEmail('user@example.com');     // { isValid: true }
validatePassword('weakpw');            // { isValid: false, errors: [...] }
```

### 4. Error Normalization

```typescript
// Errors normalized to prevent information leakage
normalizeAuthError(supabaseError); // Friendly, safe error message
```

## Consumer Integration

### Next.js App Router

```typescript
// app/layout.tsx
import { AuthProvider, WorkspaceProvider } from '@xynes/auth-sdk';
import { authConfig } from '@/lib/auth-config';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider config={authConfig}>
          <WorkspaceProvider>
            {children}
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Protected Pages

```typescript
// app/(dashboard)/page.tsx
'use client';
import { AuthGuard } from '@xynes/auth-sdk';

export default function DashboardPage() {
  return (
    <AuthGuard unauthenticatedMode="redirectToAuth">
      <DashboardContent />
    </AuthGuard>
  );
}
```

## Future Roadmap

| Phase | Features | Status |
|-------|----------|--------|
| **Phase 1** | Core auth, workspaces, invites | ✅ Complete |
| **Phase 2** | MFA, session management | 📋 Planned |
| **Phase 3** | Lazy-loaded modules, code splitting | 📋 Planned |

## Related Documentation

- [README.md](../README.md) - User documentation
- [TESTING.md](./TESTING.md) - Testing guide
- [FRONTEND-STORIES.md](../../infra/docs/FRONTEND-STORIES.md) - Feature stories
- [ADR-001](../../lumia-ds/docs/ADR-001-testing-standards.md) - Testing standards
