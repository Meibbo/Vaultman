---
title: FnR toolbar island and crear button
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

# Phase 1 — FnR Toolbar Island And `crear` Button

> Spec: [[docs/work/hardening/specs/2026-05-07-multifacet-2/01-fnr-island-templating|FnR island and templating]]

## Discrepancies Resolved 2026-05-07T03:30:00

- `_toolbar.scss` does NOT exist. Toolbar styles live in
  `src/styles/explorer/_explorer.scss`. Add takeover class there.
- `OperationQueueService.add(change)` takes a full `PendingChange`
  object (see `src/types/typeOps.ts`). It does NOT accept a string
  kind. The `crear` button MUST construct a `PendingChange` via the
  new `src/registry/explorerAddOps.ts` registry.
- `crear` button availability:
  - `tag` → enabled, builder produces an `ADD_TAG`-shape `PendingChange`.
  - `prop` → enabled, builder produces an `ADD_PROPERTY`-shape change.
  - `file`, `value`, `content` → registry returns `null`; button is
    rendered disabled with tooltip "no soportado por este explorer".
    File/value add semantics ship in a later phase.

## Phase Scope Reduction (1a)

Phase 1 ships in two sub-phases. Phase 1a (this shard) ships UI tasks
1+2+3+6+7. Tasks 4 (`tabContent` collapse) and 5 (view/sort
relocation) move to phase 1b shard, drafted later.

## Real Source Paths (post phase 1a discovery)

- Standalone FnR rename island: `src/components/layout/navbarExplorer.svelte`
  block `.vm-fnr-island.vm-fnr-rename` (~line 312). Searchbox lives in
  the same file.
- Three duplicate FnR inputs (`content` explorer): `src/components/pages/tabContent.svelte`
  (`vm-content-fnr-input vm-content-find` ~line 116, `vm-content-fnr-input` replace ~line 149,
  plus an options-row input in the third `vm-content-fnr-row`).
- `src/components/containers/explorerContent.ts` is a TS class, not a Svelte
  view. Do not touch the file structure of explorerContent.ts; UI changes
  for `content` happen in `tabContent.svelte`.
- `src/components/containers/panelExplorer.svelte` does NOT host the FnR
  island. Skip it for this phase.

## Tasks

- [x] Create `src/services/serviceFnRIsland.svelte.ts` with the rune
      state model from spec §State Model. Export typed
      `FnRIslandService` with `subscribe`, `setMode`, `setQuery`,
      `setFlag`, `expand`, `collapse`, `submit`.
- [x] In `src/components/layout/navbarExplorer.svelte`: remove the
      standalone `.vm-fnr-island.vm-fnr-rename` block; instead mount
      the FnR island INSIDE the existing searchbox row. Keep existing
      props (`onRenameConfirm`, `onRenameCancel`,
      `onRenameReplacementChange`, `fnrState`) and route them through
      `FnRIslandService` so the legacy parent contract still works.
- [x] Add a mode pill at the searchbox left (`search` / `rename` /
      `replace` / `add`). Bind to `FnRIslandService.mode`.
- [ ] Add a toolbar takeover: when `FnRIslandService.expanded`,
      apply class `vm-toolbar-takeover` on the toolbar root. Use
      opacity + pointer-events (NOT `display:none`) so TanStack
      virtualizer measure passes do not break.
- [ ] In `src/components/pages/tabContent.svelte`: collapse the
      three `.vm-content-fnr-input` rows into ONE searchbox + mode
      pill. Pill toggles between `search` and `replace`. Delete the
      separate replace input and the third options-row input. Keep
      scope toggle + queue-replace button.
- [ ] Move `view` and `sort` menus to the right side of the toolbar
      in `navbarExplorer.svelte`. Apply minimalist class. Update
      `src/styles/explorer/_toolbar.scss`.
- [x] Add `crear` button (lucide-plus + label) right of the
      searchbox, left of view/sort, in `navbarExplorer.svelte`.
      Wire to `FnRIslandService.submit()` with `mode = 'add'`. Submit
      must dispatch through `OperationQueueService` (e.g.
      `queue.add('ADD_<KIND>', { label: query })`) for the active
      explorer's node kind. If the active-explorer-kind→op-builder
      map does not exist, define a tiny one in
      `src/services/serviceFnRIsland.svelte.ts` injection or a new
      `src/registry/explorerAddOps.ts`. Done via `src/registry/explorerAddOps.ts`
      with `tag`/`prop` enabled and `file`/`value`/`content` returning `null`
      so the button renders disabled with a localized tooltip.
- [x] Wire `Esc` and outside-click to call
      `FnRIslandService.collapse()`. Esc handler lives on the
      searchbox-island root; outside-click via the existing pattern
      from `panelExplorer.svelte` (clear-on-outside-click block).

## Tests (TDD red→green)

- [x] `test/unit/services/serviceFnRIsland.test.ts` — rune state
      transitions, mode swap, expand/collapse, submit dispatch. 11/11
      passing 2026-05-07.
- [x] `test/component/searchboxIsland.test.ts` — pill swap,
      takeover class on expand, Esc collapses. 3/3 passing.
- [ ] `test/component/explorerContentSingleInput.test.ts` —
      content explorer renders exactly one input. (deferred to phase 1b
      with `tabContent.svelte` collapse work)
- [x] `test/component/panelExplorerCrear.test.ts` — `crear` queues
      one `ADD_*` op for the active explorer's node kind. 2/2 passing
      (tag enabled, content disabled).

## Verification

- [ ] `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceFnRIsland.test.ts`
- [ ] `pnpm exec vp test run --project component --config vitest.config.ts test/component/searchboxIsland.test.ts test/component/panelExplorerCrear.test.ts test/component/explorerContentSingleInput.test.ts --fileParallelism=false`
- [ ] `pnpm run check && pnpm run lint && pnpm run build`
- [ ] `git diff --check` scoped to touched files.

## Stop Conditions

- Stop if removing the duplicate `content` inputs breaks the existing
  search↔replace toggle. Migrate the toggle to the pill before
  deleting the inputs.
- Stop if takeover CSS interferes with TanStack virtualizer measure
  passes. Use a non-layout-affecting class (e.g. opacity + pointer-
  events) instead of `display:none`.
