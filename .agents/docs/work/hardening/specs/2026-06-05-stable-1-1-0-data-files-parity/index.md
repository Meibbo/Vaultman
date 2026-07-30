---
title: Stable 1.1.0 Data/Files parity and native search adapter
type: spec-index
status: ready-for-review
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-06-05T02:37:17
updated: 2026-06-05T02:37:17
tags:
  - agent/spec
  - initiative/hardening
  - release/1.1.0
  - explorer/files
  - explorer/search
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Stable 1.1.0 Data/Files Parity And Native Search Adapter

## Purpose

This spec locks the remaining release-facing work for the current stable update, now treated as `1.1.0` rather than `1.0.2`, because the branch already contains meaningful UX, tooling, explorer, statistics, queue, and layout behavior changes.

The release should make Vaultman feel honest and production-ready: no inert preview button, no fake folder results, no hidden queue policy, no placeholder sort options, no page names that misrepresent the user workflow, and no self-authored content scanner competing with Obsidian's faster native Search pipeline.

## Runtime Evidence

`obsidian vault=plugin-dev eval ...` confirmed:

- Core Search exposes a usable view pipeline: `setQuery`, `startSearch`, `dom.getFiles()`, `dom.getResult(file)`, and result offset arrays in `result.content`.
- No stable public `app.searchIndex.search()` API was found for plugin code. The practical route is a native Search view adapter, not a direct search-index import.
- Core File Explorer uses `fileItems`, `workQueue`, and `tree.infinityScroll`. Its reveal paths call `tree.infinityScroll.scrollIntoView(...)`.
- Vaultman's current `UnifiedTreeView` and `GridView` impose artificial `200` row limits and rebuild the DOM on render. That explains visible latency, stutter, and "show all" behavior that core File Explorer does not need.
- Core auto-reveal uses `lucide-gallery-vertical`.

## Product Contract

### Page Vocabulary

- The page currently keyed as `filters` remains internally keyed as `filters` but is labeled **Data** in the bottom dock.
- The page currently keyed as `ops` remains internally keyed as `ops` but is labeled **Files** in the bottom dock.
- `statistics` remains **Statistics**.
- Internal page IDs are not renamed in this release; preserving `pageOrder` avoids settings migration risk.

### Content Search

- Remove the `Preview` button from the Content tab.
- Search runs automatically after a debounce when the find query changes.
- Plain/native-compatible search uses the core Search view pipeline.
- Results appear progressively as the core Search view updates, rather than waiting for a full vault scan.
- Vaultman keeps its own filter/replace/queue model. It does not port core query UI or saved search semantics.
- Result rows use Obsidian core Search classes where practical, so snippets visually match native Search.
- Clicking a snippet opens the file and scrolls to the matched position.
- Plugin code must not call the Obsidian CLI at runtime; CLI is only a dev verification tool.

### Files Explorer

- Remove artificial `200` render limits and "Show all" controls from Vaultman Files views.
- Replace full container rebuilds with a stable/incremental render path for Files tree/list surfaces.
- Use core-like row classes and DOM structure where it helps with CSS and behavior parity, but do not mount or hijack core File Explorer's live DOM.
- Files must operate on the full vault file universe, not only markdown files. `.base` and other non-markdown files must be searchable and visible in Files results.
- The active Filters island header reports the number of vault files currently passing active filters (`filtered / total files`), decreasing as rules are added.
- Text typed in the Files explorer search box becomes a visible active filter rule because it reduces the Files result set. It must not remain as a hidden local-only filter.
- The Files `grid` mode is user-facing table mode. Internal mode keys may remain stable, but labels and presentation should communicate a table, including an independent extension cell near the metadata/count area.
- Auto reveal uses `lucide-gallery-vertical`, expands ancestors, and scrolls directly to the file row.
- File search expands ancestors so matching files or folders are visible.
- When active filters exist and zero files match, Files shows an empty landing instead of empty folders.
- Folder nodes expose context menu actions for:
  - filter to this folder,
  - exclude this folder,
  - rename folder,
  - move folder,
  - delete folder.
- File and folder nodes show queue decorations/badges for staged file-system operations.

### Queue Policy

- Stage/bypass becomes a persisted Settings toggle named "Bypass operations".
- Default is off, so operations are staged by default.
- The queue island no longer exposes stage/bypass controls.
- In minimal style, the queue Apply button is not accent-colored.

### Minimal Style Controls

- The active-filters FAB uses a filters icon, not sparkles.
- The Files page sort menu shows only implemented sort modes.
- File sort options must work in both tree and grid.
- The column/cell visibility affordance belongs to the view menu, not sort.
- Minimal search is a compact search button that expands into the search input on click/focus. If the input is empty and loses focus, it collapses back to a button; if it contains text, it remains expanded.
- Overlay islands receive the sandbox max-width discipline.

## Non-Goals

- No full replacement of Vaultman's Files explorer with the native core File Explorer view.
- No dependency on private minified constructors beyond the already-observed Search view adapter surface.
- No branch/tag/release publication in this implementation slice.
- No broad component decomposition unrelated to Content Search, Files explorer, queue policy, page labels, or minimal controls.
- No mobile-specific redesign beyond preserving responsive constraints.
- No changes to `main` branch AI-file policy.

## Acceptance Criteria

- `pnpm run verify` passes.
- Build artifacts are copied to `plugin-dev` using the repo/script-supported Obsidian plugin dev path.
- `obsidian vault=plugin-dev plugin:reload id=vaultman` succeeds.
- `obsidian vault=plugin-dev dev:errors` is clean after reload.
- DOM inspection confirms the Content tab no longer renders a Preview button.
- Runtime test confirms Content search uses native Search results or explicitly falls back only for unsupported regex behavior.
- Files with no active-filter matches show the empty landing, not empty folders.
- Auto reveal icon matches core (`lucide-gallery-vertical`) and scrolls to the row.
- Folder context menus include filter/exclude plus structural operations.
- Minimal sort options for Files are all functional.
- Settings includes persisted "Bypass operations" and queue behavior follows it without plugin reload.
