# Developer Guide

This guide captures implementation standards for contributors changing `@xynes/auth-sdk`.

## Scope and Segregation

- `src/core`: config contracts, validation, feature flags, module registry.
- `src/types`: shared type contracts used by providers and consumers.
- `src/utils`: pure logic (Tier 1) with no React or DOM dependency.
- `src/providers`, `src/hooks`, `src/components`: React runtime bindings only.
- `src/index.ts`: public API only. Export intentionally; avoid accidental surface growth.

## React and Next.js Consumer Standards

- Keep the SDK framework-neutral in core and utils. React/Next.js specifics stay in provider/hook layers.
- Do not read `process.env` in runtime SDK logic. Consumers pass config through `createAuthConfig` and provider props.
- Preserve backward compatibility: new config fields must be optional unless explicitly planned as a breaking change.
- Redirect behavior must always use shared redirect helpers instead of ad hoc URL handling.

### AuthGuard Standards (Next.js App Router + React)

- Use `AuthGuard` in client components only (`"use client"`), because it depends on hooks/effects.
- Prefer `unauthenticatedMode="redirectToAuth"` for consumer apps; this keeps redirect construction centralized in SDK `useAuth().redirectToLogin`.
- Use `returnUrl` only when you need an explicit override. Otherwise rely on current URL fallback inside `redirectToLogin`.
- Keep `optional` only for truly public or mixed-access screens; protected pages should not set `optional`.
- Do not duplicate redirect logic with direct `window.location.href = .../login?...` in app code; this introduces security drift and future maintenance cost.

## Security Standards

- Reject unsafe redirect schemes (`javascript:`, `data:`, non-HTTP(S) absolute URLs).
- Accept only relative paths (`/foo`) or allowlisted domains for absolute redirects.
- Keep safe fallback behavior deterministic for invalid redirect candidates.
- Validate config input at the core boundary (`validateAuthConfig`) before usage.

## Testing Standards (ADR-001)

- Follow Red-Green-Refactor for all feature and bug changes.
- Tier 1 pure logic (`src/utils`, `src/core`) targets 100% coverage where practical.
- Tier 2 React integration targets >= 70% coverage.
- Repository global coverage must remain >= 80%.

Minimum verification before completion:

```bash
pnpm test src/utils/redirect.test.ts src/core/config.test.ts
pnpm lint
pnpm test:coverage
```
