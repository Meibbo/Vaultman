---
title: Cut 1.5 Verification And Handoff
type: agent-plan-shard
status: planned
parent: "[[docs/work/polish/plans/2026-05-10-dock-toolbar-groups-virtualizer/cut-1-5-node-surface-theme-scroll/index|Cut 1.5 Node Surface Theme And Scroll Plan]]"
created: 2026-05-10T19:53:58
updated: 2026-05-10T19:53:58
tags:
  - agent/plan
  - polish
created_by: codex
updated_by: codex
---

# Verification And Handoff

## Svelte Autofixer

Run the Svelte autofixer on every touched `.svelte` file before final verification. Likely files:

- `src/components/views/viewTree.svelte`
- `src/components/views/ViewNodeGrid.svelte`
- `src/components/views/ViewNodeCards.svelte`
- `src/components/views/ViewNodeTable.svelte`
- `src/components/views/viewList.svelte`
- `src/components/containers/panelExplorer.svelte`
- `src/components/containers/explorerQueue.svelte`
- `src/components/settings/SettingsUI.svelte`
- `src/components/layout/Toolbar.svelte`

## Focused Test Commands

Run after implementation:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceViews.test.ts test/unit/components/explorerProps.test.ts test/unit/services/serviceTheme.test.ts test/unit/services/serviceScroll.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeHoverBadges.test.ts test/component/viewGridHoverBadges.test.ts test/component/viewNodeCards.test.ts test/component/viewList.test.ts test/component/reactiveExplorers.test.ts test/component/settingsUI.test.ts --fileParallelism=false
```

Run broader safety checks:

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts test/component/viewTreeDecorations.test.ts test/component/panelExplorerSelection.test.ts test/component/navbarDock.test.ts test/component/navbarTabs.test.ts --fileParallelism=false
pnpm run check
```

If SCSS-only scrollability has no test harness, do a manual browser/in-app check at narrow frame width and record the observed controls.

## Manual UI Checklist

- [ ] Filter-matched ordinary nodes no longer show `<mark>` or filter badges by default.
- [ ] Settings opt-in restores old matched-filter decoration.
- [ ] Active Filters explorer itself still shows filter rows with filter badges.
- [ ] Hover primary action no longer has accent visibility.
- [ ] Hover badges have a faint background on hover/focus so icons remain visible.
- [ ] Active-filter nodes use the old selected accent treatment only when the opt-in setting is enabled.
- [ ] Selected nodes use faint treatment with no left border.
- [ ] Queue badges remove operations in Tree, Grid, Cards, and Table.
- [ ] Props search category starts at all/props and toggles between `Props` and `Values`.
- [ ] ViewTree scroll no longer leaves slow blank gaps during normal wheel scrolling.
- [ ] ViewCards background/border settings remove the visible background spill/end blank area when disabled.
- [ ] Squircles, navbars, and menu pills can scroll horizontally in a narrow frame.
- [ ] Queue parent rows keep action icon/decoration/count.
- [ ] Queue child rows show simple item labels, no op icon, no op badge, and inline cancel in the counter/action slot.

## Handoff Text To Add After Execution

After implementation, append a dated continuation log to the parent plan:

```markdown
## 2026-05-10 Intermediate Cut 1.5: Node Surface Theme, Queue Badges, And Scroll

Implemented:

- ...

Fresh verification:

- `...`: pass/fail summary.

PretextJS audit:

- ...
```

Update `.agents/docs/current/handoff.md` with a compact resume point. Do not paste the whole implementation record into current docs.
