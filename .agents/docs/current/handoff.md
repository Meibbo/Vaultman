---
title: Current handoff
type: agent-handoff
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
archive_source: "docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-handoff.md"
created: 2026-05-04T01:36:20
updated: 2026-05-16T02:39:59.6920129-05:00
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
  - `.agents/docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/03-scroll-geometry-decoration-media.md`
- Tasks 1-7 are implemented and committed:
  - `883cb0a` synthetic dataset harness.
  - `c813daf` perfProbe scenario contract.
  - `1372853` synthetic scale characterization.
  - `75d0af8` explorer projection contract.
  - `7f6dcb8` view feature contract.
  - `b83c47c` node media field toggle.
  - `abe6766` scroll geometry coordinator.
- `9df9e50` (`plans: theme wiring for future theme builder`) is also in the
  branch history and was not part of this Explorer platform slice.
- Current dirty files not owned by this Explorer platform work:
  `README.md`, `manifest.json`, and `package.json`. Preserve them unless the
  user explicitly asks otherwise.

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
- `viewTree.svelte` and `ViewNodeList.svelte` now route low-risk id-to-index
  reveal/focus scrolling through the new coordinator. This is not the full
  `viewTree` platform migration.

## Verification

- Task 7 latest focused verification:
  `pnpm exec vitest run --project unit --project component --config vitest.config.ts test/unit/services/serviceExplorerScrollGeometry.test.ts test/component/viewTreeScrollFallback.test.ts test/component/ViewNodeList.test.ts --fileParallelism=false`
  passed: 3 files / 26 tests.
- Latest Svelte/type verification:
  `pnpm check` passed with 0 errors / 0 warnings.
- Earlier Tasks 1-6 focused gates passed. Most recent combined checkpoint for
  touched tests before Task 7: 8 test files / 44 tests.
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

- Continue with Task 8: Batched Decoration Layer in
  `.agents/docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/03-scroll-geometry-decoration-media.md`.
- Files for Task 8:
  - Modify: `src/services/serviceExplorerLayers.ts`
  - Create: `test/unit/services/serviceExplorerLayersBatch.test.ts`
- TDD order:
  1. Write failing batched layer tests.
  2. Implement a revision-keyed builder accepting a projection.
  3. Return badge/filter/action state keyed by node id.
  4. Reuse cached layers for repeated calls with the same revision.
  5. Instrument `perfProbe` timing `explorer.layers.build` with payload
     `{ nodes }`.
  6. Run focused unit tests, then commit:
     `feat: batch explorer decoration layers`.

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
- .agents/docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/03-scroll-geometry-decoration-media.md

Contexto:
- Tasks 1-7 del Explorer View Platform pass ya estan implementadas y
  commiteadas hasta `abe6766`.
- Siguiente task: Task 8, Batched Decoration Layer.
- No uses subagentes salvo que yo lo pida explicitamente.
- No reviertas cambios ajenos. El working tree tiene cambios no propios en
  README.md, manifest.json y package.json.
- Usa TDD: test fallando, implementacion minima, verificacion.
- Primero feedback loops/harness/probes; no empieces por remake visual.
- Antes de tocar Svelte, revisa patrones existentes y usa Svelte autofixer.
- Si algo del plan contradice el codigo real, deten, explica el conflicto y
  propone ajuste conservador.

Empieza ejecutando Task 8:
- Crear test/unit/services/serviceExplorerLayersBatch.test.ts con tests rojos.
- Modificar src/services/serviceExplorerLayers.ts.
- El builder debe aceptar una projection, devolver estado por node id, cachear
  por revision, evitar llamadas por fila desde render paths, e instrumentar
  perfProbe timing explorer.layers.build con payload { nodes }.
```
