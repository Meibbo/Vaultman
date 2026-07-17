---
title: Durable TanStack virtualizer keys
type: implementation-record
status: done
created: 2026-05-09T17:15:00
updated: 2026-05-09T17:15:00
tags:
  - agent/performance
  - vaultman/viewtree
  - vaultman/tanstack
created_by: codex
updated_by: codex
---

# Durable TanStack Virtualizer Keys

## Problem

The ecosystem performance research identified that `viewTree`, `ViewNodeGrid`,
and `ViewNodeTable` used TanStack virtualizers without explicit `getItemKey`
functions. TanStack then falls back to index keys, which can increase DOM churn
when tree expansion, sorting, grouping, or column-count changes shift items.

## Change

- `viewTree.svelte` now keys virtual rows by flattened tree node ID.
- `ViewNodeGrid.svelte` now keys virtual rows by the row's composed node IDs.
- `ViewNodeTable.svelte` now keys virtual rows by TanStack table row ID.
- All three views pass the key function at initial virtualizer creation and
  again during `setOptions(...)`, so later reactive option updates cannot drop
  the durable-key contract.
- Added `test/component/virtualizerItemKeys.test.ts`, which mocks
  `@tanstack/svelte-virtual` and asserts that each mounted component gives the
  virtualizer a durable `getItemKey`.

## Verification

- Red: `pnpm exec vp test run --project component --config vitest.config.ts test/component/virtualizerItemKeys.test.ts --fileParallelism=false`
  failed on all three views because `getItemKey` was absent.
- Green: same command passed with 1 file and 3 tests.
- Regression:
  `pnpm exec vp test run --project component --config vitest.config.ts test/component/virtualizerItemKeys.test.ts test/component/viewTreeSelection.test.ts test/component/viewGridSelection.test.ts test/component/viewTableSelection.test.ts test/component/perfProbeDom.test.ts --fileParallelism=false`
  passed with 5 files and 44 tests.
- `npx @sveltejs/mcp svelte-autofixer ... --svelte-version 5` reported no
  issues for `viewTree.svelte`, `ViewNodeGrid.svelte`, or `ViewNodeTable.svelte`;
  only pre-existing/general suggestions about effects and `bind:this`.
- `pnpm run check` passed with 0 errors and 0 warnings.
- `pnpm run lint` passed with 0 warnings and 0 errors.
- `git diff --check -- src/components/views/viewTree.svelte src/components/views/ViewNodeGrid.svelte src/components/views/ViewNodeTable.svelte test/component/virtualizerItemKeys.test.ts`
  exited 0.
