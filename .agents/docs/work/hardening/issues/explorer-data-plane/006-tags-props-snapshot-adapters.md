---
title: EDP-006 Tags and Props snapshot adapters
type: issue
issue_id: EDP-006
status: active
issue_kind: AFK
parent: "[[docs/work/hardening/issues/explorer-data-plane/index|Explorer data plane local issues]]"
created: 2026-05-11T20:55:00
updated: 2026-05-13T02:11:50
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
- [ ] Tags/Props snapshots cover ids, parent links, visible order, search mode,
      sort target, casing, object values, and value removal.
- [ ] Provider actions for filters, queue ops, FnR, binding notes, and context
      menus remain compatible.
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
