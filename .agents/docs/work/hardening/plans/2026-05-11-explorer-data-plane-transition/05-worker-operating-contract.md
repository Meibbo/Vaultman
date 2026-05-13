---
title: EDP worker operating contract
type: dispatch-contract
status: active
parent: "[[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/index|explorer-data-plane-transition-plans]]"
created: 2026-05-12T12:35:00
updated: 2026-05-12T12:35:00
tags:
  - agent/plan
  - agent/dispatch
  - initiative/hardening
  - explorer/views
created_by: codex
updated_by: codex
---

# EDP Worker Operating Contract

This is the mandatory worker contract for the remaining Explorer data-plane
parallel work.

## Current Base

- Canonical branch: `claude/explorer`.
- Current integrated head: `5e2e7bc docs: update edp dispatch after wave 3 reconciliation`.
- Completed on this branch: EDP-001, EDP-002, EDP-003, EDP-004, EDP-007.
- Do not work from the root `sandbox` worktree. Its Wave 3 edits are stale and
  were superseded by `d110fe6`.

## Required Start Sequence

Every implementation worker starts from the canonical branch and an isolated
worktree:

```powershell
cd C:\Users\vic_A\Desktop\vaultman
git worktree add .claude\worktrees\<worktree-name> -b <branch-name> claude/explorer
cd .claude\worktrees\<worktree-name>
pnpm install
git status --short --branch
```

Use the exact worktree and branch names listed for the assigned agent below
unless the path already exists. If it exists, stop and report instead of
reusing another worker's directory.

## Required Reading

Every worker reads, in order:

1. `AGENTS.md`
2. `.agents/docs/start.md`
3. `.agents/docs/current/status.md`
4. `.agents/docs/current/handoff.md`
5. `.agents/docs/work/hardening/issues/explorer-data-plane/index.md`
6. `.agents/docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/04-parallel-agent-dispatch-index.md`
7. This file
8. The assigned issue and source spec links listed under that agent

## Universal Worker Rules

- Use TDD for behavior changes: add or extend a focused failing test, confirm
  it fails for the intended reason, then implement the minimal fix.
- Do not relax `test/unit/performance/stress.test.ts` or
  `test/component/viewTableStress.test.ts` thresholds inside functional
  slices.
- Do not push, merge, force-push, or rewrite history.
- Do not edit another worker's owned files unless the dispatch index explicitly
  allows it. If ownership is wrong or insufficient, stop and report.
- Do not touch `sandbox` changes. Treat `claude/explorer` as the only base.
- If a Svelte component or `.svelte.ts` module is changed, run the Svelte
  autofixer and `pnpm run check`.
- Keep docs detailed in source records; keep `current/status.md` and
  `current/handoff.md` compact.
- End each worker branch with a local commit after verification.

## Required Worker Handoff

Each worker final response must include:

- Branch and worktree path.
- Commit hash.
- Files changed.
- Focused tests run, with pass/fail counts.
- Static/build gates run.
- Any residual risks or blocked follow-ups.
- Confirmation that no unrelated `sandbox` changes were touched.

Each worker updates:

- The assigned local issue with status, acceptance checklist, and verification.
- `.agents/docs/current/status.md` and `.agents/docs/current/handoff.md` with a
  compact route note only.

## Wave 2 - Agent D - EDP-005 Data-Plane Perf Gate

Status: next unlocked slice. This wave is intentionally single-worker; do not
parallelize EDP-006 before D lands.

Worktree and branch:

```powershell
git worktree add .claude\worktrees\edp-005-perf -b codex/edp-005-perf claude/explorer
```

Owns:

- `.agents/docs/work/hardening/issues/explorer-data-plane/005-files-data-plane-performance-gate.md`
- Performance evidence records under `.agents/docs/work/hardening/research/`
  or the active Explorer data-plane plan folder.
- `src/dev/perfProbe.ts` only if new probe labels or counters are needed.
- Focused perf harnesses or tests that measure the Files data-plane path.
- Existing focused tests needed to prove queue/filter-only changes avoid
  structural rebuilds.

Must not touch:

- Tags/Props adapters.
- Overlay projection extraction.
- Row adapter migrations.
- Performance thresholds in `stress.test.ts` or `viewTableStress.test.ts`.

Required evidence:

- Snapshot creation cost.
- Lookup map creation cost.
- Layer batching cost.
- Reveal lookup cost.
- Total Files panel refresh cost.
- Before/after record for queue/filter-only changes versus structural rebuilds.

Suggested verification:

```powershell
pnpm run test:unit -- test/unit/components/explorerFiles.test.ts test/unit/services/serviceViews.test.ts test/unit/services/serviceExplorerDataPlane.test.ts
pnpm run test:component -- test/component/panelExplorerSelection.test.ts test/component/viewTreeScrollFallback.test.ts
pnpm run lint:full
pnpm run check
pnpm run build:plugin
git diff --check
```

Unlocks: Wave 3.

## Wave 3 - Tags/Props Snapshot Adapters

Starts only after Agent D is integrated into `claude/explorer`.

Run a short coordinator first if shared type or helper ownership is still
ambiguous. After the coordinator lands, E1 and E2 may work in parallel.

### Agent E0 - EDP-006 Shared Contract Coordinator

Worktree and branch:

```powershell
git worktree add .claude\worktrees\edp-006-contract -b codex/edp-006-contract claude/explorer
```

Owns:

- `src/types/typeExplorerDataPlane.ts`
- `src/logic/logicExplorerSnapshot.ts`
- shared snapshot adapter helpers, if needed
- contract tests shared by Tags and Props

Must not:

- Implement Tags provider migration.
- Implement Props provider migration.
- Change panel/view behavior.

Done when E1 and E2 can implement without both editing shared data-plane
contracts.

### Agent E1 - EDP-006 Tags Snapshot Adapter

Worktree and branch:

```powershell
git worktree add .claude\worktrees\edp-006-tags -b codex/edp-006-tags claude/explorer
```

Owns:

- `src/providers/explorerTags.ts`
- `src/components/containers/explorerTags.ts`
- `test/unit/components/explorerTags.test.ts`
- new Tags snapshot tests

Must not touch:

- `src/providers/explorerProps.ts`
- `src/components/containers/explorerProps.ts`
- shared data-plane contracts unless E0 has not run and the agent stops first.

Done when Tags snapshots cover ids, parent links, visible order, search mode,
sorting, casing behavior, and existing filter/queue/context actions.

### Agent E2 - EDP-006 Props Snapshot Adapter

Worktree and branch:

```powershell
git worktree add .claude\worktrees\edp-006-props -b codex/edp-006-props claude/explorer
```

Owns:

- `src/providers/explorerProps.ts`
- `src/components/containers/explorerProps.ts`
- `test/unit/components/explorerProps.test.ts`
- new Props snapshot tests

Must not touch:

- `src/providers/explorerTags.ts`
- `src/components/containers/explorerTags.ts`
- shared data-plane contracts unless E0 has not run and the agent stops first.

Done when Props snapshots cover ids, parent links, visible order, property/value
scope, object values, value removal, and existing FnR/queue/context actions.

Wave 3 merge rule: integrate E1 and E2 only after both focused suites pass
against the same E0 base.

## Wave 4 - Agent F - EDP-008 Overlay Projection

Starts after EDP-006 Tags and Props both land.

Worktree and branch:

```powershell
git worktree add .claude\worktrees\edp-008-overlay -b codex/edp-008-overlay claude/explorer
```

Owns:

- new overlay projection module, preferably under `src/services/`
- `src/badges/serviceBadge.ts`
- `src/services/badgeRegistry.ts`
- `src/services/serviceQueuePresentation.ts`
- `src/components/containers/explorerActiveFilters.svelte` or related active
  filter presentation only if wiring is required
- focused overlay, badge, queue popup, and active-filter tests

Must not touch:

- Tags/Props snapshot adapter internals except for consuming their public row
  contract.
- Row adapter migrations.
- Selection mirror cleanup.

Done when queue/filter projection is pure, tested outside Svelte components,
and still outputs the `ViewLayers` vocabulary used by existing badge logic.

## Wave 5 - Adapter Row Contract

Starts after EDP-008 lands.

Run a coordinator first, then split if the row input contract is stable.

### Agent G0 - Row Contract Coordinator

Worktree and branch:

```powershell
git worktree add .claude\worktrees\edp-009-row-contract -b codex/edp-009-row-contract claude/explorer
```

Owns shared row-input types/helpers and a short source-record decision. Must
not migrate view components.

### Agent G1 - Tree/Grid Row Contract

Worktree and branch:

```powershell
git worktree add .claude\worktrees\edp-009-tree-grid -b codex/edp-009-tree-grid claude/explorer
```

Owns:

- `src/components/views/viewTree.svelte`
- `src/components/views/ViewNodeGrid.svelte`
- `src/components/layout/GridNavigationToolbar.svelte`
- tree/grid component tests

Must not touch table/cards/SVAR unless G0 changes the ownership.

### Agent G2 - Table/Cards Row Contract

Worktree and branch:

```powershell
git worktree add .claude\worktrees\edp-009-table-cards -b codex/edp-009-table-cards claude/explorer
```

Owns:

- `src/components/views/ViewNodeTable.svelte`
- `src/components/views/ViewNodeCards.svelte`
- `src/services/serviceViewTableAdapter.ts`
- table/cards component and adapter tests

Must preserve existing Polish table/card behavior.

### Agent G3 - SVAR Compatibility Bridge

Only dispatch if G0 decides SVAR needs separate work.

Worktree and branch:

```powershell
git worktree add .claude\worktrees\edp-009-svar -b codex/edp-009-svar claude/explorer
```

Owns:

- `src/components/views/ViewSvarFileManager.svelte`
- SVAR compatibility tests

Must keep SVAR as a compatibility adapter, not a new data-plane authority.

## Wave 6 - Agent H - EDP-010 Selection Mirror Cleanup

Starts after all EDP-009 adapter slices land.

Worktree and branch:

```powershell
git worktree add .claude\worktrees\edp-010-selection-cleanup -b codex/edp-010-selection-cleanup claude/explorer
```

Owns:

- `src/services/serviceViews.svelte.ts`
- `src/services/serviceSelection.svelte.ts`
- `src/types/typeSelection.ts`
- selection compatibility tests
- adapter compatibility tests touched by the cleanup

Must not remove legacy layer output needed by remaining adapters. Done when
tests prove no divergence from `NodeSelectionService`.

## Final Stabilization Agent

Starts after all intended EDP functional slices land.

Worktree and branch:

```powershell
git worktree add .claude\worktrees\edp-final-stabilization -b codex/edp-final-stabilization claude/explorer
```

Owns full-suite verification, performance residual diagnosis, and live Obsidian
smoke against `plugin-dev`. This is the only slice allowed to decide what to do
with the known full-suite performance threshold residuals, and it still must
not weaken thresholds without a documented decision.
