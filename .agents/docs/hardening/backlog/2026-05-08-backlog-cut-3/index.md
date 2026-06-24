---
title: Backlog cut 3 - viewtree chevron live click regression
type: implementation-record
status: done
created: 2026-05-08T02:39:25
updated: 2026-05-08T02:39:25
tags:
  - agent/work
  - vaultman/backlog
created_by: codex
updated_by: codex
---

# Backlog Cut 3

## Scope

Continuation requested on 2026-05-08 after backlog cut 2:

- Fix the live `viewTree` chevron click regression.
- Clicking the chevron must toggle exactly the node under the pointer.
- Chevron click must not select the row, activate the secondary action, or
  trigger tertiary delete.
- The fix must work after row selection, after box selection, and inside
  virtualized rows.
- If component tests pass while the live UI remains broken, add a browser or
  Obsidian smoke test.

## Diagnosis

The existing component tests clicked `.vm-tree-toggle` directly and passed, but
the live UI click path lands on the nested SVG injected by Obsidian `setIcon`.

`viewTree.svelte` routed `pointerdown` from the outer virtual tree through
`shouldIgnoreBoxStart(e.target)`. That guard only accepted `HTMLElement`:

- Direct test click on `.vm-tree-toggle` bypassed pointerdown and toggled.
- Live click hit an `SVGElement` inside `.vm-tree-toggle`.
- `SVGElement instanceof HTMLElement` is false, so the guard failed.
- The virtual tree began box-selection pointer capture from a chevron click.
- The later click no longer reliably reached the chevron toggle path.

The fix is intentionally narrow: treat any DOM `Element` as eligible for
`closest(...)`, so SVG descendants of explicit controls are ignored by the
selection-box starter just like HTML descendants.

## Implementation Notes

- `src/components/views/viewTree.svelte`
  - Changed `shouldIgnoreBoxStart` from `target instanceof HTMLElement` to
    `target instanceof Element`.
  - This preserves the existing ignored-control selector:
    `input, textarea, select, button, .vm-tree-toggle, .vm-badge,
    .vm-tree-child-badge-indicator, [role="button"]`.
  - No selection, expansion, row activation, or badge APIs were changed.

- `test/component/viewTreeSelection.test.ts`
  - Added a regression test with an icon action that injects a real SVG into
    the chevron span, matching Obsidian `setIcon` structure closely enough for
    the bug.
  - The red failure proved SVG `pointerdown` was starting pointer capture.
  - The green run proves SVG `pointerdown` is treated as an explicit chevron
    control and the click toggles without row selection or activation.

## Verification

- Red test:
  - `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts --fileParallelism=false`
  - Failed as expected: `setPointerCapture` was called once from SVG
    `pointerdown`.

- Green focused test:
  - `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts --fileParallelism=false`
  - Passed: 1 file, 12 tests.

- Focused regression suite:
  - `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts test/component/panelExplorerSelection.test.ts --fileParallelism=false`
  - Passed: 2 files, 41 tests.

- Svelte autofixer:
  - `viewTree.svelte` returned no issues.
  - Suggestions were limited to pre-existing effect/action review notes.

- Broad verification:
  - `pnpm run check`
    - Passed: `svelte-check found 0 errors and 0 warnings`.
  - `pnpm run lint`
    - Passed: 0 warnings and 0 errors.
  - `pnpm run build`
    - Passed: `tsc -noEmit -skipLibCheck && vp build && node scripts/sync-test-build.mjs`.

- Obsidian smoke:
  - `obsidian vault=plugin-dev dev:errors clear`
  - `obsidian vault=plugin-dev dev:console clear`
  - `obsidian vault=plugin-dev plugin:reload id=vaultman`
  - `obsidian vault=plugin-dev eval code="...open Vaultman, navigate to Filters, locate collapsed expandable row..."`
  - CDP click at the center of the nested SVG chevron for unselected row
    `alias` changed `aria-expanded` from `false` to `true`.
  - The same row stayed `aria-selected="false"`.
  - Descendant rows became visible.
  - Final `obsidian vault=plugin-dev dev:errors` reported `No errors captured.`
  - Final `obsidian vault=plugin-dev dev:console level=error` reported
    `No console messages captured.`

## Remaining Cuts

Known named follow-up cut from backlog cut 2:

- Cut 4 - View node sizing and `serviceViewSize`.

Uncut residual backlog from cut 1 still needs triage into named cuts:

- Multi-selected badge ops and contradiction warning popup.
- Filter ingestion from selection box, props, and tags.
- TabContent reactive search progress and incremental result rendering.
