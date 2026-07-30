---
title: Wave 1 Agent B Tree Row Layout Execution
type: agent-log
status: done
parent: "[[docs/work/polish/plans/2026-05-10-dock-toolbar-groups-virtualizer/index|Dock Toolbar Groups Virtualizer]]"
created: 2026-05-11T00:12:00
updated: 2026-05-11T00:12:00
tags:
  - agent/log
  - polish
  - vaultman/product
created_by: codex
updated_by: codex
---

# Wave 1 Agent B Tree Row Layout Execution

## Scope

Executed `ola 1 agente b` from [[docs/work/polish/plans/2026-05-10-dock-toolbar-groups-virtualizer/dispatch-shortcuts|Dock Toolbar Parallel Dispatch Shortcuts]].

Owned files touched:

- `src/components/views/viewTree.svelte`
- `src/styles/explorer/_virtual-list.scss`
- `test/component/viewTreeDecorations.test.ts`
- `test/unit/styles/treeAffordanceSpacing.test.ts`

No Settings/nav, DnD service/UI, Queue presentation, or Cut 4 files were changed.

## Implementation

- Added a narrow-row regression contract for tree rows that carry both a counter and operation badges.
- Split the row affordance model in `ViewTree`:
  - `has-count` marks rows and badge zones that need explicit counter reserve.
  - `has-overlay-badges` marks rows with direct, inherited, or hover badges.
  - `.vm-tree-overlay-badge-zone` holds direct/inherited/hover badges separately from `.vm-tree-count`, so the count can stay visible while badges overlay.
  - `has-active-badges` keeps queued/solid operation badges visible without waiting for row hover.
- Updated virtual tree SCSS so counters reserve `--vm-tree-counter-reserve` width while non-active badge overlays reveal on hover or focus.
- Preserved prior Agent B-adjacent corrections already present in the branch:
  reserved toggle placeholders, open-folder icon for expanded folders, indentation guides, restored hover feedback, and pointer capture only after selection movement crosses the threshold.

## Verification

Red checks before implementation:

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/styles/treeAffordanceSpacing.test.ts --fileParallelism=false`: failed as expected because `.vm-tree-row-surface.has-count` and overlay reserve styles did not exist.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeDecorations.test.ts --fileParallelism=false`: failed as expected because `ViewTree` did not mark count/overlay classes.

Green checks after implementation:

- Svelte autofixer for `viewTree.svelte`: `issues: []`, `suggestions: []`.
- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/styles/treeAffordanceSpacing.test.ts --fileParallelism=false`: pass, 3/3.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts test/component/viewTreeDecorations.test.ts test/component/viewTreeHoverBadges.test.ts --fileParallelism=false`: pass, 31/31.
- `pnpm run check`: `svelte-check found 0 errors and 0 warnings`.

## Residuals

- Live narrow-frame Obsidian visual smoke was not run in this session.
- Agent D remains the read-only live/manual QA shortcut for Queue island and narrow compact controls.
- Later Wave 2 Agent E/F work should preserve the tree row count/overlay split and Agent C's DnD service contract.
