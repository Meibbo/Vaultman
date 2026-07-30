---
title: Backlog cut 4 - serviceViewSize and stable node sizing
type: implementation-record
status: done
created: 2026-05-08T04:40:56
updated: 2026-05-08T09:40:11
parent: "[[docs/work/hardening/backlog/2026-05-08-backlog-cut-2/index|backlog cut 2]]"
tags:
  - agent/work
  - vaultman/backlog
created_by: codex
updated_by: codex
---


# Backlog cut 4 - serviceViewSize and stable node sizing

## Trigger

Cut 2 left a named follow-up because tree/grid nodes with icons and nodes without icons still adapted to content. This made the visual boxes feel uneven and left grid sizing values scattered through `ViewNodeGrid.svelte` and SCSS.

## Acceptance

- Tree and grid node boxes use stable view-mode sizing.
- Nodes without icons reserve the same icon slot as nodes with icons.
- Grid size presets are centralized in `serviceViewSize`.
- Initial presets imitate File Explorer-style icon-size steps:
  `small`, `medium`, `large`, and `extra-large`.
- The service returns tile width, tile height, icon size, label line clamp, gap, and tree slot values.
- User-facing control remains deferred until the service and adapter surface are stable.

## Implementation

- Added `src/services/serviceViewSize.ts`:
  - `VIEW_SIZE_PRESET_IDS`
  - `DEFAULT_VIEW_SIZE_PRESET`
  - `getViewSizePreset`
  - `viewSizeCssVars`
- Presets:
  - `small`: tile `96x64`, icon `16`, label lines `1`, gap `8`, tree row `28`.
  - `medium`: tile `128x72`, icon `24`, label lines `1`, gap `8`, tree row `28`.
  - `large`: tile `168x96`, icon `32`, label lines `2`, gap `10`, tree row `32`.
  - `extra-large`: tile `224x132`, icon `48`, label lines `2`, gap `12`, tree row `36`.
- `ViewNodeGrid.svelte` now consumes `serviceViewSize` instead of hard-coded tile width/height/gap constants.
- `ViewNodeGrid.svelte` applies the preset as CSS custom properties on the grid root and uses those values for column count, virtual row estimates, inline hierarchy row heights, and panel padding.
- Grid nodes now always render an icon slot:
  - `.vm-node-grid-icon` when an icon exists.
  - `.vm-node-grid-icon-placeholder` when no icon exists.
- `viewTree.svelte` now consumes the same preset service for tree row, icon, and toggle sizing variables.
- Tree rows now always render an icon slot:
  - `.vm-tree-icon` when an icon exists.
  - `.vm-tree-icon-placeholder` when no icon exists.
- `_grid.scss` now reads grid tile dimensions, icon size, label line clamp, and gap from CSS custom properties. Hover badges are positioned inside the stable tile rather than adding grid rows that can resize the tile.
- `_tree.scss` now gives icon, placeholder, and toggle slots stable dimensions from CSS custom properties.
- `styles.css` regenerated through `pnpm run build`.

## Tests Added

- `test/unit/services/serviceViewSize.test.ts`
  - verifies the ordered preset ids;
  - verifies preset tile widths, icon sizes, label clamp, and gap values;
  - verifies unknown ids fall back to the default preset;
  - verifies CSS custom property serialization.
- `test/component/viewGridSelection.test.ts`
  - verifies no-icon grid nodes render `.vm-node-grid-icon-placeholder`;
  - verifies the grid root exposes default preset CSS variables.
- `test/component/viewTreeSelection.test.ts`
  - verifies no-icon tree rows render `.vm-tree-icon-placeholder`;
  - verifies the tree root exposes default preset CSS variables.

## Verification

Red checks:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceViewSize.test.ts` failed before `src/services/serviceViewSize.ts` existed.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewGridSelection.test.ts test/component/viewTreeSelection.test.ts --fileParallelism=false` failed on the expected missing placeholder assertions.

Green checks:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceViewSize.test.ts` passed with 3 tests.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewGridSelection.test.ts test/component/viewTreeSelection.test.ts --fileParallelism=false` passed with 31 tests.
- Svelte autofixer reported no issues for:
  - `src/components/views/ViewNodeGrid.svelte`
  - `src/components/views/viewTree.svelte`
- `pnpm run check` passed with `svelte-check found 0 errors and 0 warnings`.
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceViewSize.test.ts test/unit/services/serviceMouse.test.ts --fileParallelism=false` passed with 11 tests.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts test/component/viewGridSelection.test.ts test/component/viewTableSelection.test.ts test/component/panelExplorerSelection.test.ts --fileParallelism=false` passed with 68 tests.
- `pnpm run lint` passed with 0 warnings and 0 errors.
- `pnpm run build` passed. Build output:
  - `dist/vite/styles.css` 111.25 kB, gzip 15.97 kB.
  - `dist/vite/main.js` 483.09 kB, gzip 142.27 kB.
- Scoped `git diff --check` passed for cut 4 product, test, and generated CSS files. Git emitted only CRLF normalization warnings.

## Pending Cut Ladder

This ladder expands the immediate 2026-05-08 cut chain with the older v1 scope audit and regression backlog. Early cuts are implementation-ready. Later cuts are holding cuts that still need a focused spec before implementation.

- Cut 5 - DONE:
  [[docs/work/hardening/backlog/2026-05-08-backlog-cut-5-badge-message/index|generic badge module and `serviceMessage`]].
  - Create a deep badge module for normal badges, hover badges, and FAB badges.
  - Centralize badge kind vocabulary, labels, icons, ordering, hover visibility, count-badge descriptors, and contradiction detection.
  - Add `serviceMessage` as the single user/system message surface for warnings, errors, info, and success messages.
  - Do not migrate concrete data providers in this cut.
- Cut 6 - Provider/API module migration.
  - Move concrete data providers out of `src/components/containers/` into a provider folder such as `src/providers/`.
  - Keep stable provider interfaces in `src/api/`.
  - Preserve current behavior while changing module location and imports.
- Cut 7 - Multi-selected badge operations plus contradiction warning popup.
- Cut 8 - Filter ingestion from selection box, props, and tags.
- Cut 9 - `tabContent` reactive search progress plus incremental result rendering.
- Cut 10 - User-facing view-size control in the view menu after the preset service and adapter behavior remain stable in use.
- Cut 11 - Cursor affordance and cheap hover pass.
  - Source:
    [[docs/work/hardening/backlog/regressions/cursor-affordance-policy|cursor affordance policy]].
  - Start with SCSS-only cursor and hover changes on broad rows, tiles, cards, file rows, and filter/list rows.
- Cut 12 - Explorer search, external refresh, hierarchy, and keyboard verification.
  - Source:
    [[docs/work/hardening/backlog/2026-05-07-v1-scope-audit/01-release-blocking-v1|release-blocking v1 scope]].
  - Verify search parent preservation, visible tree refresh after external index changes, nested Files hierarchy, and remaining Up/Down plus modifier selection behavior before fixing only reproduced gaps.
- Cut 13 - Queue correctness and visible queue UI audit.
  - Sources:
    [[docs/work/hardening/backlog/regressions/queue-audit|queue audit]] and [[docs/work/hardening/backlog/regressions/operations-suite-live-handoff|operations suite live handoff]].
  - Reconcile logical counts, touched-file counts, grouping, individual remove, and any remaining direct-mutation paths.
- Cut 14 - File/grid operations parity.
  - Sources:
    [[docs/work/hardening/backlog/regressions/file-ops|file ops regression]] and [[docs/work/hardening/backlog/regressions/grid-view|grid view regression]].
  - Cover selected-only isolation, name/folder search axes, select-all variants, indeterminate master state, and column sort shortcuts.
- Cut 15 - Active filter highlighting and badge bubbling verification.
  - Source:
    [[docs/work/hardening/backlog/regressions/visuals-highlight-bubbling|visuals highlight and bubbling]].
  - Confirm current provider decoration behavior, then fix active filter id injection or collapsed child badge bubbling only where still missing.
- Cut 16 - Inline/in-frame rename decision and implementation.
  - Source:
    [[docs/work/hardening/backlog/2026-05-07-v1-scope-audit/01-release-blocking-v1|blocking UX scope]].
  - Decide whether remaining rename modals are acceptable or should route into the navbar/FnR/in-frame handoff.
- Cut 17 - Menu/popup overlay behavior.
  - Source:
    [[docs/work/hardening/backlog/2026-05-07-v1-scope-audit/01-release-blocking-v1|blocking UX scope]].
  - Fix menus/popups that push the explorer downward instead of overlaying it.
- Cut 18 - Performance verification cut.
  - Source:
    [[docs/work/hardening/backlog/2026-05-07-v1-scope-audit/01-release-blocking-v1|performance and perceived responsiveness]].
  - Instrument frame page rendering, prop/tag date sorting, and large `viewDiff` preview memory before deciding whether to change code.
- Cut 19 - Bases feature parity filters.
  - Source:
    [[docs/work/hardening/backlog/2026-05-07-v1-scope-audit/02-v1-polish-scope|v1 polish scope]].
  - Range filters, all-files-in-folder behavior, logical all/any/none groups, manual filter syntax, and row group auto/manual toggles.
- Cut 20 - Editable file matrix/table density.
  - Source:
    [[docs/work/hardening/backlog/2026-05-07-v1-scope-audit/02-v1-polish-scope|v1 polish scope]].
  - Editable table/matrix view, markdown rendering, property columns, and density controls.
- Cut 21 - Theme variants.
  - Source:
    [[docs/work/hardening/backlog/2026-05-07-v1-scope-audit/02-v1-polish-scope|v1 polish scope]].
  - Minimal variant and frozen default fancy variant.
- Cut 22 - Navbar/workspace UX polish.
  - Sources:
    [[docs/work/hardening/backlog/regressions/navbar|navbar regression]] and [[docs/work/hardening/backlog/2026-05-07-v1-scope-audit/02-v1-polish-scope|v1 polish scope]].

Continua en [[docs/work/hardening/backlog/2026-05-08-backlog-cut-4-view-size/index-shard-1|continuacion 1]].