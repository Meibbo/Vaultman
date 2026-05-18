---
title: EDP final stabilization
type: implementation-record
status: active
parent: "[[docs/work/hardening/plans/2026-05-11-explorer-data-plane-transition/index|explorer-data-plane-transition-plans]]"
created: 2026-05-13T19:55:00
updated: 2026-05-13T19:55:00
tags:
  - agent/plan
  - agent/final-stabilization
  - initiative/hardening
  - explorer/views
created_by: codex
updated_by: codex
---

# EDP Final Stabilization

## Scope

Final stabilization ran in the isolated worktree:

`C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\edp-final-stabilization`

Branch: `codex/edp-final-stabilization`

Base: `claude/explorer` at `5508168a5ef1` after the parallel integration
handoff commit. The root `sandbox` worktree was not used. No push was
performed.

## Performance Residual Diagnosis

Initial final-stabilization verification reproduced the known component
performance residual:

- Full `pnpm run test:component` failed only
  `test/component/viewTableStress.test.ts`.
- Isolated rerun of `test/component/viewTableStress.test.ts` also failed the
  threshold once: large panel table open measured about 3.58s against the 3s
  gate.

The product issue was avoidable table-mode mount work in
`src/components/containers/panelExplorer.svelte`. `panelExplorer` derived
tree expansion, display-node badge bubbling, and active operation badge maps
even when `viewMode === 'table'`, where those values cannot be rendered by
`ViewNodeTable`.

Fix:

- Added `hasExpansionSurface` so auto-expansion and expandable-node summaries
  only traverse nodes for tree/grid surfaces.
- Made `displayNodes` call `resolveDisplayNodes` only for tree mode.
- Made `activeOpsByNode` return an empty map outside tree/grid surfaces.

No performance threshold was relaxed.

One isolated `viewTableStress` rerun immediately after the patch was a strong
environment outlier and also slowed the raw `ViewNodeTable` test, which does
not touch `panelExplorer`. Two subsequent isolated reruns passed, followed by
the full component suite passing. The final component suite duration was high
because the machine had external Node load, but the threshold gates passed.

## Verification

Focused EDP and integration gates:

- EDP focused unit:
  `logicExplorerSnapshot`, `serviceExplorerDataPlane`,
  `serviceExplorerLayers`, `serviceOverlayProjection`,
  `serviceExplorerRowInput`, `serviceViewTableAdapter`, `serviceSelection`,
  `serviceViews`, and `svarRemovalContract`.
  - Passed: 9 files / 73 tests.
- EDP component/data-plane unit:
  `explorerFiles`, `explorerTags`, `explorerTagsSnapshot`, `explorerProps`,
  `serviceExplorerMediaCache`, and `serviceCache`.
  - Passed: 6 files / 67 tests.
- EDP focused component:
  `panelExplorerSelection`, tree/grid/node/table row gates, virtualizer keys,
  and sticky tree files.
  - Passed: 16 files / 138 tests.
- T3/T4 focused unit:
  `serviceCommandsRegistration`, `serviceFnRIsland`, `serviceFnRPropSet`,
  `serviceFnR`, `serviceFnRTemplate`, `serviceFnRTokenAllowlist`,
  `serviceFnRDateParser`, and `serviceAddonsIsland`.
  - Passed: 8 files / 87 tests.
- T3/T4 focused component:
  `pageToolsDiff`, `viewDiffNavbar`, `viewDiffChains`, `vmPopoverIsland`,
  `toolbarClickWeights`, `toolbarMenuPlacement`, `dashboard3Column`,
  `addonsMarkdownPane`, `frameDashboardAddons`, `frameFaintMultiWindow`, and
  `pageFiltersChooseMode`.
  - Passed: 11 files / 38 tests.

Full-suite gates:

- `pnpm run test:unit`
  - Passed: 129 files / 802 tests.
  - Includes `test/unit/performance/stress.test.ts`.
- `pnpm run test:component`
  - Passed: 68 files / 330 tests.
  - Includes `test/component/viewTableStress.test.ts`.
- `pnpm run lint:full`
  - Passed.
- `pnpm run check`
  - Passed: 0 errors / 0 warnings.
- `pnpm run build:plugin`
  - Passed. Vite built `dist/vite/main.js` and `dist/vite/styles.css`.
- `git diff --check`
  - Passed.
- Svelte autofixer on `panelExplorer.svelte`
  - Passed: no issues or suggestions.

## Live `plugin-dev` Smoke

Commands were run against `vault=plugin-dev` explicitly.

- `obsidian vault=plugin-dev plugin:reload id=vaultman`
  - Passed: `Reloaded: vaultman`.
- `obsidian vault=plugin-dev command id=vaultman:open`
  - Passed: `Executed: vaultman:open`.
- DOM state eval after open:
  - `frameLeaves: 1`
  - `activeType: "vm-frame"`
  - `vmFrameEls: 1`
  - `vmRootEls: 1`
  - `panelEls: 5`
- `obsidian vault=plugin-dev command id=vaultman:open-diff`
  - Passed: `Executed: vaultman:open-diff`.
- Diff DOM eval:
  - `[data-vm-nav=next-change]` present: `true`.
- `obsidian vault=plugin-dev command id=vaultman:open-find-replace-active-explorer`
  - Passed: `Executed: vaultman:open-find-replace-active-explorer`.
- FnR/popover DOM eval:
  - `.vm-root` present: `true`.
  - `[data-vm-fnr-island-body]` present: `true`.
  - all `.vm-popover-content` / `.vm-dialog-content` nodes scoped under
    `.vm-root`: `true`.
- `obsidian vault=plugin-dev dev:errors`
  - Passed: `No errors captured.`

Operational note: `Obsidian.com` CLI calls should be run sequentially. A
parallel eval/open-diff/dev-errors attempt left CLI helper processes stuck; only
those helper processes were stopped, and the sequential smoke above passed.

## Residuals

- The known performance-threshold residuals are resolved by this gate:
  `test/unit/performance/stress.test.ts` and
  `test/component/viewTableStress.test.ts` both passed under their full suites.
- No merge conflicts or unresolved conflict markers remain.
- Remaining T4 follow-ups are unchanged: frame-level native-click wiring, real
  adopted-block queue staging, Quick Switcher, and FAB polish.
- Existing doc-health residuals remain outside this stabilization:
  glossary warnings, parent-shape issues, and large plan/spec line limits.

## Next Action

Review and merge local branch `codex/edp-final-stabilization` into
`claude/explorer` if the final stabilization patch is accepted. No push has
been performed.
