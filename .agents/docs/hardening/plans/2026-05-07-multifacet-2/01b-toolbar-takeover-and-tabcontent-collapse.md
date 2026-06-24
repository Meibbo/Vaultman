---
title: Phase 1b — toolbar takeover full reflow + tabContent single-input collapse
type: implementation-plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-07-multifacet-2/index|multifacet wave 2 plan]]"
created: 2026-05-07T06:50:00
updated: 2026-05-07T06:50:00
tags:
  - agent/plan
  - explorer/find-replace
created_by: claude
updated_by: claude
---

# Phase 1b — Toolbar Takeover Full Reflow And TabContent Collapse

> Phase 1a context:
> [[docs/work/hardening/plans/2026-05-07-multifacet-2/01-fnr-island-island|FnR toolbar island and crear button]]

## Scope

Phase 1a shipped the searchbox-mounted island, mode pill, `crear` button,
toolbar takeover dim/disable styling, Esc + outside-click collapse, and
the `explorerAddOps` registry. Tasks 4 and 5 of the original phase 1
shard remain:

- [x] In `src/components/pages/tabContent.svelte`: collapse the
      three `.vm-content-fnr-input` rows into ONE searchbox + mode
      pill. Pill toggles between `search` and `replace`. Delete the
      separate replace input and the third options-row input. Keep
      scope toggle + queue-replace button.
- [x] Move `view` and `sort` menus to the right side of the toolbar
      in `navbarExplorer.svelte`. Apply minimalist class. Update the
      relevant SCSS partial under `src/styles/explorer/`.

## Tests

- [x] `test/component/explorerContentSingleInput.test.ts` — content
      explorer renders exactly one input regardless of pill mode.
      (2 tests pass)
- [x] `test/component/navbarToolbarMenuPlacement.test.ts` — view/sort
      menus rendered right of crear with minimalist class. (1 test
      pass)

## Notes

- Phase 1a left the `.vm-fnr-island.vm-fnr-rename` block reachable via
  the legacy `fnrState` prop, but mounted INSIDE the searchbox row.
  Phase 1b should keep that mount point when collapsing
  `tabContent.svelte` so the rename handoff still works for content.
- Toolbar takeover currently applies `opacity` + `pointer-events: none`
  on `.vm-nav-icon`, `.vm-filters-help-wrap`, and `.vm-filters-crear`.
  When phase 1b moves view/sort to the right side, the existing class
  selectors should keep covering them.

## Stop Conditions

- Stop if reducing `tabContent.svelte` to one input breaks the
  existing search↔replace toggle.
- Stop if relocating view/sort buttons triggers TanStack virtualizer
  layout invalidation (the takeover style was chosen to avoid this; do
  not introduce `display:none` swaps).
