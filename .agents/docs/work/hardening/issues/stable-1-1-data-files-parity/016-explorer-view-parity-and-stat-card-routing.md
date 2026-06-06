---
title: SDF-016 Explorer view parity and Statistics card routing
type: issue
issue_id: SDF-016
status: needs-triage
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T11:15:23
updated: 2026-06-06T11:15:23
labels:
  - needs-triage
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

- [ ] Start by resolving or explicitly depending on
      [[011-bases-parity-table-view-layout|SDF-011 Bases-parity table view layout]]; do not expand table
      view to more explorers while the current table presentation remains broken.
- [ ] Props, Tags, Files, and Content explorer surfaces expose table view only after the table renderer
      has acceptable Bases/core-class parity, column separation, resize affordances, and stable scroll.
- [ ] Files explorer exposes grid view in addition to tree and table once the grid interaction defects are
      resolved for file nodes.
- [ ] View menu copy and icons make the difference between grid, table, tree, and future views explicit.
- [ ] Page Statistics card clicks route to the matching Data explorer:
      - folders and files cards route to Data / Files.
      - props and values cards route to Data / Props.
      - tags card routes to Data / Tags.
      - word count card routes to Data / Content.
- [ ] Routing preserves the user's existing active filters/search where possible and does not clear state
      unless a card explicitly requests a new filter.
- [ ] Clicking a Statistics card closes open islands and puts the Data page into a stable active tab state.
- [ ] Add focused tests or source guards for the view-mode availability map and Statistics card-to-tab
      routing map.
- [ ] `plugin-dev` smoke confirms each Statistics card navigates to the expected Data tab and the target
      explorer remains scrollable.

## Blocked By

- [[011-bases-parity-table-view-layout|SDF-011 Bases-parity table view layout]] for table view expansion.
- Files grid interaction defects already reported by the user: grid view must support selection, context
  menu, badges/decorations, and file-specific affordances before becoming a normal Files view.

## Notes

The Statistics card routing is useful independently, but implementing it together with the view-parity
work keeps the Data surface navigation contract coherent: Statistics becomes a map into the same explorer
surfaces whose view modes are being normalized.
