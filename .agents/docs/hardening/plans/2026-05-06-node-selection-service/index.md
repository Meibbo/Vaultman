---
title: Node selection service implementation plan
type: implementation-plan-index
status: completed
parent: "[[docs/work/hardening/specs/2026-05-06-node-selection-service/index|node-selection-service]]"
created: 2026-05-06T07:05:00
updated: 2026-05-06T19:21:11
tags:
  - agent/plan
  - initiative/hardening
  - explorer/selection
  - explorer/views
---

# Node Selection Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use test-driven-development for
> each phase. Use subagent-driven-development when executing this plan. Each
> phase below has an explicit write scope so subagents can work without
> overwriting each other.

**Goal:** move node selection into its own service, restore normal tree
interactions, and create a generic `viewGrid` that uses the same selection
model.

**Architecture:** create a Svelte 5 selection service as the owner of selected
ids, anchor, focus, hover, and active node per explorer id. Keep tree and grid
as adapters that report user intent. Keep provider domain actions in providers.

**Tech Stack:** TypeScript, Svelte 5 runes, `svelte/reactivity` `SvelteMap` and
`SvelteSet`, Vitest unit and component tests, existing Obsidian mocks, existing
context-menu service.

## Source Records

- [[docs/work/hardening/specs/2026-05-06-node-selection-service/index|Node selection service and viewgrid spec]]
- [[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|Explorer view service spec]]
- [[docs/current/engineering-context|engineering context]]
- WAI-ARIA APG Tree View Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
- WAI-ARIA APG Grid Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
- Svelte docs loaded for `.svelte.ts`, `$state`, `$derived`, document/window
  events, class binding, and Vitest component testing.

## Phase Order

1. [[docs/work/hardening/plans/2026-05-06-node-selection-service/01-selection-service|Selection service]]
2. [[docs/work/hardening/plans/2026-05-06-node-selection-service/02-tree-adapter|Tree adapter]]
3. [[docs/work/hardening/plans/2026-05-06-node-selection-service/03-provider-actions|Provider actions]]
4. [[docs/work/hardening/plans/2026-05-06-node-selection-service/04-viewgrid|Viewgrid]]
5. [[docs/work/hardening/plans/2026-05-06-node-selection-service/05-visual-accessibility|Visual accessibility]]
6. [[docs/work/hardening/plans/2026-05-06-node-selection-service/06-verification|Verification]]

## Subagent Strategy

Phase 1 must run first because it defines the service interface.

After Phase 1:

- Tree adapter and provider-action tests can be split but must coordinate on
  `panelExplorer.svelte`.
- Viewgrid can run in parallel with provider-action work if it only consumes
  the Phase 1 service and avoids provider internals.
- If `viewGrid.svelte` replacement risks breaking file workflows, create
  `ViewNodeGrid.svelte` first and let a later cleanup rename or retire the old
  file-grid adapter.
- Visual accessibility should run after tree and grid markup stabilize.
- Verification runs last and must inspect all touched files.

## Stop Conditions

- Stop if provider primary action semantics are ambiguous enough to require a
  product decision. The current assumption is: row slot selects; label/action
  zone activates.
- Stop if the generic grid cannot be built without deleting file workflows.
  Move the old file-specific grid to a compatibility name instead of losing
  behavior.
- Stop if tests show `ViewService` and the new selection service fight over the
  same state. In that case, make `ViewService` delegate selection snapshots
  rather than mirroring manually.
