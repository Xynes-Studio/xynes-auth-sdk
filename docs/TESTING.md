# Testing Guide

> **Standard**: ADR-001 Three-Tier Testing Architecture  
> **Coverage Target**: 80% global, 100% for pure functions (Tier 1)

## Testing Architecture

This SDK follows the three-tier testing architecture defined in [ADR-001](../../lumia-ds/docs/ADR-001-testing-standards.md):

```
┌──────────────────────────────────────────────────────┐
│ Tier 1: Pure Function Tests (100% coverage target)  │
│ • Business logic, transformations, utilities        │
│ • No React, no DOM dependencies                     │
│ • Fast, deterministic, easy to maintain             │
└──────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────┐
│ Tier 2: Integration Tests (70% coverage target)     │
│ • Component interactions, hooks, providers          │
│ • Uses shared test utilities                        │
│ • Real browser/DOM environment (happy-dom)          │
└──────────────────────────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────┐
│ Tier 3: E2E Tests (Smoke coverage)                  │
│ • Full user flows via consumer apps                 │
│ • Playwright integration                            │
└──────────────────────────────────────────────────────┘
```

## Current Coverage

| Module | Type | Coverage | Target |
|--------|------|----------|--------|
| `src/core/module-registry.ts` | Tier 1 | **100%** | 100% |
| `src/core/feature-flags.ts` | Tier 1 | **100%** | 100% |
| `src/core/config.ts` | Tier 1 | **100%** | 100% |
| `src/utils/validation.ts` | Tier 1 | **100%** | 100% |
| `src/utils/redirect.ts` | Tier 1 | **96%** | 100% |
| `src/utils/errors.ts` | Tier 1 | **94%** | 100% |
| `src/hooks/useWorkspaces.ts` | Tier 2 | **100%** | 70% |
| `src/hooks/useInvite.ts` | Tier 2 | **100%** | 70% |
| `src/providers/AuthProvider.tsx` | Tier 2 | **98%** | 70% |
| `src/providers/WorkspaceProvider.tsx` | Tier 2 | - | 70% |
| `src/components/*` | Tier 2 | - | 70% |

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/core/module-registry.test.ts
```

## Test File Organization

Following ADR-001 naming conventions:

```
src/
├── core/
│   ├── module-registry.ts       # Implementation
│   └── module-registry.test.ts  # Unit tests (Tier 1)
├── hooks/
│   ├── useWorkspaces.ts         # Implementation
│   └── useWorkspaces.test.ts    # Integration tests (Tier 2)
├── providers/
│   ├── AuthProvider.tsx         # Implementation
│   ├── AuthProvider.test.tsx    # Integration tests (Tier 2) - 27 tests, 98% coverage
│   └── WorkspaceProvider.tsx    # Implementation
└── test/
    └── setup.ts                 # Test setup and utilities
```

## Writing Tests

### Tier 1: Pure Function Tests

Pure functions should be tested exhaustively with 100% coverage:

```typescript
// src/core/feature-flags.test.ts
import { describe, it, expect } from "vitest";
import { createFeatureFlags, isFeatureEnabled, DEFAULT_FLAGS } from "./feature-flags";

describe("createFeatureFlags", () => {
  it("should return default flags when no overrides provided", () => {
    const flags = createFeatureFlags();
    expect(flags).toEqual(DEFAULT_FLAGS);
  });

  it("should merge overrides with defaults", () => {
    const flags = createFeatureFlags({ enableMFA: true });
    expect(flags.enableMFA).toBe(true);
    expect(flags.enableEmailAuth).toBe(true); // default preserved
  });

  it("should handle undefined overrides", () => {
    const flags = createFeatureFlags(undefined);
    expect(flags).toEqual(DEFAULT_FLAGS);
  });
});
```

### Tier 2: Integration Tests (Hooks)

Test hooks with @testing-library/react:

```typescript
// src/hooks/useWorkspaces.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWorkspaces } from "./useWorkspaces";
import * as AuthProviderModule from "../providers/AuthProvider";

const mockUseAuth = vi.spyOn(AuthProviderModule, "useAuth");

describe("useWorkspaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return workspaces from auth context", () => {
    mockUseAuth.mockReturnValue({
      workspaces: [{ id: "ws-1", name: "Test" }],
      isLoading: false,
      // ... other required fields
    });

    const { result } = renderHook(() => useWorkspaces());
    expect(result.current.workspaces).toHaveLength(1);
  });
});
```

### Test Utilities

Shared test utilities are in `src/test/setup.ts`:

```typescript
// src/test/setup.ts
import "@testing-library/jest-dom/vitest";

// Mock ResizeObserver for happy-dom
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

## Best Practices

### 1. Extract Pure Logic

**Before** (hard to test):
```typescript
export function useComplexHook({ data }) {
  const [state, setState] = useState();
  useEffect(() => {
    // 50 lines of business logic
    const processed = /* complex transformation */;
    setState(processed);
  }, [data]);
}
```

**After** (testable):
```typescript
// Pure function - test in Tier 1
export function processData(input: DataInput): ProcessedResult {
  // Business logic extracted
}

// Hook becomes thin wrapper - test in Tier 2
export function useComplexHook({ data }) {
  const [state, setState] = useState();
  useEffect(() => {
    setState(processData(data));
  }, [data]);
}
```

### 2. Mock External Dependencies

```typescript
// Mock Supabase client
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  })),
}));
```

### 3. Test Error Cases

Always test error states:

```typescript
describe("error handling", () => {
  it("should handle network errors", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useAuth());
    
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it("should handle invalid credentials", async () => {
    // ...
  });
});
```

### 4. Use Descriptive Test Names

```typescript
// ✅ Good
it("should return hasWorkspaces=true when user has at least one workspace", () => {});
it("should redirect to login when session expires", () => {});

// ❌ Bad
it("works", () => {});
it("handles case 1", () => {});
```

## CI Integration

Tests run automatically on:
- Every pull request
- Pre-commit hooks (via husky)
- Release builds

Coverage thresholds are enforced:

```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
},
```

## Related Documentation

- [ADR-001: Global Testing Standards](../../lumia-ds/docs/ADR-001-testing-standards.md)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro/)
