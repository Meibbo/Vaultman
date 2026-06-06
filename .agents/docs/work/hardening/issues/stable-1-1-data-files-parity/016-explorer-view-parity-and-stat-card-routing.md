---
title: SDF-016 Explorer view parity and Statistics card routing
type: issue
issue_id: SDF-016
status: in-progress
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T11:15:23
updated: 2026-06-06T16:07:29-05:00
labels:
  - ready-for-agent
  - needs-research
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - explorer/views
  - statistics/navigation
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-016 Explorer View Parity And Statistics Card Routing

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

After the Bases-parity table view is repaired, make view availability consistent across Data explorers
and turn Statistics cards into navigation shortcuts to the relevant Data surface.

This is intentionally tracked separately from the dock fix because it touches cross-page navigation,
view-mode availability, and the still-open table layout work.

## Acceptance Criteria

- [x] Start by resolving or explicitly depending on
      [[011-bases-parity-table-view-layout|SDF-011 Bases-parity table view layout]]; do not expand table
      view to more explorers while the current table presentation remains broken.
- [ ] Props, Tags, Files, and Content explorer surfaces expose table view only after the table renderer
      has acceptable Bases/core-class parity, column separation, resize affordances, and stable scroll.
- [ ] Files explorer exposes grid view in addition to tree and table once the grid interaction defects are
      resolved for file nodes.
- [x] View menu copy and icons make the difference between grid, table, tree, and future views explicit.
- [x] Page Statistics card clicks route to the matching Data explorer:
      - folders and files cards route to Data / Files.
      - props and values cards route to Data / Props.
      - tags card route to Data / Tags.
      - word count row routes to Data / Content.
- [x] Routing preserves the user's existing active filters/search where possible and does not clear state
      unless a card explicitly requests a new filter.
- [x] Clicking a Statistics card closes open islands and puts the Data page into a stable active tab state.
- [x] Add focused tests or source guards for the view-mode availability map and Statistics card-to-tab
      routing map.
- [x] `plugin-dev` smoke confirms each Statistics card navigates to the expected Data tab and the target
      explorer remains scrollable.

## Blocked By

- [[011-bases-parity-table-view-layout|SDF-011 Bases-parity table view layout]] for table view expansion.
- Files grid interaction defects already reported by the user: grid view must support selection, context
  menu, badges/decorations, and file-specific affordances before becoming a normal Files view.

## Notes

The Statistics card routing is useful independently, but implementing it together with the view-parity
work keeps the Data surface navigation contract coherent: Statistics becomes a map into the same explorer
surfaces whose view modes are being normalized.

## Progress — 2026-06-06T16:07:29-05:00

SDF-016a completed the routing and view-mode-contract slice without claiming the generic table/grid work
as done.

- Product change: Statistics cards now emit `StatisticsDataTab` navigation
  through `logicStatisticsNavigation.ts`; `VaultmanFrame` closes open islands, switches to Data, and sets
  the requested Data tab without clearing filters/search.
- `pageStatistics.svelte` makes folders/files/props/values/tags cards clickable and makes the Word Count
  meta row route to Content.
- `logicExplorerViewModes.ts` centralizes view availability. Current runtime contract:
  - Files: `Tree` and `Table` selectable; `Grid`, `Drag & Drop list`, and `Cards` visible but disabled.
    The repaired Files table still maps to the existing internal `GridView` renderer for now.
  - Props and Tags: `Tree` and `Grid` selectable; generic `Table`, `Drag & Drop list`, and `Cards`
    visible but disabled.
  - Content: no explorer view modes exposed yet.
- Focused tests added:
  `test/unit/statisticsNavigation.test.ts` and `test/unit/explorerViewModes.test.ts`.
- Verification:
  - `pnpm run verify` passed: lint, `svelte-check`, format check, stylelint, production build,
    `29` unit files / `96` tests, and scorecard regression scan `17` checks.
  - `pnpm run build` synced artifacts to `plugin-dev`.
  - `obsidian vault=plugin-dev plugin:reload id=vaultman`, `command id=vaultman:open`, and
    `dev:errors` passed.
  - Runtime smoke clicked Folders, Files, Properties, Values, Tags, and Word Count; each landed on
    `Tabs: Files`, `Tabs: Files`, `Tabs: Props`, `Tabs: Props`, `Tabs: Tags`, and `Tabs: Content`
    respectively, with Data active and `islandOpen=false`.
  - Runtime smoke confirmed Files View menu shows `Tree`, `Table`, disabled `Grid`, disabled
    `Drag & Drop list`, and disabled `Cards`; Props/Tags show `Tree`, `Grid`, disabled `Table`,
    disabled `Drag & Drop list`, and disabled `Cards`.
  - Selecting Files `Table` rendered `.vaultman-files-table-root` with scrollWidth `612`, scrollable
    body, and header offsets `0/300/411`.

Remaining work for completing SDF-016:

- Implement a real generic table view for Props, Tags, and Content or split that into a dedicated
  follow-up if the renderer architecture needs a larger pass.
- Implement the separate Files grid view only after file-grid selection, context menu,
  badges/decorations, and file affordances are fixed.
