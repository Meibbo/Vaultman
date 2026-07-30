---
title: Pretext grid cards hybrid layout
type: spec
status: done
parent: "[[docs/work/polish/index|polish]]"
created: 2026-05-10T00:00:00
updated: 2026-05-10T04:17:31
tags:
  - agent/spec
  - initiative/polish
  - performance
  - explorer/views
  - grid
  - cards
  - pretext
created_by: codex
updated_by: codex
glossary_candidates:
  - PretextJS
  - measured card layout
  - hybrid view mode
  - SVAR filemanager
---


# Pretext Grid Cards Hybrid Layout

Design draft for the first PretextJS slice in Vaultman.

The user wants a hybrid exploration path: preserve the current grid while adding a distinct cards/tiles path so multiple visual results can be compared before deciding what remains in v1.0. This is intentionally a growth-stage experiment, not a destructive replacement of current explorer views.

Approved first-slice decisions:

- the visible mode name is `cards`;
- `dnd` stays deferred until a real drag/drop implementation exists;
- card heights use bucketed variable sizing, not free per-pixel heights;
- Pretext measurement runs around the virtualizer window plus overscan, backed by in-memory caches, not eagerly across every provider node.

## Context

- Current `ViewNodeGrid.svelte` uses fixed view-size presets from `serviceViewSize.ts`, including tile width, tile height, icon size, label line clamp, gap, and tree row height.
- Current `ViewNodeTable.svelte` is a dense table with fixed `TABLE_ROW_HEIGHT = 32`; multiline table rows are not the first slice.
- Current node-table spec explicitly scoped fixed row height for MVP.
- `@chenglou/pretext` is the candidate measurement engine. It should be treated as a pure text layout utility: `prepare()` results must be cached, `layout()` is the hot path, and layout precision depends on matching the actual rendered font, line height, letter spacing, and available width.
- `@svar-ui/svelte-filemanager` is already present as a separate command-opened module via `ViewSvarFileManager.svelte`. It is a reference surface for missing filemanager affordances, not something to absorb or delete in this slice.

## User Direction

- Start with cards/grid/tiles, not multiline tables.
- Use a hybrid route first:
  - keep the current grid mode available;
  - add or expose a card/tile mode where Pretext can drive measured text;
  - compare outcomes visually before deciding which modes stay.
- Name the first measured mode `cards`, because the shared view type and overlay already expose that vocabulary.
- Keep `dnd` out of the first visible slice. It may be hidden or disabled until `dnd-kit` work has its own implementation plan.
- Measure provider-specific card content, not only labels. The first measured cards should account for label, detail, and visible metadata selected by the view-menu field pills.
- Treat the existing view-menu pills as the intended field-selection UI. They currently appear to be overlay-local state, so this slice should connect them to the node render/layout contract before relying on them for card geometry.
- Consider future `dnd-kit` node drag/drop and resize work, but do not couple them to the first Pretext slice until measured geometry is stable.
- Use PKM-AI records so the technical decisions do not stay only in chat.

## First Slice Goal

Add the smallest useful measured-card capability while preserving existing grid behavior:

- keep current grid presets unchanged for compact icon/grid workflows;
- introduce a separate cards/tiles route or explicit view mode for measured node cards;
- compute card height from node label/detail/provider metadata using a service-level text measurement contract;
- map raw measured text height into stable card-size buckets such as compact, standard, tall, and expanded;
- make view-menu field pills drive the fields shown and measured by cards;
- enforce minimum visible identity rules such as "do not allow both icon and text/name to be hidden";
- feed measured row heights into the existing TanStack virtualizer pattern with durable item keys;
- retain selection, focus, active-node state, hover badges, context menus, and keyboard behavior from the existing node grid contracts.

## Proposed Architecture

Create a deep module for text measurement instead of embedding Pretext directly inside Svelte components.

Candidate service boundary:

- `serviceTextMeasure.ts`
  - owns Pretext import and fallback behavior;
  - caches prepared text by text/content hash;
  - caches layouts by prepared text key, style key, width, max lines, and overflow policy;
  - exposes plain TypeScript functions for tests and components.
- `serviceNodeCardLayout.ts`
  - maps `TreeNode` data to card layout inputs;
  - chooses title/detail/meta text budgets from visible-field settings;
  - returns measured card height and text-line metadata;
  - remains independent of Obsidian `App` and DOM nodes.
- `serviceNodeFieldVisibility.ts`
  - owns the allowed field vocabulary per provider and view mode;
  - normalizes the view-menu pill state into a stable visible-field set;
  - enforces identity constraints such as icon-or-text/name must remain visible;
  - persists user preferences without changing card measurement APIs.
- `ViewNodeCards.svelte` or a card mode inside `ViewNodeGrid.svelte`
  - consumes precomputed row/card layouts;
  - preserves node interaction props shared with `ViewNodeGrid.svelte`;
  - sends measured row heights to `createVirtualizer().estimateSize(index)`.

Prefer a separate `ViewNodeCards.svelte` if the markup diverges materially from the current icon grid. Prefer extending `ViewNodeGrid.svelte` only if the card mode can share most of the existing tile structure without conditional sprawl.

## Field Visibility Pills

`overlayViewMenu.svelte` already defines pill sets for tabs and view modes:

- `tags`: icon, text, count, files, nested, date;
- `props`: icon, text, count, type, values, date;
- `files-grid`: name, date, tags, path, size;
- `files-tree`: name, ext, date, tags, path;
- `content`: path, text, date.

The first cards slice should turn these pills into a product contract:

- active pills define which fields are rendered;
- the same active pills define which text Pretext measures;
- field changes recompute card layout reactively without rebuilding unrelated explorer state;
- impossible configurations are prevented or repaired, especially hiding every identity field;
- field visibility state is persistent and keyed by provider/view, because useful cards for files, tags, props, and content differ.

Current implementation note: `activePills` appears local to `overlayViewMenu.svelte`; the overlay can reset it per tab or view mode, but the state is not yet visible to `panelExplorer.svelte`, `ViewNodeGrid.svelte`, or a future `ViewNodeCards.svelte`. Wiring this state is part of the first slice, not optional polish.

Additional routing note: `ExplorerViewMode` already includes `cards`, and `overlayViewMenu.svelte` already shows a Cards mode. The same overlay also shows `dnd`, while the shared explorer view type does not include `dnd`; `panelExplorer` currently handles `tree`, `grid`, and `table`. The first slice should reconcile this vocabulary before introducing measured cards, otherwise the user can select visible controls whose target views are fallback/no-op states.

Approved routing decision: keep `cards` as the first new real view. Treat `dnd` as deferred vocabulary and prevent it from behaving like a working mode until there is a dedicated drag/drop slice.

## Persistence Contract

Field visibility should persist as a real Vaultman setting, not only as local UI state. Candidate settings shape:

```ts
viewFieldVisibility?: Record<string, string[]>;
```

Recommended key format:

```ts
`${providerId}:${viewMode}`
```

Examples:

- `files:grid`
- `files:cards`
- `tags:cards`
- `props:cards`
- `content:cards`

`serviceNodeFieldVisibility.ts` should own defaulting and normalization:

- read `plugin.settings.viewFieldVisibility?.[key]`;
- fall back to provider/view defaults when missing;
- discard unknown field ids during migration or plugin upgrades;
- repair invalid identity state before returning a visible-field set;

Continua en [[docs/work/polish/specs/2026-05-10-pretext-grid-cards/index-shard-1|continuacion 1]].