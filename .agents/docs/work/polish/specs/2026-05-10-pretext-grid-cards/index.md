---
title: Pretext grid cards hybrid layout
type: spec
status: active
parent: "[[docs/work/polish/index|polish]]"
created: 2026-05-10T00:00:00
updated: 2026-05-10T00:00:00
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

The user wants a hybrid exploration path: preserve the current grid while adding
a distinct cards/tiles path so multiple visual results can be compared before
deciding what remains in v1.0. This is intentionally a growth-stage experiment,
not a destructive replacement of current explorer views.

Approved first-slice decisions:

- the visible mode name is `cards`;
- `dnd` stays deferred until a real drag/drop implementation exists;
- card heights use bucketed variable sizing, not free per-pixel heights;
- Pretext measurement runs around the virtualizer window plus overscan, backed
  by in-memory caches, not eagerly across every provider node.

## Context

- Current `ViewNodeGrid.svelte` uses fixed view-size presets from
  `serviceViewSize.ts`, including tile width, tile height, icon size, label line
  clamp, gap, and tree row height.
- Current `ViewNodeTable.svelte` is a dense table with fixed
  `TABLE_ROW_HEIGHT = 32`; multiline table rows are not the first slice.
- Current node-table spec explicitly scoped fixed row height for MVP.
- `@chenglou/pretext` is the candidate measurement engine. It should be treated
  as a pure text layout utility: `prepare()` results must be cached, `layout()`
  is the hot path, and layout precision depends on matching the actual rendered
  font, line height, letter spacing, and available width.
- `@svar-ui/svelte-filemanager` is already present as a separate command-opened
  module via `ViewSvarFileManager.svelte`. It is a reference surface for missing
  filemanager affordances, not something to absorb or delete in this slice.

## User Direction

- Start with cards/grid/tiles, not multiline tables.
- Use a hybrid route first:
  - keep the current grid mode available;
  - add or expose a card/tile mode where Pretext can drive measured text;
  - compare outcomes visually before deciding which modes stay.
- Name the first measured mode `cards`, because the shared view type and overlay
  already expose that vocabulary.
- Keep `dnd` out of the first visible slice. It may be hidden or disabled until
  `dnd-kit` work has its own implementation plan.
- Measure provider-specific card content, not only labels. The first measured
  cards should account for label, detail, and visible metadata selected by the
  view-menu field pills.
- Treat the existing view-menu pills as the intended field-selection UI. They
  currently appear to be overlay-local state, so this slice should connect them
  to the node render/layout contract before relying on them for card geometry.
- Consider future `dnd-kit` node drag/drop and resize work, but do not couple
  them to the first Pretext slice until measured geometry is stable.
- Use PKM-AI records so the technical decisions do not stay only in chat.

## First Slice Goal

Add the smallest useful measured-card capability while preserving existing grid
behavior:

- keep current grid presets unchanged for compact icon/grid workflows;
- introduce a separate cards/tiles route or explicit view mode for measured
  node cards;
- compute card height from node label/detail/provider metadata using a
  service-level text measurement contract;
- map raw measured text height into stable card-size buckets such as compact,
  standard, tall, and expanded;
- make view-menu field pills drive the fields shown and measured by cards;
- enforce minimum visible identity rules such as "do not allow both icon and
  text/name to be hidden";
- feed measured row heights into the existing TanStack virtualizer pattern with
  durable item keys;
- retain selection, focus, active-node state, hover badges, context menus, and
  keyboard behavior from the existing node grid contracts.

## Proposed Architecture

Create a deep module for text measurement instead of embedding Pretext directly
inside Svelte components.

Candidate service boundary:

- `serviceTextMeasure.ts`
  - owns Pretext import and fallback behavior;
  - caches prepared text by text/content hash;
  - caches layouts by prepared text key, style key, width, max lines, and
    overflow policy;
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

Prefer a separate `ViewNodeCards.svelte` if the markup diverges materially from
the current icon grid. Prefer extending `ViewNodeGrid.svelte` only if the card
mode can share most of the existing tile structure without conditional sprawl.

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
- field changes recompute card layout reactively without rebuilding unrelated
  explorer state;
- impossible configurations are prevented or repaired, especially hiding every
  identity field;
- field visibility state is persistent and keyed by provider/view, because
  useful cards for files, tags, props, and content differ.

Current implementation note: `activePills` appears local to
`overlayViewMenu.svelte`; the overlay can reset it per tab or view mode, but the
state is not yet visible to `panelExplorer.svelte`, `ViewNodeGrid.svelte`, or a
future `ViewNodeCards.svelte`. Wiring this state is part of the first slice, not
optional polish.

Additional routing note: `ExplorerViewMode` already includes `cards`, and
`overlayViewMenu.svelte` already shows a Cards mode. The same overlay also shows
`dnd`, while the shared explorer view type does not include `dnd`; `panelExplorer`
currently handles `tree`, `grid`, and `table`. The first slice should reconcile
this vocabulary before introducing measured cards, otherwise the user can select
visible controls whose target views are fallback/no-op states.

Approved routing decision: keep `cards` as the first new real view. Treat `dnd`
as deferred vocabulary and prevent it from behaving like a working mode until
there is a dedicated drag/drop slice.

## Persistence Contract

Field visibility should persist as a real Vaultman setting, not only as local UI
state. Candidate settings shape:

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
- write normalized arrays back through `plugin.saveSettings()` only on explicit
  user pill changes, not during mount;
- keep array ordering stable so settings diffs remain readable.

This persistence contract deliberately belongs to field visibility, not Pretext.
Pretext consumes the normalized visible-field set and measured style snapshot;
it should not know about `VaultmanSettings`.

## Height Strategy

Use bucketed variable card heights.

Pretext produces measured line data, but the UI should not directly use every
pixel as a distinct virtual row size. Instead, `serviceNodeCardLayout.ts` should
map measured content into stable buckets:

- `compact`: identity plus one short metadata line;
- `standard`: identity plus common metadata;
- `tall`: multiple visible metadata fields or wrapped text;
- `expanded`: long content/search snippets that need extra room.

The exact pixel values can live beside `serviceViewSize.ts` so they can align
with existing grid presets. Bucketed heights reduce scroll offset churn, make
visual comparisons easier, and still let Pretext decide which bucket a node
belongs to.

## Measurement Timing

Measure lazily around the virtualizer window plus overscan.

The card view should not premeasure every node in a large provider model. The
first slice should:

- compute cheap fallback bucket heights for all nodes;
- ask the virtualizer for visible plus overscan rows;
- measure cards in or near that window;
- cache measured results by node content key, visible-field key, style key,
  width bucket, and card preset;
- update virtualizer options when cached measurements change;
- keep scrolling usable while measurements warm up.

## Font And Theme Contract

Pretext measurement must be invalidated when the rendered text style changes.

The first slice should define a style snapshot for node cards:

- font family resolved from Obsidian/Vaultman CSS variables;
- font size in pixels;
- font weight;
- line height in pixels;
- letter spacing in pixels;
- text transform if used;
- available content width after icon, padding, badges, and gaps.

If the style snapshot cannot be resolved reliably, fallback to the existing
fixed preset height rather than showing unstable scroll geometry.

## SVAR Reference Use

Use the SVAR filemanager as a comparison source, not a dependency target:

- inspect which filemanager affordances are already solved there;
- compare density, row/card affordances, icon sizing, drag/drop affordances,
  and resize behavior;
- record useful patterns before deciding whether Vaultman should absorb,
  imitate, or discard the SVAR module later;
- avoid routing core explorer state through SVAR in this slice.

## Deferred Work

These are important but not part of the first Pretext slice:

- multiline `ViewNodeTable` rows;
- `dnd-kit` integration for node reordering or drag-to-filter behavior;
- resize handles for nodes/cards;
- persisted card sizing preferences beyond existing view-size settings;
- absorbing or deleting the SVAR filemanager module;
- table column resizing or table measured cells;
- broad visual redesign of explorer chrome.

## Testing And Verification Targets

- Unit tests for `serviceTextMeasure` cache keys, fallback behavior, and
  deterministic height calculation around mocked Pretext output.
- Unit tests for `serviceNodeCardLayout` mapping node data to card layout
  budgets.
- Unit tests for card height bucket selection from measured text results.
- Unit tests for `serviceNodeFieldVisibility` defaulting, provider/view keys,
  invalid-field pruning, persistence payloads, and identity repair.
- Component tests proving card mode keeps selected, focused, active, hover
  badge, context menu, and keyboard contracts from grid mode.
- Component tests proving view-menu pill toggles persist by provider/view and
  drive the fields passed to measured cards.
- Virtualizer tests proving measured row heights and durable keys are passed to
  TanStack virtualizer options.
- Obsidian smoke test comparing current grid mode and measured cards mode in the
  same vault.
- Performance probe around first render, resize, and rapid scroll in a large
  node set.

## Open Design Questions

1. Answered: the first visible measured mode is named `cards`.
2. Answered: cards should measure label/detail plus provider-specific visible
   metadata selected through the view-menu field pills.
3. Answered: card heights are bucketed variable heights.
4. Answered: Pretext measurement happens lazily around the virtualizer window
   plus overscan.
5. What SVAR behaviors are reference-only, and which are candidates for
   eventual Vaultman-native behavior?

## Sources

- PretextJS: https://github.com/chenglou/pretext
- Current table spec:
  [[docs/work/polish/specs/2026-05-07-tanstack-node-table/index|TanStack node table]]
- Current node table component: `src/components/views/ViewNodeTable.svelte`
- Current node grid component: `src/components/views/ViewNodeGrid.svelte`
- Current grid sizing service: `src/services/serviceViewSize.ts`
- SVAR module: `src/components/views/ViewSvarFileManager.svelte`
