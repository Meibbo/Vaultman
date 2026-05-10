---
title: serviceDnd semantic foundation
type: implementation-result
status: done
parent: "[[docs/work/polish/index|polish]]"
created: 2026-05-10T04:55:20
updated: 2026-05-10T06:58:00
tags:
  - agent/result
  - initiative/polish
  - explorer/views
  - dnd
created_by: codex
updated_by: codex
---

# serviceDnd Semantic Foundation

First DnD slice for Vaultman after the Pretext/cards follow-up.

## Scope

This slice implements a local semantic DnD service. It deliberately does not
turn the `dnd` view mode back on and does not bind a Svelte DnD library into
tree/grid/cards/table surfaces yet.

The goal is a stable service boundary that future view adapters can consume:

- drag source identity;
- selected/dragging id set;
- candidate drop target;
- drop position: `before`, `inside`, `after`;
- semantic operation: `reorder`, `move`, `apply-template`;
- allow/reject reason;
- view state projection tokens: `dragging` and `dropTarget`;
- final drop result that adapters can hand to provider/domain operations.

## Implementation

- Added `src/services/serviceDnd.ts`.
- Added `src/services/serviceDndSvelteAdapter.ts`.
- Added `test/unit/services/serviceDnd.test.ts`.
- Added `test/unit/services/serviceDndSvelteAdapter.test.ts`.
- `DndService.beginDrag(...)` normalizes the source id plus selected ids into a
  stable dragging id list.
- `DndService.updateTarget(...)` resolves the candidate operation without
  knowing DOM or library details.
- Same-explorer, same-kind `before`/`after` drops default to `reorder`.
- Explicit `target.accepts` enables cross-kind operations such as dropping a
  node `inside` a group with `move`.
- Self-drops, disabled targets, missing drag sources, and incompatible targets
  are rejected with explicit reasons.
- Snapshots and drop results clone arrays/targets so callers cannot mutate
  internal service state.
- Follow-up adapter:
  [[docs/work/polish/plans/2026-05-10-service-dnd-foundation/02-svelte-adapter|serviceDnd Svelte adapter result]]
  maps `@thisux/sveltednd` callbacks into this semantic service.
- Manual grid continuation:
  [[docs/work/polish/plans/2026-05-10-service-dnd-foundation/03-manual-grid-dnd|manual grid DnD continuation]]
  adds the opt-in sort-menu toggle, native grid tile dragging, local sibling
  reorder, and workspace Markdown/JSON drag payloads.

## Verification

RED:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts`
  failed first because `src/services/serviceDnd` did not exist.
- After the first implementation, the same command passed: 1 file / 5 tests.
- A second RED cycle failed on missing `dnd.stateFor(...)`.

GREEN:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts`
  passed: 1 file / 7 tests.
- `pnpm run check` passed with 0 errors / 0 warnings.
- `pnpm run lint` passed with 0 warnings / 0 errors.
- `pnpm run build` passed and synced build artifacts.
- `git diff --check -- package.json manifest.json versions.json src/services/serviceDnd.ts test/unit/services/serviceDnd.test.ts`
  exited 0.

Adapter verification:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts`
  passed: 2 files / 12 tests.
- `pnpm exec eslint --no-warn-ignored src/services/serviceDnd.ts src/services/serviceDndSvelteAdapter.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts`
  exited 0.
- `git diff --check` for the DnD service and adapter files exited 0.
- Broad `pnpm run check` is currently blocked by an unrelated dirty
  `ViewSvarFileManager.svelte` type error around optional `provider.subscribe`.

## Release Metadata

The branch now contains `1.0.0-rc.2` in:

- `package.json`;
- `manifest.json`;
- `versions.json`.

`versions.json` maps `1.0.0-rc.2` to Obsidian min app version `1.12.0`.

## Remaining DnD Work

- Wire view components to `serviceDnd` state projection.
- Re-enable a visible DnD mode only when the route has actual behavior.
- Add provider/domain drop handlers for reorder, move, template application,
  logical filter groups, and workspace/tab targets.
- Add Obsidian smoke coverage once a real interactive surface exists.
- Persist manual grid reorder beyond the local panel state once the domain
  storage contract is selected.
