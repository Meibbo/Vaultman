---
title: SDF-016 Explorer view parity and Statistics card routing
type: issue
issue_id: SDF-016
status: completed
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T11:15:23
updated: 2026-06-07T22:15:10
labels:
  - completed
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

After the Bases-parity table view is repaired, make view availability consistent across Data explorers and turn Statistics cards into navigation shortcuts to the relevant Data surface.

This is intentionally tracked separately from the dock fix because it touches cross-page navigation, view-mode availability, and the still-open table layout work.

## Acceptance Criteria

- [x] Start by resolving or explicitly depending on [[011-bases-parity-table-view-layout|SDF-011 Bases-parity table view layout]]; do not expand table view to more explorers while the current table presentation remains broken.
- [x] Props, Tags, Files, and Content explorer surfaces expose table view only after the table renderer has acceptable Bases/core-class parity, column separation, resize affordances, and stable scroll.
      - [x] Props and Tags expose a generic node table renderer with Bases/core classes, stable column offsets, and virtualized visible rows.
      - [x] Files table and generic node tables expose working header resize handles that update absolute column offsets without replacing the virtualized row pipeline.
      - [x] Content remains a Core Search-compatible result-list surface for this release gate; a full Content table renderer is deferred outside SDF-016 rather than blocking `1.1.0-beta.2`.
- [x] Files explorer exposes grid view in addition to tree and table once the grid interaction defects are resolved for file nodes.
- [x] View menu copy and icons make the difference between grid, table, tree, and future views explicit.
- [x] Page Statistics card clicks route to the matching Data explorer:
      - folders and files cards route to Data / Files.
      - props and values cards route to Data / Props.
      - tags card route to Data / Tags.
      - word count row routes to Data / Content.
- [x] Routing preserves the user's existing active filters/search where possible and does not clear state unless a card explicitly requests a new filter.
- [x] Clicking a Statistics card closes open islands and puts the Data page into a stable active tab state.
- [x] Add focused tests or source guards for the view-mode availability map and Statistics card-to-tab routing map.
- [x] `plugin-dev` smoke confirms each Statistics card navigates to the expected Data tab and the target explorer remains scrollable.

## Blocked By

- [[011-bases-parity-table-view-layout|SDF-011 Bases-parity table view layout]] for table view expansion.
- Files grid interaction defects were resolved in the 2026-06-07T08:11:13 cut for the stable Files surface; keep future work scoped to Content parity and filter performance unless new grid regressions are reported.

## Notes

The Statistics card routing is useful independently, but implementing it together with the view-parity work keeps the Data surface navigation contract coherent: Statistics becomes a map into the same explorer surfaces whose view modes are being normalized.

## Closure - 2026-06-07T22:15:10

Closed together with [[010-content-explorer-core-search-parity|SDF-010]] for the `1.1.0-beta.2` release gate. Product commit: `9150c90 feat(data): close explorer parity wave`.

What SDF-016 now covers as completed:

- Statistics cards route to Data / Files, Props, Tags, and Content.
- Files exposes working Tree, Table, and Grid views.
- Props and Tags expose Tree, Grid, and Table with the generic node table renderer.
- Files and node tables have resizable headers with stable absolute Bases-style offsets.
- Data header uses Core-like `nav-header > nav-buttons-container > clickable-icon.nav-action-button` structure.
- Dock-off Data Tabs menu includes Statistics, Active filters, and Queue.
- Content header actions now live in the Data filters header after the Tabs button.
- Content has a Core Search-like result-list hierarchy with sort and expand/collapse controls.

Deferred outside this issue:

- Full Content table renderer.
- Full Core Search 1000+ result virtualization/copy/bookmark/context-button parity.
- Further indexed/batched filter performance work if rapid-click FPS still fails user testing.

Closure verification:

- `pnpm run verify` passed in product worktree: `eslint .`, `svelte-check`, Prettier check, stylelint, production build plugin, `42` unit files / `149` tests, and scorecard `17` checks.
- Build synced to `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`.
- `plugin-dev` reload/open passed.
- Runtime DOM smoke confirmed Files Grid, Files Table resize, Content header order, Content landing, Content sort menu, `doneh` search result, and Content expand/collapse behavior.
- Final `dev:errors` and debugger-attached console capture were clean.

## Progress History

Detailed progress history was sharded to keep this issue record navigable:

- [[016-explorer-view-parity-and-stat-card-routing/index|SDF-016 progress history index]]
- [[016-explorer-view-parity-and-stat-card-routing/2026-06-07-progress|2026-06-07 progress shard]]
- [[016-explorer-view-parity-and-stat-card-routing/2026-06-06-progress|2026-06-06 progress shard]]
