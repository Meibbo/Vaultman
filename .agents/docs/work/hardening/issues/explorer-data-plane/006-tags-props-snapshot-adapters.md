---
title: EDP-006 Tags and Props snapshot adapters
type: issue
issue_id: EDP-006
status: active
issue_kind: AFK
parent: "[[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]]"
created: 2026-05-11T20:55:00
updated: 2026-05-13T03:38:18
labels:
  - ready-for-agent
tags:
  - agent/issue
  - initiative/hardening
  - explorer/views
blocked_by:
  - "[[002-files-snapshot-data-plane-foundation|EDP-002]]"
  - "[[003-files-panel-snapshot-compatibility-revisioned-reveal|EDP-003]]"
  - "[[004-batched-files-overlay-layers-viewservice|EDP-004]]"
  - "[[005-files-data-plane-performance-gate|EDP-005]]"
created_by: codex
updated_by: codex
---

# EDP-006 Tags And Props Snapshot Adapters

## Parent

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-transition/index|Explorer data plane transition]]

## Source

[[docs/work/hardening/specs/2026-05-11-explorer-data-plane-structural-taxonomy/17-wave-4-follow-up-slices#slice-a---tags-and-props-snapshots|Wave 4 Slice A]]

## What To Build

Extend the proven snapshot contract from Files to Tags and Props while
preserving provider action behavior for filters, queue ops, FnR, binding notes,
context menus, and property/value scope.

## Acceptance Criteria

- [x] Shared contract supports Tags/Props provider projection state and domain
      key lookup without requiring Files-only revisions.
- [x] Tags snapshots cover ids, parent links, visible order, search mode, sort
      target, casing, and tag domain-key lookup.
- [ ] Props snapshots cover ids, parent links, visible order, property/value
      scope, object values, and value removal.
- [x] Tags provider actions for filters, queue ops, FnR, binding notes, and
      context menus remain compatible.
- [ ] Props provider actions for filters, queue ops, FnR, binding notes, and
      context menus remain compatible.
- [x] `indexProps` versus `PropertyIndexService` ownership is documented or
      resolved.

## E0 Shared Contract Coordinator

Branch/worktree:
`codex/edp-006-contract` at
`C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\edp-006-contract`.

Coordinator scope:

- `ExplorerDataPlaneRevisions` now allows provider-specific structural
  revisions, so Tags and Props snapshots do not need to invent a Files revision.
- `ExplorerSnapshotProjection` records shared provider projection state:
  `searchTerm`, `searchMode`, `sortBy`, `sortDirection`, and `sortTarget`.
- `ExplorerSnapshot.domainKeyToId` maps provider domain keys to row ids for tag,
  property, and value lookups where paths/folder paths are not the domain key.
- `buildExplorerSnapshot()` accepts optional projection state, supplies stable
  defaults, and populates `domainKeyToId` from `domainKeyFor`.

Ownership decision:

- `indexProps` / `IPropsIndex` is the authoritative structural source for Props
  data-plane snapshots because it owns file-backed property/value frequency
  semantics and publishes a revision.
- `PropertyIndexService` remains a live autocomplete and modal helper. It is not
  the Explorer structural snapshot authority in EDP-006 because it intentionally
  keeps a monotonic value cache between rebuilds.
- E1 and E2 should consume this shared contract without editing shared
  data-plane types unless a new blocker is discovered and documented first.

## E1 Tags Snapshot Adapter

Branch/worktree:
`codex/edp-006-tags` at
`C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\edp-006-tags`.

Tags scope:

- `explorerTags` now exposes `getStructuralTree()`,
  `getStructuralRevisions()`, and `getSnapshot(expandedIds)`.
- `getSnapshot()` uses `buildExplorerSnapshot()` with provider projection state
  from the current Tags search/sort settings.
- Tags domain keys are canonical panel-action keys in the form `#tag/path`;
  snapshot `domainKeyToId` maps those keys back to row ids.
- Structural revisions include only `tagsRevision`. Queue and active-filter
  revisions remain decorative and do not invalidate the cached Tags logic tree.
- `getTree()` still decorates through the existing `ViewService` path, so
  active-filter badges, queue badges, search highlights, Iconic tag icons, and
  quick-action badges keep their existing behavior.
- Shared data-plane contracts, Props provider/container/tests, and panel/view
  behavior were not changed.

## Blocked By

- [[002-files-snapshot-data-plane-foundation|EDP-002]]
- [[003-files-panel-snapshot-compatibility-revisioned-reveal|EDP-003]]
- [[004-batched-files-overlay-layers-viewservice|EDP-004]]
- [[005-files-data-plane-performance-gate|EDP-005]]

## Verification

- RED: `pnpm run test:unit -- test/unit/logic/logicExplorerSnapshot.test.ts`
  failed 1/10 on missing projection metadata.
- GREEN: `pnpm run test:unit -- test/unit/logic/logicExplorerSnapshot.test.ts test/unit/services/serviceExplorerDataPlane.test.ts`
  passed 2 files / 17 tests.
- `pnpm run check` passed with 0 errors / 0 warnings after dependency setup was
  repaired in the new worktree.
- Sticky tree focused gate passed 4 files / 39 tests:
  `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewTreeDecorations.test.ts test/component/viewTreeScrollFallback.test.ts test/component/viewTreeSelection.test.ts test/component/viewTreeHoverBadges.test.ts --fileParallelism=false`.
- `pnpm run lint:full` passed.
- `pnpm run check` passed with 0 errors / 0 warnings.
- `pnpm run build:plugin` passed.
- `git diff --check` passed with Windows CRLF conversion warnings only.
- No runtime UI behavior changed; live Obsidian smoke was not required for E0.
- E1 RED: `pnpm run test:unit -- test/unit/components/explorerTagsSnapshot.test.ts`
  failed 4/4 because `explorerTags` did not expose `getSnapshot()` or
  `getStructuralTree()`.
- E1 GREEN: `pnpm run test:unit -- test/unit/components/explorerTagsSnapshot.test.ts`
  passed 1 file / 4 tests.
- E1 focused Tags gate:
  `pnpm run test:unit -- test/unit/components/explorerTagsSnapshot.test.ts test/unit/components/explorerTags.test.ts`
  passed 2 files / 14 tests.
- E1 sticky tree focused gate initially timed out once in
  `viewTreeScrollFallback.test.ts`; the isolated rerun passed 1 file / 3 tests,
  then the required combined sticky gate passed 4 files / 39 tests.
- E1 `pnpm run lint:full` passed.
- E1 `pnpm run check` passed with 0 errors / 0 warnings.
- E1 `pnpm run build:plugin` passed.
- E1 `git diff --check` passed with Windows CRLF conversion warnings only.
