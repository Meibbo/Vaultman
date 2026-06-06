---
title: SDF-014 Data tab switch performance and vertical offset regression
type: issue
issue_id: SDF-014
status: done
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T09:52:29
updated: 2026-06-06T10:59:35
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - explorer/performance
  - explorer/navigation
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-014 Data Tab Switch Performance And Vertical Offset Regression

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Diagnose and repair the massive FPS drop and layout jump when switching Data header tabs
(`Files`, `Props`, `Tags`, `Content`). Switching should feel closer to Obsidian workspace tab switching:
immediate, stable, and without the content appearing roughly 30% lower before snapping back into place.

## Acceptance Criteria

- [x] Use the Vaultman sampler/performance HUD or equivalent runtime sampler to capture FPS, long tasks,
      and action log while switching Data tabs repeatedly.
- [x] Use `obsidian-cli` runtime smoke to reproduce and document whether the tab content remount causes
      FPS collapse, long tasks, forced reflow, scroll reset, or delayed transform/layout correction.
- [x] Compare against native Obsidian workspace tab switching in the same vault/session as a reference,
      without treating unequal row counts as equivalent evidence.
- [x] Fix the visible vertical offset: tab content must mount at its final position without appearing
      about 30% lower and then moving into place.
- [x] Reduce or eliminate unnecessary cold remount/rebuild work on fast tab changes. If a tab must
      remount, it must keep prior measured scroll/render state and avoid blocking the UI thread.
- [x] Add a focused regression smoke or test harness that performs repeated Data tab switches and records
      FPS/long-task/layout-shift evidence.
- [x] `plugin-dev` verification includes sampler output before/after the fix and `dev:errors` with no
      captured runtime errors.

## Blocked By

None - can start immediately, but it must begin with runtime performance research and sampler evidence.

## Notes

This is release-facing because the current tab switch behavior makes fast navigation feel broken even
when explorer row virtualization itself is acceptable. Do not “fix” this by adding artificial render
limits or hiding rows.

## Partial Progress - 2026-06-06

- Product worktree `hotfix/1.0.2-css-scorecard` received a narrow visual-offset fix.
- Root-cause hypothesis for the visible jump: `pageFilters.svelte` wrapped active tab content in
  `{#key filtersActiveTab}` with `in:fade` and `out:fade`. During the outro, Svelte can keep the old
  content in normal document flow while mounting the incoming content, making the new tab appear
  lower before snapping into place.
- Added `test/unit/pageFiltersSource.test.ts` as a source guard to prevent reintroducing in-flow
  `svelte/transition` fade directives on the active tab-content wrapper.
- Removed the `fade` import, `in:fade`, `out:fade`, and the keyed wrapper around
  `.vaultman-filters-tab-content`.
- Runtime smoke after repeated Data tab switches reported `maxWrapperCount=1` and `maxTopDelta=0`.
- At this point the issue remained open: sampler still showed FPS drops and long tasks during rapid
  tab switching (`18-34 fps` samples with long-task pressure), so the remaining problem was likely
  remount/rebuild pressure rather than the old in-flow transition offset.

## Verification - 2026-06-06

- RED: `pnpm exec vitest run --config vitest.unit.config.mts test/unit/pageFiltersSource.test.ts`
  failed while `pageFilters.svelte` still imported `svelte/transition` and used `in:fade/out:fade`.
- GREEN focused gate: `pageFiltersSource.test.ts` passed after removing the transition wrapper.
- `npx @sveltejs/mcp svelte-autofixer src/components/pages/pageFilters.svelte`: no Svelte issues;
  only pre-existing suggestions about effect assignments/calls in the Content search flow.
- `pnpm run verify`: pass; lint, check, format, stylelint, build plugin, unit tests, and scorecard
  regression scan all passed (`16` unit files / `51` tests; scorecard `17` checks).
- Final sync and reload passed; fresh `plugin-dev` `dev:errors` returned `No errors captured`.

## Closeout - 2026-06-06

- Implemented in product worktree `hotfix/1.0.2-css-scorecard`.
- `pageFilters.svelte` now keeps visited Data tab panes mounted through `.vaultman-filters-tab-pane`
  wrappers and toggles only the active pane with `display:flex`. This avoids cold remounts after a
  tab has already been visited.
- Removed the in-flow keyed `fade` transition around `.vaultman-filters-tab-content`; the incoming
  tab content no longer mounts below the outgoing content before snapping into place.
- Fixed search-state routing for persistent panes: Props and Tags now receive
  `filtersSearchByTab.props` / `filtersSearchByTab.tags` directly instead of the currently active
  explorer search term.
- Added idempotent setter guards to `FilesExplorerPanel`, `PropsExplorerPanel`, and
  `TagsExplorerPanel` for view mode, visible cells, sort state, and search state. Repeated header
  effects now no-op instead of forcing tree remounts/renders when the value is unchanged.
- Added source-guard regression tests:
  - `test/unit/pageFiltersSource.test.ts` prevents reintroducing active-tab in-flow transitions,
    active-only content branches, and cross-tab search binding.
  - `test/unit/explorerSetterSource.test.ts` prevents removing the no-op setter guards that stopped
    redundant tab-switch renders.

## Final Verification - 2026-06-06

- `npx @sveltejs/mcp svelte-autofixer src/components/pages/pageFilters.svelte`: no Svelte issues;
  only pre-existing Content-search `$effect` suggestions.
- Focused gate:
  `pnpm exec vitest run --config vitest.unit.config.mts test/unit/pageFiltersSource.test.ts test/unit/explorerSetterSource.test.ts`
  passed (`2` files / `6` tests).
- `pnpm run check`: pass; `svelte-check found 0 errors and 0 warnings`.
- `pnpm run stylelint`: pass.
- `pnpm run format:check`: pass.
- `pnpm run test:unit`: pass (`17` files / `56` tests).
- `pnpm run verify`: pass; lint, check, format, stylelint, build plugin, unit tests, and scorecard
  regression scan all passed (`17` unit files / `56` tests; scorecard `17` checks).
- Final sync: `node scripts/sync-test-build.mjs`.
- `obsidian vault=plugin-dev plugin:reload id=vaultman`: pass.
- Fresh `obsidian vault=plugin-dev dev:errors`: `No errors captured`.
- Runtime Data tab switch smoke after the first offset-only fix still showed substantial pressure:
  `maxTopDelta=0`, but FPS samples included `20`, `34`, and `41` fps with many tree render actions.
- Runtime Data tab switch smoke after the persistent-pane/idempotent-setter fix:
  - `maxPaneCount=4`, `maxActivePaneCount=1`, `maxTopDelta=0`.
  - Mounted panes ended as `Files`, `Tags`, `Props`, `Content`; exactly one active pane.
  - Tree render actions during the repeated switch loop dropped to `2`.
  - Sampler samples improved to `46`, `56`, `57`, `60`, `60` fps; long-task pressure dropped to
    `0.218`, `0.161`, `0.104`, `0`, `0`.
- Native Obsidian workspace tab reference in the same `plugin-dev` session:
  - Alternated two markdown workspace tabs (`this works.md`, `help.md`) ten times.
  - `maxTopDelta=0`.
  - Sampler samples were `56` and `60` fps with `0` long tasks.
  - This was used only as a native interaction reference, not as an equal row-count workload.
