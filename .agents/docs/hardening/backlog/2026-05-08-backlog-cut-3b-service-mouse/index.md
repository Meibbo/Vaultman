---
title: Backlog cut 3b - serviceMouse gesture routing
type: implementation-record
status: done
created: 2026-05-08T03:56:04
updated: 2026-05-08T04:09:11
parent: "[[docs/work/hardening/backlog/2026-05-08-backlog-cut-3/index|backlog cut 3]]"
tags:
  - agent/work
  - vaultman/backlog
created_by: codex
updated_by: codex
---

# Backlog cut 3b - serviceMouse gesture routing

## Trigger

The user stopped the previous chevron-specific cut after manual testing showed
that click zones were still inconsistent across the whole node surface:

- node double click should work from the full node surface;
- node double click must not trigger from the chevron area;
- node double click must not trigger from badge areas;
- FAB double click must only fire when two clicks are inside the fast
  double-click window;
- `primary`, `secondary`, and `tertiary` gestures must be generic because they
  will be remapped from configuration;
- `tertiary` must be able to use the mouse middle button as well as the
  existing modifier click.

The earlier cut 3 SVG chevron patch remains a valid symptom fix, but it was not
the right architectural boundary. This follow-up moves the click grammar into
`serviceMouse`.

## Implementation

- Added `src/services/serviceMouse.ts`.
- Removed the old `src/utils/useDoubleClick.ts` helper.
- `serviceMouse` now owns:
  - `primary`, `secondary`, and `tertiary` gesture resolution;
  - configurable gesture bindings;
  - configurable double-click threshold, defaulting to 250 ms;
  - target-key isolation so two different controls cannot combine into one
    secondary gesture;
  - immediate-primary mode for node selection;
  - deferred-primary mode for FAB and toolbar controls, so a quick secondary
    gesture preempts popup/open actions;
  - `Alt+click` tertiary;
  - `auxclick` / middle-button tertiary;
  - node control-zone exclusion via `NODE_MOUSE_IGNORE_SELECTOR`.
- Added `mouseGestures?: Partial<Record<'node' | 'fab' | 'toolbar',
  MouseGestureConfig>>` to `VaultmanSettings` with defaults for node, FAB, and
  toolbar surfaces.
- Routed FABs in `navbarPillFab.svelte` through `serviceMouse`.
- Routed view/sort compact controls in `navbarExplorer.svelte` through
  `serviceMouse`.
- Routed tree, grid, and table node clicks through `serviceMouse`.
- Routed node tertiary action through `panelExplorer.svelte` for both
  `Alt+click` and middle click.
- Removed native `ondblclick` paths from node views; secondary is now resolved
  from click timing by `serviceMouse`.

## Behavioral Contract

- Node primary selection is immediate.
- A second click on the same node inside the configured double-click window
  triggers secondary action and does not run a second primary selection.
- Slow repeated node clicks are separate primary clicks.
- FAB and toolbar primary actions are deferred while a secondary gesture is
  possible.
- Slow repeated FAB/toolbar clicks run separate primary actions.
- Chevron and badge areas are ignored by node gesture routing.
- Middle mouse button triggers tertiary when the active config includes
  `middle-click`.
- Config can remove `middle-click` from tertiary without changing component
  code.

## Focused Verification

- Red unit test first:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceMouse.test.ts`
  failed before `serviceMouse` existed.
- Green unit:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceMouse.test.ts`
  passed with 8 tests.
- Red component coverage added for:
  - node surface double click;
  - node middle-click tertiary;
  - grid/table parity;
  - FAB middle-click tertiary;
  - toolbar middle-click tertiary;
  - config removing middle-click from tertiary.
- Green focused component suite:
  `pnpm exec vp test run --project component --config vitest.config.ts test/component/navbarPillDoubleClickClear.test.ts test/component/navbarQueueDoubleClickClear.test.ts test/component/navbarExplorerClickWeights.test.ts test/component/viewTreeSelection.test.ts test/component/viewGridSelection.test.ts test/component/viewTableSelection.test.ts test/component/panelExplorerSelection.test.ts --fileParallelism=false`
  passed with 7 files and 81 tests.
- Final focused rerun after all code edits:
  - `serviceMouse.test.ts`: 1 file, 8 tests passed.
  - component suite above: 7 files, 81 tests passed.

## Broad Verification

- `pnpm run check`: `svelte-check found 0 errors and 0 warnings`.
- `pnpm run lint`: `vp lint` and ESLint found 0 warnings and 0 errors.
- `pnpm run build`: passed; Vite build produced
  `dist/vite/styles.css` 110.11 kB and `dist/vite/main.js` 481.56 kB.
- Scoped `git diff --check` for touched product/test/doc files exited 0
  with only CRLF conversion warnings.
- Obsidian CLI smoke:
  - cleared `dev:errors` and error console;
  - reloaded `vaultman`;
  - executed `vaultman:open`;
  - dispatched two real click events on a tree row and observed
    `aria-selected="true"`;
  - dispatched two real click events on a chevron and observed the row stayed
    unselected;
  - final `dev:errors` reported `No errors captured.`;
  - final `dev:console level=error` reported `No console messages captured.`

## Remaining Cuts

- Cut 4 remains the next named backlog cut:
  `serviceViewSize` / uniform node sizing.
- Residual uncut backlog remains:
  - multi-selected badge operations plus contradiction warning popup;
  - filter ingestion from selection box, props, and tags;
  - `tabContent` reactive search progress plus incremental result rendering.
