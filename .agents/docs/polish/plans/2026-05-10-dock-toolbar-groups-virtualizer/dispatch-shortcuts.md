---
title: Dock Toolbar Parallel Dispatch Shortcuts
type: agent-plan
status: active
parent: "[[docs/work/polish/plans/2026-05-10-dock-toolbar-groups-virtualizer/index|Dock Toolbar Groups Virtualizer]]"
created: 2026-05-11T23:45:00
updated: 2026-05-11T23:58:00
tags:
  - agent/plan
  - polish
  - vaultman/product
created_by: codex
updated_by: codex
---

# Dock Toolbar Parallel Dispatch Shortcuts

Use this file when the user invokes a short command such as
`ejecuta ola 1 agente b`.

## Alias Resolver

- `ola 1 agente a` -> Cut 2 Settings and dock neutral state.
- `ola 1 agente b` -> Cut 2 tree row layout, narrow-row regression, badge/counter overlay, and folder-open icon.
- `ola 1 agente c` -> Cut 4 service-only DnD/groups residuals.
- `ola 1 agente d` -> Read-only live/manual QA for Queue island and narrow compact controls.
- `ola 2 agente e` -> Cut 3 virtualizer, Pretext, and tab latency after Agent B finishes.
- `ola 2 agente f` -> Cut 4 real DnD UI integration after Agent B finishes.
- `ola 3` -> Cut 5 node notes and mouse action polish after Agent A and DnD-sensitive work are stable.

If the user names one alias, execute only that agent's scope. If the user names
multiple aliases, dispatch or coordinate them in parallel only when their write
scopes below do not overlap.

## Global Rules For All Agents

- Read `AGENTS.md`, `.agents/docs/start.md`, current status/handoff, and this file.
- Preserve unrelated dirty worktree changes. Inspect `git diff -- <file>`
  before editing a file that is already modified.
- Do not commit unless the user explicitly asks.
- Use TDD for behavior changes, and run Svelte autofixer on touched `.svelte` files.
- Run Vite/Svelte/build checks sequentially, not in parallel with another agent.
- Each writer must report files changed, commands run, pass/fail counts, and
  residual manual checks.

## Wave 1 Parallel Contract

Wave 1 can run with Agent A, Agent B, Agent C, and Agent D concurrently if the
write scopes are respected.

### Agent A: Cut 2 Settings And Dock Neutral State

**Goal:** Complete the Settings/dock half of Cut 2 without touching tree row
layout.

**Owns:** `SettingsUI.svelte`, `typeSettings.ts`, `serviceLayout.ts`,
`navbarDock.svelte`, `navbarTabs.svelte`, and settings/nav tests.

**Do not touch:** `viewTree.svelte`, tree/virtual-list SCSS, DnD UI
integration, or Queue explorer presentation files from Cut 1.5.

**Work checklist:**

- Re-run and extend Settings UI tests around toggles, dock drawer options,
  faint accent focus, and layout settings.
- Confirm dock active state becomes neutral when changing page/context so the
  previous dock tab is not visually active after leaving that surface.
- Preserve existing external-tab behavior: externally mounted dock/top-tab items
  must not become locally active.

**Suggested verification:**

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/settingsUI.test.ts test/component/navbarDock.test.ts test/component/navbarTabs.test.ts --fileParallelism=false
pnpm run check
```

**2026-05-11 execution:** Agent A completed as an automated verification/test
slice. Added focused regression coverage for dock drawer direction, top-tab
layout content persistence, and neutral active state when dock/tab `active` is
outside the visible items. No production Svelte files were changed.

Verification:

- `pnpm exec vp test run --project component --config vitest.config.ts test/component/settingsUI.test.ts test/component/navbarDock.test.ts test/component/navbarTabs.test.ts --fileParallelism=false`:
  pass, 20/20.
- `pnpm run check`: pass, `svelte-check found 0 errors and 0 warnings`.

### Agent B: Cut 2 Tree Row Layout

**Goal:** Complete the tree-row half of Cut 2 and leave Settings/nav untouched.

**Owns:** `viewTree.svelte`, `_tree.scss`, `_virtual-list.scss`,
`treeAffordanceSpacing.test.ts`, `viewTreeSelection.test.ts`, and
`viewTreeDecorations.test.ts`.

**Do not touch:** `SettingsUI.svelte`, `navbarDock.svelte`,
`navbarTabs.svelte`, DnD services, or Queue explorer files
(`explorerQueue.svelte`, `viewList.svelte`, `serviceQueuePresentation.ts`,
`_islands.scss`).

**Work checklist:**

- Add or update a narrow-width tree-row regression test before product edits.
- Verify icon hiding/showing, reserved toggle placeholder, indentation guides,
  badges, counters, and labels at narrow frame widths.
- Finish badge/counter row overlay behavior: counters keep explicit reserved
  width, while badges reveal on hover or active operations without permanently
  truncating labels.
- Confirm expanded folder nodes use an open-folder icon across tree-like paths
  in scope; if another tree-like explorer is out of scope, record it explicitly.
- Keep selection-box drag behavior from the previous regression correction:
  pointer capture only after movement crosses threshold.

**Suggested verification:**

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/styles/treeAffordanceSpacing.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts test/component/viewTreeDecorations.test.ts test/component/viewTreeHoverBadges.test.ts --fileParallelism=false
pnpm run check
```

### Agent C: Cut 4 Service-Only DnD And Groups Residuals

**Goal:** Prepare or complete non-UI service residuals for Cut 4 while Agent B
owns tree UI.

**Owns:** `serviceDnd.ts`, `serviceDndSvelteAdapter.ts`, `serviceGroups.ts`,
and their unit tests.

**Do not touch:** Svelte views/components, tree/grid/list DnD markup, or Queue
presentation files unless a unit test exposes a service-level regression.

**Work checklist:**

- Compare the Cut 4 plan against current services and tests.
- Preserve existing `@dnd-kit/svelte@0.4.0` adapter contract.
- Identify only service-level gaps. If a gap requires UI wiring, stop and
  report it for Agent F after Agent B.

**Suggested verification:**

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts test/unit/services/serviceGroups.test.ts --fileParallelism=false
pnpm run check
```

**2026-05-11 execution:** Agent C completed a service-only DnD contract slice.
`inside` drops no longer emit reorder results for reorder-only targets in
`serviceDnd` or the `@dnd-kit/svelte` adapter. Source record:
[[wave-1-agent-c-service-dnd|Wave 1 Agent C Service DnD Contract]].

### Agent D: Read-Only Live QA

**Goal:** Verify residual live UI checks without editing files.

**Owns:** no write scope.

**Work checklist:**

- Use Obsidian CLI only if Obsidian is open and responsive.
- Check `obsidian dev:errors` before and after.
- For narrow compact controls, inspect or screenshot the visible compact
  controls at narrow frame width when feasible:
  `.vm-popup-squircles`, `.vm-squircle-row`, `.vm-viewmode-pills`,
  `.vm-sort-row`, `.vm-stat-scope-pills`, `.vm-tab-bar`, `.vm-nav-dock`.
- For Queue island, verify only when there are queued operations. If the live
  queue is empty, report `not applicable: no queued operations`.
- Do not create destructive operations just to force queue state unless the user
  explicitly authorizes it.

**Suggested verification:**

```powershell
obsidian dev:errors
obsidian eval code="(() => JSON.stringify({loaded: !!app.plugins?.plugins?.vaultman, queues: app.plugins?.plugins?.vaultman?.operationsIndex?.nodes?.length ?? null, controls: document.querySelectorAll('.vm-popup-squircles,.vm-squircle-row,.vm-viewmode-pills,.vm-sort-row,.vm-stat-scope-pills,.vm-tab-bar,.vm-nav-dock').length}))()"
```

## Later Waves

- `ola 2 agente e`: Cut 3 virtualizer/text-measurement/tab latency. Wait for
  Agent B if both need `viewTree`.
- `ola 2 agente f`: Cut 4 real `@dnd-kit/svelte` UI wiring. Wait for Agent B
  and preserve Agent C's service contracts.
- `ola 3`: Cut 5 node notes and mouse action polish. Wait for Agent A. Preserve
  existing fifth `node-note` hover badge, `serviceMouse` node action settings,
  and clean `serviceNodeBinding` titles/aliases.
