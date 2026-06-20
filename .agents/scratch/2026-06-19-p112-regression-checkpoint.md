---
title: P112 visual regression checkpoint
created: 2026-06-19T00:54:46
created_by: codex-gpt-5
scope: local-scratch
---

# P112 Visual Regression Checkpoint

This is a local scratch checkpoint only. It intentionally avoids `.agents/docs`
because the PKM-AI docs working tree is under separate recovery by Claude.

## Product Worktree

- Path: `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard`
- Current state: local branch `p112-type-view-loop-fix`
- Current commit: `9b140ac fix(files): prevent sort bridge reactive loop`
- Product status checked: clean branch
- `plugin-dev` currently has the build from `9b140ac`

## Regression Search Result

- Known good visual/smoke baseline: `4c9b49c fix(commands): focus active explorer search`
- First known bad visual/smoke commit: `2c2add3 fix(files): expose type view filter`
- Symptom at bad commit: explorer tab switching breaks and `dev:errors` reports
  `effect_update_depth_exceeded` after plugin reload.
- Earlier known issue: caret/indent problems start before the big tab break, around
  the 1.1.2 beta range, but `2c2add3` is the first isolated commit for the broad
  runtime loop/tab break.

## Tested Path

- `33d9d23` / `1.1.1`: good by dev visual check.
- `5d59520`: good by dev visual check.
- `e9af945`: good by dev visual check.
- `2fcbbf0`: good by dev visual check.
- `180d3d1`: caret problems visible, not the broad break.
- `e275098`: not the broad break.
- `362ca3c`: good by smoke and later used as known-good range anchor.
- `8750356`: bad, tab explorer breaks, `effect_update_depth_exceeded`.
- `207e726`: bad, same runtime loop.
- `3a8943a`: bad, same runtime loop.
- `4c9b49c`: good by smoke.
- `2c2add3`: bad by smoke; first bad after `4c9b49c`.

## Next Step

Ask the dev to visually confirm `plugin-dev` on `9b140ac`:

1. Explorer tab switching should work again.
2. `dev:errors` should stay clean after reload.
3. Files type view filter should still appear in Active Filters and clear-selection
   actions when active.

If this point is visually good, transplant the same fix onto the intended dev/head
line before continuing the later backlog commits.

## Fix Applied

- `fecc020 test: normalize source guard line endings`
  - Normalizes CRLF to LF inside four source-guard tests that were failing after
    Windows checkout/bisect even though the guarded source content existed.
- `9b140ac fix(files): prevent sort bridge reactive loop`
  - Adds `untrack` and an equality guard around the external Files sort-state
    bridge in `navbarFilters.svelte`.
  - Keeps the bridge from making the registering `$effect` depend on
    `sortStateByTab`, which was the root of the `effect_update_depth_exceeded`
    loop introduced by `2c2add3`.
  - Adds a focused source guard in `filesTypeViewFilterSource.test.ts`.

## Verification

- `corepack pnpm exec vitest run test/unit/filesTypeViewFilterSource.test.ts --config vitest.unit.config.mts`
  - PASS: 1 file / 2 tests.
- `npx @sveltejs/mcp svelte-autofixer ./src/components/layout/navbarFilters.svelte --svelte-version 5`
  - PASS: no `issues`; suggestions remain for existing effect calls.
- `corepack pnpm exec vitest run test/unit/filesTypeViewFilterSource.test.ts test/unit/mobileCssSource.test.ts test/unit/virtualScrollCssSource.test.ts test/unit/propCountLabelSource.test.ts test/unit/fileWordCountCellSource.test.ts --config vitest.unit.config.mts`
  - PASS: 5 files / 18 tests.
- `corepack pnpm run lint`
  - PASS.
- `corepack pnpm run check`
  - PASS: `svelte-check found 0 errors and 0 warnings`.
- `corepack pnpm run test:unit`
  - PASS: 60 files / 232 tests.
- `corepack pnpm run build`
  - PASS; synced to `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`.
- Obsidian CLI, all with `vault=plugin-dev`
  - `dev:errors clear`: cleared 1 old error.
  - `plugin:reload id=vaultman`: reloaded.
  - `dev:errors`: `No errors captured.`

## Safety Notes

- Do not touch `main`.
- Do not push.
- Do not write AI docs into the product worktree.
- Do not use Obsidian CLI without `vault=plugin-dev`.
- Do not modify `.agents/docs` until the separate PKM-AI docs recovery is resolved.
