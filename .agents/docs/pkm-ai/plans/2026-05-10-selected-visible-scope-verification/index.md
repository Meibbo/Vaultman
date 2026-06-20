---
title: Selected visible scope verification plan
type: plan-index
status: done
parent: "[[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/index|Agent Control Plane]]"
created: 2026-05-10T07:28:56
updated: 2026-05-10T07:38:14
created_by: codex
updated_by: codex
tags:
  - agent/plan
  - initiative/pkm-ai
  - scope
---

# Selected Visible Scope Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> test-driven-development to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify that selected files, visible files, and queued operation files
resolve through one contract before `serviceAPI` design begins.

**Architecture:** Extend the existing `serviceOperationScope` helper rather
than adding a second scope system. The concrete contract should return both
resolved files and evidence counts, clamp stale selected files to the visible
set when a visible set is supplied, and keep legacy `all` normalized to
`auto`. Product `serviceAPI` remains out of scope.

**Tech Stack:** TypeScript pure service, Vitest unit tests, existing provider
callers that already use `resolveOperationScopeFiles`.

---

## Decision

Use `serviceOperationScope` as the central pre-API scope contract.

- `filteredFiles` is the current file-level visible operation scope for the
  existing providers.
- `selectedFiles` may be stale or broader than the visible scope, so a verified
  resolver must report and exclude stale selected files when visible files are
  supplied.
- `resolveOperationScopeFiles` remains the provider-facing wrapper; it should
  delegate to the verified resolver.

## Scope

In scope:

- Add a result object with `scope`, `files`, `selectedCount`, `visibleCount`,
  `staleSelectedFiles`, and `source`.
- Add TDD coverage for selected/visible mismatch.
- Preserve current `auto`, `selected`, and `filtered` choices when selected
  files are visible.
- Keep legacy `all` from widening to all vault files.

Out of scope:

- No `serviceAPI`.
- No UI redesign.
- No Svelte component changes unless tests show the pure helper cannot enforce
  the contract centrally.
- No live Obsidian smoke unless product UI changes become necessary.

## File Map

- Modify: `test/unit/services/serviceOperationScope.test.ts`
- Modify: `src/services/serviceOperationScope.ts`
- Modify docs only: this plan, PKM-AI index, Agent Control Plane plan index

## Task 1 - RED: Selected Files Must Stay Visible

- [x] Add a failing test to
  `test/unit/services/serviceOperationScope.test.ts`:

```ts
it('clamps selected scope to visible files and reports stale selections', () => {
  const visible = mockTFile('visible.md');
  const stale = mockTFile('stale.md');

  const result = resolveVerifiedOperationScopeFiles({
    scope: 'selected',
    selectedFiles: [visible, stale],
    filteredFiles: [visible],
    visibleFiles: [visible],
  });

  expect(result.files).toEqual([visible]);
  expect(result.source).toBe('selected');
  expect(result.selectedCount).toBe(2);
  expect(result.visibleCount).toBe(1);
  expect(result.staleSelectedFiles).toEqual([stale]);
});
```

- [x] Run:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceOperationScope.test.ts -t "clamps selected scope"`.

Expected RED: import/function failure for `resolveVerifiedOperationScopeFiles`.

## Task 2 - GREEN: Verified Resolver

- [x] Implement `resolveVerifiedOperationScopeFiles(input)`.
- [x] Treat `visibleFiles` as optional; default to `filteredFiles`.
- [x] Compare files by `path`.
- [x] For `scope: selected`, return selected files that are visible.
- [x] For `scope: auto`, return visible selected files when any exist,
  otherwise return filtered files.
- [x] For `scope: filtered`, return filtered files.
- [x] Include stale selected files in evidence when selected files are not
  present in the visible set.
- [x] Change `resolveOperationScopeFiles` to return
  `resolveVerifiedOperationScopeFiles(input).files`.
- [x] Re-run the focused RED command and require PASS.

## Task 3 - Wrapper Regression

- [x] Add a test proving provider-facing `resolveOperationScopeFiles` no
  longer returns stale selected files when `filteredFiles` is visible:

```ts
it('keeps provider-facing file resolution inside the visible filtered set', () => {
  const visible = mockTFile('visible.md');
  const stale = mockTFile('stale.md');

  expect(resolveOperationScopeFiles({
    scope: 'auto',
    selectedFiles: [stale],
    filteredFiles: [visible],
  })).toEqual([visible]);
});
```

- [x] Run:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceOperationScope.test.ts -t "provider-facing file resolution"`.

Expected RED before Task 2; PASS after Task 2.

## Task 4 - Verification

- [x] Run focused scope unit:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceOperationScope.test.ts`.
- [x] Run provider queue scope regression:
  `pnpm exec vp test run --project component --config vitest.config.ts test/component/cmenuSetAction.test.ts --fileParallelism=false`.
- [x] Run `pnpm run check`, `pnpm run lint`, and `pnpm run build`
  sequentially if focused tests pass.
- [x] Run scoped whitespace:
  `git diff --check -- src/services/serviceOperationScope.ts test/unit/services/serviceOperationScope.test.ts test/component/cmenuSetAction.test.ts .agents/docs/work/pkm-ai/plans/2026-05-10-selected-visible-scope-verification/index.md .agents/docs/work/pkm-ai/index.md .agents/docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index.md`.

## Verification Log

- Existing baseline:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceOperationScope.test.ts`
  passed with 3 tests before this slice.
- RED:
  focused `clamps selected scope` failed with
  `TypeError: resolveVerifiedOperationScopeFiles is not a function`.
- GREEN:
  focused `clamps selected scope` passed with 1 test and 3 skipped.
- Old-contract failure:
  full scope suite then failed because `auto` still expected stale selected
  files to outrank visible/filtered files; the test was updated to the new
  visible-selected contract.
- Scope suite:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceOperationScope.test.ts`
  passed with 5 tests.
- Provider regression:
  `pnpm exec vp test run --project component --config vitest.config.ts test/component/cmenuSetAction.test.ts --fileParallelism=false`
  passed with 8 tests.
- `pnpm run check`: 0 errors and 0 warnings.
- `pnpm run lint`: 0 warnings and 0 errors.
- `pnpm run build`: TypeScript and Vite build passed, then the script printed
  `Error: Command "'vault=plugin-dev'" not found` from the Obsidian reload
  tail while still returning exit 0.
- Direct build verification:
  `pnpm exec tsc -noEmit -skipLibCheck` passed and `pnpm exec vp build`
  passed, transforming 552 modules.
- Scoped `git diff --check`: passed with only CRLF replacement warnings.
- `check-doc-health`: global FAIL (48), no `selected-visible-scope` path hit.
- `serviceAPI` was not touched.
