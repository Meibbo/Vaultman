---
title: Revision-gated explorer model caches
type: implementation-record
status: done
parent: "[[docs/work/performance/research/2026-05-09-ecosystem-performance-codeql-research|ecosystem-performance-codeql-research]]"
created: 2026-05-09T20:44:00
updated: 2026-05-09T21:54:00
tags:
  - agent/performance
  - vaultman/runtime-cache
created_by: codex
updated_by: codex
---

# Revision-Gated Explorer Model Caches

## Scope

Implement the runtime performance slice after the CodeQL guardrails:
revision-gated explorer model caches. The target regression is visible latency
from recomputing row decoration and semantic layers when only transient UI state
changes, such as selection, focus, or hover.

## Implementation

- Added `revision` to the `INodeIndex<TNode>` contract.
- `createNodeIndex` now increments its published revision only after a refresh
  successfully publishes a new node snapshot. Stale async refreshes that lose
  the internal refresh race do not advance the public revision.
- `createContentIndex` now increments its published revision on every
  `publish(...)`, including scan progress and final search-result snapshots.
- Added `ExplorerViewRevisions` on `ExplorerViewInput`:
  - `filesRevision`
  - `propsRevision`
  - `tagsRevision`
  - `contentRevision`
  - `queueRevision`
  - `filterRevision`
- `explorerFiles`, `explorerProps`, `explorerTags`, and `explorerContent` now
  pass the relevant source-index revision plus queue/filter revisions into
  `ViewService.getModel(...)`.
- `ViewService` now caches semantic row layers only when at least one revision
  is present. Calls without revisions retain the old no-cache behavior.
- The cache key includes explorer id, view mode, all revision fields, decoration
  revision, node id, row label, and a stable decoration-context key.
- Selection remains outside the semantic cache. `toRow(...)` still rebuilds the
  returned row layers and applies selected state on every model request.
- Decoration manager changes clear the semantic cache and notify subscribers, so
  cached decoration layers do not outlive decoration-source updates.
- The semantic layer cache has a bounded entry count and clears when it reaches
  the cap.
- While validating the row-cache path, a pre-existing active-filter projection
  gap was fixed: file-name and folder filters now enter the file-candidate
  bucket instead of only exact `file_path` filters being considered.

## Test Coverage

- Added `ViewService` coverage proving semantic decoration is reused across a
  selection-only change when revisions are stable.
- Added `ViewService` perf-probe coverage proving the semantic cache records
  `viewService.semanticCache.hit`, `viewService.semanticCache.miss`, and
  `viewService.semanticCache.evict` counters.
- Existing `ViewService` file operation and file-filter projection coverage now
  passes after indexing file target filters as candidates.
- Added revision assertions for `createNodeIndex` and `createContentIndex`.
- Updated provider and component fixtures to model the current index contracts:
  `revision`, `propsIndex.nodes`, mutable test index revisions, and real
  `ViewService.getModel(...)` where content providers decorate rows.

## Verification

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceViews.test.ts`
  passed with 15 tests.
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/createNodeIndex.test.ts test/unit/services/serviceContentIndex.test.ts test/unit/services/serviceExplorer.test.ts test/unit/components/explorerContent.test.ts`
  passed with 24 tests.
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/logic/logicProps.test.ts test/unit/components/explorerProps.test.ts`
  passed with 21 tests.
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/components/explorerFiles.test.ts`
  passed with 14 tests.
- `pnpm exec vp test run --project component --config vitest.config.ts --fileParallelism=false test/component/reactiveExplorers.test.ts`
  passed with 8 tests.
- `pnpm run test:unit` passed with 77 files and 529 tests.
- `pnpm run test:component` passed with 41 files and 203 tests.
- `pnpm run lint` passed with 0 warnings and 0 errors.
- `pnpm run check` passed with 0 errors and 0 warnings.
- `pnpm run build` passed and synced build artifacts.
- 2026-05-09T21:54 instrumentation continuation:
  - `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceViews.test.ts`
    passed with 16 tests after the RED/GREEN instrumentation test.
  - `pnpm run lint` passed with 0 warnings and 0 errors.
  - `pnpm run check` passed with 0 errors and 0 warnings.
  - `pnpm run test:unit` passed with 77 files and 530 tests.
  - `pnpm run build` passed and synced build artifacts.
- Svelte autofixer was run against `serviceViews.svelte.ts`; it reported no
  issues. It suggested replacing some non-reactive local `Map`/`Set` caches with
  Svelte collections, which was intentionally not applied because these are
  private indexes/caches rather than UI-reactive state.

## Follow-Up

- If profiler data still shows row model churn, add perf counters around cache
  hits/misses and tune the cache cap by real explorer node counts.
- Consider a future dedicated `decorationRevision` source if decoration inputs
  grow beyond the current decoration manager subscription model.
