---
title: Tree large-scroll follow-up
type: implementation-record
status: active
parent: "[[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/index|Explorer variable scroll repair]]"
created: 2026-05-20T15:25:00-05:00
updated: 2026-05-20T15:25:00-05:00
tags:
  - agent/plan
  - explorer/performance
  - explorer/scroll
  - explorer/virtualization
  - svelte5
created_by: codex
updated_by: codex
---

# Tree Large-Scroll Follow-Up

## Problem

The user clarified that "index" in the scroll smoke overlay means the visible
row position against the actual virtualized node count, not an estimate derived
from scroll geometry. Example: a Files tree with more than 10,000 visible rows
should report positions like `8001-8002/10000`, even though only a small DOM
window is mounted.

The remaining runtime symptom was tree invisibility or stalls when dragging the
scrollbar across large node ranges. The likely failure path was not only
TanStack returning zero virtual rows; it can also briefly return stale rows from
the old window. In that state the DOM is non-empty, but all mounted rows are
outside the current viewport, so the tree appears blank until the virtualizer
catches up.

## Implementation

- `src/components/views/viewTree.svelte`
  - `renderedVirtualRows` now checks whether the TanStack virtual rows cover the
    current scroll window.
  - If rows are empty or stale for the current `scrollTop`/viewport, the tree
    uses bounded fixed fallback rows computed from the real scroll position.
  - Total inner height now falls back to `flatArray.length * rowHeight` if the
    virtualizer total is too small, preserving the scrollbar for large trees.
  - Row DOM now exposes `data-vm-virtual-index` and `data-vm-total-rows` so
    probes can report model indexes instead of geometry guesses.

- `src/dev/perfProbe.ts`
  - `visibleRowPosition()` now prefers `data-vm-virtual-index` over the generic
    `data-index`.
  - Total rows now prefer explicit `data-vm-total-rows`; geometry remains only
    as a fallback for views that do not expose model counts.

## Tests

- `test/component/viewTreeScrollFallback.test.ts`
  - Added a stale TanStack row scenario: mock virtual rows still point at index
    `0`, then the scroll jumps to row `49000` in a 50,000-row tree.
  - Expected behavior: the tree renders a bounded fallback window around
    `node-49000` and does not keep `node-0` mounted.

- `test/component/perfProbeDom.test.ts`
  - Added a DOM-only probe scenario where geometry would imply only 100 rows,
    but the mounted rows report `data-vm-total-rows="10000"`.
  - Expected behavior: the smoke sample and overlay report the explicit model
    total.

## Verification

- Red check before the implementation:
  - `pnpm vitest run test/component/viewTreeScrollFallback.test.ts -t "stale after a large scroll jump"`
    failed because `node-49000` was not mounted.
  - `pnpm vitest run test/component/perfProbeDom.test.ts -t "prefers virtual row data attributes"`
    failed because `totalEstimatedRows` came from geometry instead of the model
    count.

- Fresh post-fix checks:
  - `npx @sveltejs/mcp svelte-autofixer ./src/components/views/viewTree.svelte --svelte-version 5`
    returned `issues: []`; remaining suggestions were broad pre-existing
    Svelte guidance around effects, `bind:this`, and local `Map`/`Set` usage.
  - `pnpm vitest run test/component/viewTreeScrollFallback.test.ts test/component/perfProbeDom.test.ts`
    passed, 2 files / 29 tests.
  - `pnpm vitest run --project component --config vitest.config.ts --fileParallelism=false test/component/viewTreeScrollFallback.test.ts test/component/perfProbeDom.test.ts test/component/viewNodeDynamicGeometry.test.ts`
    passed, 3 files / 32 tests.
  - `pnpm vitest run test/unit/scripts/explorerScrollSmokeScript.test.ts`
    passed, 1 file / 1 test.
  - `pnpm run check` passed with 0 errors / 0 warnings.
  - `pnpm run build` passed and synced artifacts to the repo, `dist/build`,
    `plugin-dev`, and the stress vault.
  - `pnpm run lint` passed with 0 warnings / 0 errors.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.

## Residuals

- `pnpm run test:component` did not complete inside a 4-minute timeout during
  this pass and left a Vitest/VP process chain, which was manually stopped.
  Targeted component coverage for the changed tree/probe paths passed after
  cleanup.
- No fresh live Obsidian scroll smoke was run in this pass. The build synced
  the plugin-dev artifacts, so the next live check can start from
  `pnpm smoke:scroll -- --view=tree --jumps=100 --no-build`.
- The next meaningful performance question is whether large scrollbar drags
  still show event-loop delay spikes after blank frames are prevented. Add
  percentile/histogram reporting before judging smoothness from max delay alone.
