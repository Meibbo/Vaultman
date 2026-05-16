---
title: Current handoff
type: agent-handoff
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
archive_source: "docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-handoff.md"
created: 2026-05-04T01:36:20
updated: 2026-05-16T03:52:00
tags:
  - agent/current
created_by: dec
updated_by: codex
---

# Current Handoff

Compact handoff after archiving the oversized current handoff:
[[docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-handoff|2026-05-11 handoff archive]].
Older route history remains in
[[docs/archive/pkm-ai/active-docs/2026-05-10T093000-current-handoff|2026-05-10 handoff archive]].

## Resume Point

- Worktree:
  `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\jovial-wilson-f81c67`
- Branch: `claude/explorer`.
- Active route: implement the Explorer View Platform pass from the accepted
  spec/plan, with feedback loops first and no subagents unless the user asks.
- Read first:
  - `AGENTS.md`
  - `.agents/docs/current/status.md`
  - `.agents/docs/current/handoff.md`
  - `.agents/docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/index.md`
  - `.agents/docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index.md`
  - `.agents/docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/04-tree-visual-contract-recovery.md`
- Tasks 1-12 are implemented and committed:
  - `883cb0a` synthetic dataset harness.
  - `c813daf` perfProbe scenario contract.
  - `1372853` synthetic scale characterization.
  - `75d0af8` explorer projection contract.
  - `7f6dcb8` view feature contract.
  - `b83c47c` node media field toggle.
  - `abe6766` scroll geometry coordinator.
  - `89861aa` batched decoration layer builder.
  - `40505ac` media descriptor hidden-cost path.
  - `a79f905` tree visual contract recovery.
- `9df9e50` (`plans: theme wiring for future theme builder`) is also in the
  branch history and was not part of this Explorer platform slice.
- Current dirty files not owned by this Explorer platform work include
  `.gitignore`, `README.md`, `manifest.json`, `package.json`, eslint
  rule/script paths, and many deleted docs. Preserve them unless explicitly
  asked. Current owned dirty files are only current docs/plan updates.

## What Changed In This Slice

- `test/support/explorerSyntheticDataset.ts` now builds deterministic
  10K/50K/100K Explorer datasets with stable ids, row inputs, direct maps,
  selected/filter sets, and descriptor-only media records.
- `src/dev/perfProbe.ts` now exposes `PERF_SCENARIO_NAMES`, Explorer platform
  scenario dispatch, duration timings, and optional jank/heap snapshot fields.
- `src/services/serviceExplorerProjection.ts` creates projection rows,
  `visibleIds`, `idToIndex`, `indexToId`, and descriptor-only `mediaById`.
- `src/services/serviceExplorerViewContract.ts` registers selectable platform
  modes `tree`, `list`, `table`, `grid`, and `cards`; Map/Markmap remains out.
- `src/services/serviceNodeFieldVisibility.ts` adds the `media` node field,
  default off for all views/providers.
- `src/components/layout/overlays/overlayViewMenu.svelte` shows granular
  node-element pills only outside the native preset and exposes
  `data-node-field`.
- `src/services/serviceExplorerScrollGeometry.ts` adds fixed-row scroll target
  resolution, priority coalescing, manual-scroll cancellation, revision guard,
  and a variable-geometry interface for table/grid/cards estimates.
- `src/services/serviceExplorerLayers.ts` adds `createExplorerLayerBuilder`,
  which accepts an Explorer projection, builds one `ViewService` model per
  revision key, returns `layersById` and `actionsById`, reuses cached batches,
  and measures `explorer.layers.build` with `{ nodes }`.
- `test/unit/services/serviceExplorerLayersBatch.test.ts` covers projection
  input, node-id keyed badge/filter/action output, same-revision cache reuse,
  and `perfProbe` timing.
- `src/services/serviceExplorerProjection.ts` now projects descriptor-only
  media records, preserving status, media key, dimensions, and revision while
  stripping blob fields from projection rows and `mediaById`.
- `src/services/serviceExplorerMediaCache.ts` adds
  `loadVisibleDescriptorBlobs`, which returns blobs keyed by node id, does no
  storage work while `mediaVisible` is false, and reads only descriptors for
  the supplied visible ids.
- `test/unit/services/serviceExplorerMediaDescriptor.test.ts` covers
  descriptor-only projection, hidden-media zero blob requests, and visible-only
  blob loading.
- `viewTree.svelte` and `ViewNodeList.svelte` now route low-risk id-to-index
  reveal/focus scrolling through the new coordinator. This is not the full
  `viewTree` platform migration.
- `a79f905` adds tree visual contract tests, restores box selection against
  rendered row geometry, hides markdown file extensions, right-aligns non-md
  extensions, and composes selected+filtered styling with selected grey plus an
  accent marker.

## Verification

- Task 8 RED:
  `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceExplorerLayersBatch.test.ts --fileParallelism=false`
  failed first because `createExplorerLayerBuilder` was not exported.
- Task 8 GREEN/focused gate:
  `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceExplorerLayers.test.ts test/unit/services/serviceExplorerLayersBatch.test.ts test/unit/dev/perfProbe.test.ts --fileParallelism=false`
  passed: 3 files / 11 tests.
- Task 9 RED:
  `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceExplorerMediaDescriptor.test.ts --fileParallelism=false`
  failed first on missing descriptor revision and missing
  `loadVisibleDescriptorBlobs`.
- Task 9 GREEN/focused gate:
  `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceExplorerMediaDescriptor.test.ts test/unit/services/serviceExplorerMediaCache.test.ts test/unit/services/serviceExplorerProjection.test.ts test/unit/performance/explorerPlatformSynthetic.test.ts --fileParallelism=false`
  passed: 4 files / 15 tests.
- Task 10 RED baseline:
  `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewTreeVisualContract.test.ts test/component/viewTreeSelection.test.ts --fileParallelism=false`
  failed as expected: 1 failed / 1 passed files, 3 failed / 20 passed tests.
  Failing contracts: hide markdown `ext`, right-align the extension field zone,
  and keep selected+filtered rows on the selected grey base with the accent
  filter marker.
- Task 11 RED/GREEN:
  `pnpm exec vitest run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts --fileParallelism=false`
  failed first on fixed-index box geometry selecting `alpha`, then passed with
  rendered-row geometry: 1 file / 20 tests. `pnpm check` passed with 0 errors /
  0 warnings. Svelte autofixer on `viewTree.svelte`: `issues: []`.
- Task 12 GREEN:
  component Task 10+11 command passed: 2 files / 24 tests; field/style unit
  command passed: 2 files / 10 tests; `pnpm check` passed; `pnpm exec tsc
  -noEmit -skipLibCheck` passed. Full `git diff --check` is blocked by
  unrelated `.gitignore:69`; slice-limited diff check passed.
- Latest type/hygiene verification:
  `pnpm exec tsc -noEmit -skipLibCheck` passed; `git diff --check` passed.
- Earlier Tasks 1-7 focused gates passed, including latest Task 7
  `pnpm check` with 0 errors / 0 warnings.
- Svelte autofixer:
  - `overlayViewMenu.svelte`: `issues: []`.
  - `ViewNodeList.svelte`: no issues; suggestions only about existing
    `$effect`/action patterns.

## Preserve

- Do not use or merge from the root `sandbox` worktree.
- Do not reintroduce direct VFS mutation: no `vfs.fm =`, `vfs.body =`,
  `vfs.ops.push`, or direct `op.apply(vfs)` mutation paths.
- `OperationQueueService.transactions` remains as the compatibility read
  surface until current readers migrate to immutable `chains`.
- EDP-010 makes `NodeSelectionService` the selection/focus authority; legacy
  `ViewService` selection mutators are compatibility delegates only.
- Obsidian CLI runtime tests and live smokes must pass `vault=plugin-dev`.
- Obsidian CLI calls should be run sequentially.
- Keep Map/ViewNodeMap deferred. Do not expose Map as a selectable next-release
  view and do not patch it opportunistically.
- Keep media/image disabled by default in every view. Visibility is a view-menu
  `btnMultiSelection` node-element toggle outside the native Obsidian preset.

## Next Action

- Continue with Task 13: Tree Projection Adapter in
  `.agents/docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/05-viewtree-platform-migration.md`.
- TDD order:
  1. Add adapter contract tests.
  2. Implement the minimal tree projection adapter path.
  3. Run focused tree/platform tests.
  4. Commit only owned files.

## Prompt For Next Agent

```text
Estamos en Vaultman.

Worktree:
C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\jovial-wilson-f81c67

Rama canonical:
claude/explorer

Primero lee:
- AGENTS.md
- .agents/docs/current/status.md
- .agents/docs/current/handoff.md
- .agents/docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/index.md
- .agents/docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index.md
- .agents/docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/04-tree-visual-contract-recovery.md

Contexto:
- Tasks 1-9 del Explorer View Platform pass ya estan implementadas y
  commiteadas hasta `40505ac`.
- Tasks 1-12 estan commiteadas hasta `a79f905`.
- Siguiente task: Task 13, Tree Projection Adapter.
- No uses subagentes salvo que yo lo pida explicitamente.
- No reviertas cambios ajenos. El working tree tiene cambios no propios en
  CONTRIBUTING.md, README.md, manifest.json y package.json.
- Usa TDD: test fallando, implementacion minima, verificacion.
- Primero feedback loops/harness/probes; no empieces por remake visual.
- Antes de tocar Svelte, revisa patrones existentes y usa Svelte autofixer.
- Si algo del plan contradice el codigo real, deten, explica el conflicto y
  propone ajuste conservador.

Empieza ejecutando Task 13 desde:
.agents/docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/05-viewtree-platform-migration.md
```
