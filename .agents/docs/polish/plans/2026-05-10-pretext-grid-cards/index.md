---
title: Pretext grid cards implementation plan
type: implementation-plan-index
status: done
parent: "[[docs/work/polish/specs/2026-05-10-pretext-grid-cards/index|pretext-grid-cards]]"
created: 2026-05-10T00:00:00
updated: 2026-05-10T04:17:31
tags:
  - agent/plan
  - initiative/polish
  - performance
  - explorer/views
  - cards
  - pretext
created_by: codex
updated_by: codex
---

# Pretext Grid Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. Use test-driven-development for each
> behavior change and run Svelte autofixer before finalizing any Svelte
> component.

**Goal:** Add a persistent, field-configurable `cards` explorer mode whose node
heights are bucketed from Pretext-measured label, detail, and provider metadata.

**Architecture:** Keep current `grid` behavior intact, make view-menu field
pills a persisted provider/view contract, wrap Pretext behind a pure service,
then render cards through a new Svelte component that shares node selection and
virtualizer patterns with `ViewNodeGrid`. Defer `dnd-kit`, node resize handles,
and multiline tables.

**Tech Stack:** TypeScript, Svelte 5 runes, `@chenglou/pretext`,
`@tanstack/svelte-virtual`, Vitest unit/component tests, SCSS partials,
existing `NodeSelectionService`, existing Vaultman settings persistence.

---

## Source Records

- [[docs/work/polish/specs/2026-05-10-pretext-grid-cards/index|Pretext grid cards hybrid layout]]
- [[docs/work/polish/specs/2026-05-07-tanstack-node-table/index|TanStack node table]]
- [[docs/work/performance/research/2026-05-09-durable-virtualizer-keys|Durable TanStack virtualizer keys]]
- [[docs/current/engineering-context|Engineering context]]
- [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/07-css-font-snapshot|CSS font snapshot follow-up result]]
- PretextJS: https://github.com/chenglou/pretext

## Execution Rules

- Do not change current `grid` behavior while making `cards` real.
- Do not implement `dnd-kit`, resize handles, or multiline table rows in this
  slice.
- Do not let Pretext know about `VaultmanSettings`; field visibility normalizes
  settings, card layout consumes normalized fields.
- Do not call `plugin.saveSettings()` on mount. Persist only explicit user pill
  changes.
- Do not commit unless the active user explicitly asks for commits.
- Keep `main` free of AI workflow files.

## File Map

- Modify `package.json` and `pnpm-lock.yaml`: add runtime dependency
  `@chenglou/pretext`.
- Modify `src/types/typeSettings.ts`: add `viewFieldVisibility?: Record<string, string[]>`
  and default `{}`.
- Create `src/services/serviceNodeFieldVisibility.ts`: provider/view field
  definitions, settings normalization, identity repair, and persistence helpers.
- Create `test/unit/services/serviceNodeFieldVisibility.test.ts`.
- Create `src/services/serviceTextMeasure.ts`: Pretext wrapper, cache keys,
  fallback engine, and line-height layout helper.
- Create `test/unit/services/serviceTextMeasure.test.ts`.
- Create `src/services/serviceNodeCardLayout.ts`: node-to-card field extraction,
  card text budgets, bucketed height selection, and row layout helpers.
- Create `test/unit/services/serviceNodeCardLayout.test.ts`.
- Modify `src/components/layout/overlays/overlayViewMenu.svelte`: consume field
  definitions and visible fields from props, remove disconnected local pill state,
  and hide `dnd` until it has an implementation.
- Modify `src/components/layout/navbarExplorer.svelte`: pass field definitions
  and visible fields into the overlay.
- Modify `src/components/pages/pageFilters.svelte`: derive and persist active
  visible fields by provider/view, and pass provider-specific visible fields to
  each tab.
- Modify `src/components/pages/tabFiles.svelte`,
  `src/components/pages/tabProps.svelte`, `src/components/pages/tabTags.svelte`,
  and `src/components/pages/tabContent.svelte`: forward `visibleFields`.
- Modify `src/components/containers/panelExplorer.svelte`: route `cards` to a
  new component, compute card nodes, and include cards in visible id logic.
- Create `src/components/views/ViewNodeCards.svelte`: virtualized cards mode.
- Create `src/styles/data/_cards.scss` and modify `src/main.scss`.
- Modify `test/component/overlayViewMenu.test.ts`,
  `test/component/panelExplorerEmpty.test.ts`,
  `test/component/panelExplorerSelection.test.ts`, and
  `test/component/virtualizerItemKeys.test.ts`.
- Create `test/component/viewNodeCards.test.ts`.

## Task Order

1. [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/01-field-visibility|Field visibility settings contract]]
2. [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/02-pretext-measurement|Pretext measurement service]]
3. [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/03-card-layout|Node card layout service]]
4. [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/04-view-menu-routing|View-menu and settings wiring]]
5. [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/05-card-view|Cards view component and panel route]] - done
6. [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/06-verification|Verification and documentation]] - done

## Post-Plan Follow-Up

- [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/07-css-font-snapshot|CSS font snapshot follow-up result]] -
  done. This supersedes the first-slice fixed local card style snapshot with a
  rendered CSS snapshot service and keeps the fixed values only as fallback.

## Completion

Completed on 2026-05-10T02:37:32; CSS font snapshot follow-up completed on
2026-05-10T04:17:31. The implementation status and verification evidence live in
[[docs/work/polish/specs/2026-05-10-pretext-grid-cards/index|Pretext grid cards hybrid layout]]
and the Task 5/6/7 result records.

## Stop Conditions

- Stop if `@chenglou/pretext` types do not expose `prepare` and `layout` as
  documented by the official README.
- Stop if a card route requires changing `NodeSelectionService` semantics.
- Stop if cards cannot preserve row/tile selection, context menu, and keyboard
  behavior already covered by grid tests.
- Stop if field visibility persistence causes settings writes during component
  mount.
- Stop if Svelte autofixer reports unresolved component issues after the cards
  component or overlay edits.
