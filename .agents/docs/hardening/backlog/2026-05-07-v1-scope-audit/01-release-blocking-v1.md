---
title: "Release-blocking v1 scope from beta 15-18 backlog"
type: backlog-audit-shard
status: active
initiative: hardening
parent: "[[docs/work/hardening/backlog/2026-05-07-v1-scope-audit/index|v1-scope-audit]]"
created: 2026-05-07T06:06:10
updated: 2026-05-07T06:39:54
created_by: codex
updated_by: codex
tags:
  - agent/backlog
  - hardening/v1
---

# Release-Blocking v1 Scope

## Scope Rule

For this project, `release-blocking v1` means the full v1.0 path:

- hardening direct outputs;
- adjacent fixes that naturally belong to those hardening surfaces;
- successor `v1.0 Polish` work from the 2026-04-28 triage.

The previous minimal interpretation was wrong for Vaultman. `out-hardening`
means outside the hardening project but still inside v1.0 Polish unless the
old triage explicitly says `post-rc.1`, `cancelled`, or `already-fixed`.

## Performance And Perceived Responsiveness

- Broad clickable surfaces using `cursor: pointer` are now a triaged backlog
  item: [[docs/work/hardening/backlog/regressions/cursor-affordance-policy|cursor affordance policy]].
- `frameVaultman.svelte` rendering all pages at once remains valid as a
  performance question. It should block v1 only if instrumentation shows idle
  cost, memory cost, or visible lag from inactive pages.
- `serviceSort` date sorting in props/tags hanging the app remains
  release-blocking if reproducible.
- `viewDiff.svelte` memory freezing with large preview sets remains
  release-blocking if live data can still reproduce it. Current code has
  transaction/VFS work and body-size omission tests, so this is not assumed
  unresolved without a live check.

## Core Explorer Correctness

- Search must filter nodes and preserve matching parents in Files, Props, Tags,
  and Content where the provider supports tree search. Current code has
  `provider.setSearchTerm(...)`, provider search methods, and auto-expansion
  tests, but live behavior still needs verification before marking resolved.
- Explorer trees must update after external index changes. Current tests cover
  Props and Tags provider rebuilds after index changes, but the beta 17 report
  specifically mentions the visible virtual tree only refreshing after changing
  views, so this remains a v1 verification target.
- File hierarchy must behave like a normal collapsed tree before filters. Recent
  tree/grid hierarchy work likely covers part of this, but Files needs direct
  verification against nested folders.
- Keyboard navigation and multi-selection are v1 requirements. Arrow left/right,
  generic expand/collapse-all, inline grid hierarchy, and shared node selection
  are implemented and tested; full Up/Down and modifier-selection behavior
  should remain in verification until explicitly covered.

## Queue And Data Safety

- Queue operation counts, touched-file counts, and operation grouping must be
  correct. Current service tests cover file-centric transaction behavior and
  operations index grouping, but beta 17 counter mismatches in low-frequency prop
  operations need a targeted reproduction.
- Operations should pass through the queue rather than immediate file mutation.
  Tags, props, values, and files now have queue/handoff paths in current code;
  this is release-blocking only if a specific direct-mutation path remains.
- Queue UI must allow removing individual staged operations. Current Svelte
  queue explorer has a remove action, and the legacy `componentQueueList` has
  grouped rows. Verify the visible island uses the intended path before marking
  complete.

## Blocking UX If Still Broken

- Internal frame operations should avoid Obsidian modals when an inline or
  in-frame handoff is expected. Current rename handoff routes through the navbar
  FnR island for several providers, but `modalFileRename.ts` still exists and
  the old backlog explicitly asks for inline rename over the node. This needs a
  scope decision before v1 classification.
- Menus/popups that push the explorer downward instead of overlaying it remain
  v1 scope through the `UX Features` polish block, even when they are not
  hardening-critical.

## V1.0 Polish Is Also Release Scope

The old triage assigns these groups to the successor v1.0 Polish project:

- Bases Feature Parity: range filters, editable table/matrix view, all-files-in
  folder filter, logical all/any/none syntax, manual filter syntax, row
  group/manual toggles.
- Theming: minimal variant and frozen default fancy variant.
- UX Features: navKeyboard, serviceDnD, multi-select, auto-scroll/reveal,
  inline rename, explorerOutline, viewDiff snippet/full split, empty states,
  menuView/menuSort/navbarExplorer redesign, panel list CSS, navbarPillFab,
  navbarPages, popupIsland queue UX, listFilters UX, tabContent UX, Files
  explorer features, and default order settings.
- Programmable Interface: serviceAPI foundation, Bases I/O text, and Agent
  Guardrail Skill consumer.

## First UX Slice

The first v1.0 UX slice after current hardening work is perceived performance
and interaction feel:

- implement the cursor affordance policy for broad working surfaces;
- keep hover states cheap and subtle;
- preserve separate hover, focus, selection, active-filter, and pending-op
  states without heavy transitions;
- honor reduced-motion behavior;
- verify that rows, tiles, cards, and frame surfaces feel responsive before
  larger navbar/menu/inline-rename/explorerOutline redesigns.

Implementation boundary: start with SCSS-only cursor and hover changes. Svelte
changes are allowed only when a focused audit shows hover/reveal code mutating
reactive state, causing render cost, or coupling hover to selection/action
logic.

First-pass visual boundary: narrow. Apply the cursor/hover correction only to
broad rows, tiles, cards, file rows, and filter/list rows. Leave navbars,
popups, primitives, badges, chevrons, toggles, links, handles, and explicit
buttons for a later precise audit.
