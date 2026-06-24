---
title: FnR templating variables and modifiers
type: implementation-plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-07-multifacet-2/index|multifacet wave 2 plan]]"
created: 2026-05-07T02:30:00
updated: 2026-05-07T02:30:00
tags:
  - agent/plan
  - explorer/find-replace
created_by: claude
updated_by: claude
---

# Phase 2 — FnR Templating Variables And Modifiers

> Spec: [[docs/work/hardening/specs/2026-05-07-multifacet-2/01-fnr-island-templating|FnR island and templating]]

## Tasks

- [x] Create `src/services/serviceFnRTemplate.ts` exporting:
      `tokenize(query: string): TokenStream`,
      `resolve(tokens, ctx): string`, `validate(tokens): TokenError[]`.
- [x] Implement allowlist exactly as spec §Templating Tokens. Unknown
      token → `TokenError`.
- [x] Create `src/services/serviceFnRDateParser.ts`. Support
      `datejs`-style suffix math and natural-language phrases. No
      `eval` / no `new Function`. Hand-rolled (no chrono-node).
- [x] Add `flags` (`matchCase`, `wholeWord`, `regex`) to
      `FnRIslandService` plus toggle UI in the searchbox island.
      Mutual exclusion: `regex` disables `wholeWord`.
- [x] On submit, resolve tokens once, splice into `query`, dispatch
      to mode-specific submit. Implemented in `submit()`; resolved
      string is on `payload.resolvedQuery`.
- [ ] Snapshot `{{filter}}` at submit time via
      `serviceFilter.snapshot()`. Defer: caller still passes filter
      string through `resolveContext()`; per-call snapshot wired in
      phase 3 with the ops-log.
- [x] Surface inline error component above searchbox when validate
      returns errors. Disable submit while errors exist (`crear`
      auto-disables; `vm-filters-search-error` rendered above pill).

## Tests

- [x] `test/unit/services/serviceFnRTemplate.test.ts` — tokenize,
      validate, resolve, unknown-token rejection, single-brace
      ignored. (20 tests)
- [x] `test/unit/services/serviceFnRDateParser.test.ts` — `today`,
      `tomorrow`, `in two hours`, `+1d`, `-2h`, malformed input.
      (12 tests)
- [x] `test/unit/services/serviceFnRTokenAllowlist.test.ts` — every
      token in spec table resolves; unknown token rejected. (6 tests)
- [x] `test/component/searchboxIslandFlags.test.ts` — toggle
      interactions, mutual exclusion, regex error surfacing.
      (5 tests)

## Verification

- [x] Focused unit run for the three template suites — 45 passed.
- [x] Focused component run for `searchboxIslandFlags` — 5 passed.
- [x] Full required suite: 64 unit + 13 component pass; `pnpm exec
      vp build` green; `pnpm exec vp lint` 0/0; `git diff --check`
      exit 0.

## Stop Conditions

- Stop if any template path could trigger arbitrary code execution.
  Audit before merge.
- Stop if `chrono-node` adds >50KB to the bundle. Hand-roll a small
  parser for the supported phrases instead.
- Stop if `{{filter}}` snapshot stalls the UI on large vaults; move
  snapshot to a worker / lazy iterator.
