---
title: Toolbar coexistence, F&R two-input, recent searches, merge stack
type: spec
status: draft
parent: "[[docs/work/polish/index|polish]]"
created: 2026-05-13T18:00:00
updated: 2026-05-13T18:00:00
tags:
  - agent/spec
  - initiative/polish
  - toolbar
  - search-island
  - fnr
  - recent-searches
  - merge-stack-island
  - overlay-state
created_by: opus
updated_by: opus
glossary_candidates:
  - search island overlay
  - inline toolbar search
  - F&R two-input
  - recent searches strip
  - merged stack island
  - stack view (filters | queue)
---

# Toolbar Coexistence, F&R Two-Input, Recent Searches, Merge Stack

This spec captures the polish-layer redesign requested on 2026-05-13 against
the Vaultman Prototype v4 reference bundle
(`api.anthropic.com/v1/design/h/P3FMDSieqCGmM4o9EEAqhw`). The reference
prototypes are React mockups; implementation is Svelte against the current
codebase on `claude/explorer`.

## Source Trigger

User message (chat3.md → Vaultman Prototype v4 handoff):

> Haz que el search island, el bottom nav (pill+fabs) y el queue/filters
> island puedan estar abiertos al mismo tiempo y estén en el mismo z-index
> para que lo único que se cubra sea el tab content. Que la sección stacked
> que creaste en search se vea en el filters island y reemplaces ese espacio
> con otro input para operar un renombramiento (de ahí el nombre find &
> replace). Que el common in {selected tab} sea más bien un recent searches
> con una opción para cambiar el número de resultados que muestra (máximo
> 4 rows como default, número variable de chips mientras no supere el número
> de rows admitido).

## Approved Direction

Three coordinated specs ship sequentially under this index. Each spec is
independently mergeable. A fourth spec — the WYSIWYG theme builder where
toolbar primitives behave like homescreen widgets — is deferred and will
carry its own brainstorm + spec; it will absorb the settings introduced
here.

| Decision     | Choice                                                                 |
| ------------ | ---------------------------------------------------------------------- |
| Coexistence  | A2 — lift search island into `serviceOverlayState`; nav + filters/queue + search coexist at `$vm-z-index-island`. Filters↔queue stay mutually exclusive. |
| Inline search| Setting `toolbarSearchMode: 'island' \| 'inline'`. Inline mode renders the searchbox as a permanent toolbar primitive in a hard-coded position; clicking the expand icon promotes the session to the overlay variant. Widget-style arrangement is the theme builder's job (Spec 4). |
| F&R inputs   | B2 default — Replace input collapsed behind an "F&R" pill. Setting `fnrReplaceAlwaysVisible: boolean` flips to B1 (replace input always visible). Stacked-chip preview removed from search island; chips render in filters island only. |
| Recent searches | C1 — replace `Common in {tab}` with `Recent searches · {tab}`. Inline stepper `− N rows +` (default 4, range 1..8). Chip count adapts to fit within N rows. Setting `recentSearchesRows: number`. Per-tab history list backed by existing `searchHistory`. |
| Merge stack  | Setting `mergedStackIsland: boolean`. OFF (default) keeps two distinct shells. ON renders a single shell with arrow-nav header; arrows swap between filters view and queue view with a 180ms cross-fade. |
| Settings home | Toggles live in `settingsVM.ts` until the theme builder ships. Spec 4 will promote them. |

## Shards

| Shard | Topic |
| ----- | ----- |
| [[01-search-coexistence\|01-search-coexistence]] | Lift search island to overlay state; relax mutual exclusion; add inline-toolbar variant. |
| [[02-fnr-recents\|02-fnr-recents]] | F&R two-input pill (B2 default, B1 setting); recent searches strip + row stepper. |
| [[03-merge-stack-island\|03-merge-stack-island]] | `mergedStackIsland` setting with arrow-nav single shell. |

## Out of Scope (Deferred → Spec 4 brainstorm)

- WYSIWYG theme builder UI (drag-and-drop primitive arrangement, snap grid,
  persistence schema, theme presets, reset, undo).
- DnD reordering of toolbar primitives.
- Promotion of the settings introduced here into the theme builder panel.
- Theme preview surface.

## Cross-Cutting Concerns

- **Tests:** every shard ships its own focused unit + component tests. No
  shared snapshot fixtures across shards.
- **Z-index discipline:** any new overlay uses `$vm-z-index-island` (50);
  popups stay at `$vm-z-index-popup` (100). No new ad-hoc values.
- **Settings migration:** new keys added to `typeSettings.ts` with safe
  defaults so existing installations boot without manual migration.
- **i18n:** new copy ("Recent searches", "Rename → new ...", arrow tooltips)
  goes through `translate(...)` so theme builder copy stays portable.
- **A11y:** stepper, F&R pill, and arrow-nav header expose
  `aria-label`/`aria-controls`/`aria-pressed` per existing conventions in
  `Toolbar.svelte`.

## Decisions Log

| Date       | Decision | Rationale |
| ---------- | -------- | --------- |
| 2026-05-13 | A2 over A1 | User wants search as a true overlay sibling and a future inline-toolbar variant; A1 (surgical relax) would block the inline mode. |
| 2026-05-13 | B2 default, B1 setting | User asked for B2 as default with a setting to opt into B1; preserves a clean default while letting power users keep the replace field visible. |
| 2026-05-13 | C1 over C2 | User explicitly asked for an inline option to change row count; theme builder will mirror it later. |
| 2026-05-13 | Decompose into 3 shards + defer theme builder | Theme builder is a multi-week subsystem; bundling would block the simpler wins. |
| 2026-05-13 | Settings live in `settingsVM.ts` now | Avoid premature plumbing into a builder that does not exist; theme builder spec will migrate them. |

## References

- Design bundle: `api.anthropic.com/v1/design/h/P3FMDSieqCGmM4o9EEAqhw`
  (Vaultman Prototype v4) — gzipped tar with `proto-v4/{app,search-island,
  stack-island,pages,popups,sidebar,data,desktop}.jsx` and `chats/chat{1..3}.md`.
- Current implementation entry points:
  [[Toolbar.svelte|src/components/layout/Toolbar.svelte]],
  [[frameVaultman.svelte|src/components/frame/frameVaultman.svelte]],
  [[frameOverlays.svelte.ts|src/components/frame/frameOverlays.svelte.ts]],
  [[serviceFnRIsland.svelte.ts|src/services/serviceFnRIsland.svelte.ts]],
  [[_islands.scss|src/styles/popup/_islands.scss]],
  [[_v3-nav.scss|src/styles/nav/_v3-nav.scss]].
- Related prior work:
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/04-thread-ecosystem-interception|T4 Ecosystem & Interception]] (FnR + vmPopover integration).
