## Summary
<!-- One-paragraph description of what this PR does and why. -->

## Linked work
- Plan / issue: <!-- link -->
- Related repos: <!-- link any PRs that depend on or are depended on by this one -->

## Quality gates
- [ ] `lint` passes locally
- [ ] `test` passes locally
- [ ] Coverage ≥ ADR-001 80% floor (or justified exception below)
- [ ] `typecheck` / `build` passes (where applicable)
- [ ] Docs updated (`README.md`, `DEVELOPER.md`, `AGENTS.md`, repo memory)
- [ ] Migration added (if schema change) — forward-only, expand/contract
- [ ] QA PII scrub updated (if migration adds PII)
- [ ] Release doc set updated (if release contract changed)

## Security
- [ ] No secrets in code, logs, error messages, or test fixtures
- [ ] No raw API keys forwarded to downstream services
- [ ] No PII added to telemetry or access logs

## Deployment notes
<!-- e.g. "Requires migration run before service rollout", "Requires xynes-platform-contracts vX.Y.Z first". -->

## Rollback plan
<!-- For risky changes only. -->

---

## Repo-specific items (xynes-auth-sdk)

This is the **shared auth + workspace + feature-flag SDK** consumed via `pnpm link` by `xynes-auth-app` and `xynes-cms-console-web`. Use `pnpm`, never `npm`.

- [ ] Lint: `pnpm lint` (eslint over `src/**/*.{ts,tsx}`)
- [ ] Tests: `pnpm test` (vitest run)
- [ ] Coverage: `pnpm test:coverage` — overall must stay at or above the **ADR-001 80% lines + branches floor**
- [ ] Typecheck: `pnpm typecheck` (= `tsc --noEmit`)
- [ ] Build: `pnpm build` — **MANDATORY before opening downstream consumer PRs.** Every consumer (`xynes-auth-app`, `xynes-cms-console-web`) imports from the SDK's `dist/` (tsup ESM + CJS + DTS). A consumer PR opened against a stale dist will fail downstream TypeScript / type-check with errors that look unrelated. **The classic stale-dist trap is documented in repo memory as `auth-sdk-dist-stale-trap.md`.**
- [ ] **Cross-repo merge ordering (sprint plan §9 binding, BUG-CMS-5 precedent).** SDK PR merges FIRST → SDK dist rebuilds → consumer PR opens against the fresh dist. Gateway-side flag-key changes can land before, between, or after — they don't gate on SDK ordering.
- [ ] **Feature-flag key contract (STORAGE-LIVE-5 / BUG-CMS-5).** Adding a new flag key requires updating BOTH the gateway's `DEFAULT_FLAGS` (in `xynes-gateway/src/featureFlags/types.ts`) AND this SDK's `FeatureFlags` interface + `DEFAULT_FEATURE_FLAGS` (in `src/types/feature-flags.ts`). `normalizeFeatureFlags` silently filters unknown keys, so without lockstep the gateway response is dropped client-side. NOT in `PUBLIC_FLAG_KEYS` unless the flag is genuinely workspace-independent.
- [ ] **`workspaceId` header contract (BUG-CMS-5).** `<FeatureFlagsProvider workspaceId={...}>` is the canonical workspace-scoped evaluation path. When set, the SDK sends `X-XS-Workspace-Id` on the `/flags` fetch; the gateway forwards via PostHog `groups: { workspace: workspaceId }`. PRs that change this contract MUST keep header-omission behaviour when `workspaceId` is `null`/`undefined` (no empty-string footgun).
- [ ] **NO `posthog-js` in the browser, NO `phc_*` key in any FE bundle.** All flag evaluation is server-side via the gateway's `posthog-node` client. The SDK consumes the gateway's `/flags` JSON only.
- [ ] **Translation contract (TFU-2 — auth SDK error-code localization).** Auth error codes flow through the SDK's catalog with pseudo-locale (`en-XA`) round-trip coverage. Hostile cookies / accept-language fall closed to `en-US`. New error codes MUST register in both `en-US` and `en-XA` catalogs.
- [ ] **No secrets in `dist/`.** The build output is published downstream via `pnpm link`. Test fixtures, sample env values, or `phc_*`/`xynes_live_*`/`re_*` substrings MUST NOT survive into `src/` → `dist/`. The pre-publish gate is `eslint` + `pnpm test`; defense in depth lives in the gateway's snippet redaction.
- [ ] **`tsup` build outputs ESM + CJS + DTS.** Both module formats MUST work. PRs that change `tsup.config.ts` MUST verify the consumer `next dev` / `next build` succeeds against the fresh dist.
