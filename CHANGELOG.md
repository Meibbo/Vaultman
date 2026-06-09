# Changelog

All notable changes to Vaultman will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Version history note**: Versions 0.7–0.9 were previously labeled 1.2.2–1.3.0 during private
> internal development. Renumbered to 0.x to reserve 1.0.0 for the first public stable release.

## [Unreleased]

---

## [1.1.0-beta.3] — 2026-06-09

### Added

- Added a performance probe and scroll smoke scripts for explorer regression checks.
- Added Core-like DnD action guides for Vaultman file, tag, and property drags.

### Changed

- Improved mobile/minimal navigation behavior, searchbox layout, explorer row styling, and Content input controls.
- Updated file/property/tag explorer DnD payloads so Vaultman nodes participate more closely in Obsidian-native drag flows.

### Fixed

- Fixed property drops into Markdown editors so frontmatter entries can be applied without the invalid-drop target path.
- Fixed file/folder drag payloads so file nodes expose native Obsidian file payloads for workspace tab drops.
- Fixed root-level drops for files and nested tags.
- Fixed queue/filter islands retaining dock spacing when the dock is disabled.
- Fixed release metadata registration so new versions are added to `versions.json` even when they share `minAppVersion`.

### Known beta gaps

- Full Core Files DnD parity still needs manual validation for destructive move operations and workspace tabbar drops.
- Explorer virtualization remains release-critical to watch under large-vault scroll and tab-switch stress.

---

## [1.1.0-beta.2] — 2026-06-08

### Added

- Added a minimal-style Data surface with dock-off navigation, Core-like header controls, and Data tab
  routing for Files, Props, Tags, Content, Active filters, Queue, and Statistics.
- Added table and grid view parity work for Files, plus table view support for Props and Tags with
  resizable Bases-style columns.
- Added Content search result hierarchy with Core Search-like rows, result sorting, expand/collapse all,
  idle/no-result landings, and queue-compatible replace behavior.
- Added queue risk warnings for bulk operations and folder operations, plus duplicate/contradictory
  operation guards.
- Added explorer drag payload support for files, tags, and properties, including frontmatter-aware
  property drops and wikilink file drops.

### Changed

- Moved Files into the Data header tab menu and made Data the primary explorer surface for beta testing.
- Split explorer search state by surface so Props/Tags search terms do not leak into Files filters.
- Improved Files, Props, Tags, and Content sorting, including modified-time and created-time fields.
- Reworked Statistics routing, scoped projections, and cache-backed file time data for the beta gate.
- Added `dev` branch coverage to CI, CodeQL, and OpenSSF Scorecard workflows.

### Fixed

- Fixed multiple stable UX placeholders and non-reactive settings, including tab-label visibility and
  minimal-style FAB/dock updates.
- Fixed Files explorer extension display, folder filtering, folder queue operations, active-file styling,
  file-grid selection/context menu behavior, and empty-folder affordances.
- Fixed Props explorer property-name search semantics, property type display, value filtering, and grid
  node interactions.
- Fixed Tags nested/simple grouping semantics and view-grid interaction behavior.
- Fixed severe explorer virtualization regressions: stale Files table roots, duplicated file rows, scroll
  lifecycle leaks, row rebuild churn, and tab-switch vertical offset jumps.
- Fixed Content search fallback so hidden matches missed by the native Search DOM can still appear in
  Vaultman results.

### Known beta gaps

- Full Core Search parity for 1000+ result virtualization, snippet context controls, copy results, and
  bookmark actions remains deferred.
- Full Content table renderer parity remains deferred while the Core Search-compatible result-list
  surface stabilizes.
- Further indexed or batched filter-performance work may still be needed if rapid active-filter clicks
  produce user-visible FPS drops in plugin-dev.

---

## [1.0.2] — 2026-06-04

### Fixed

- Removed the redundant queue-details value guard reported by CodeQL.
- Kept stable CSS compatible with Obsidian Scorecard expectations by blocking
  `!important` and `display: contents` release regressions.
- Removed stable-channel placeholder tabs and no-op controls while keeping
  functional settings visible.

### Changed

- Normalized the stable release gate on pnpm and Node 24 while keeping the
  esbuild production build.
- Added release-blocking `svelte-check`, format, stylelint, Scorecard, and
  security audit gates.
- Added a public security reporting policy.
- Reordered the sidebar dock to start on Filters, moved Content operations into
  Filters, moved Files into Operations, and placed the Statistics scope selector
  below the metrics.
- Added live settings refresh for Svelte views so tab-label visibility changes
  no longer require reloading the plugin.

---

## [1.0.1] — 2026-05-26

### Fixed
- Published a stable `1.0.x` patch from the `1.0.0` product line.
- Added release workflow provenance for `main.js`, `manifest.json`, and `styles.css` assets.
- Resolved Obsidian Scorecard findings for manifest punctuation, source directive comments, popout-compatible globals, language detection, and unnecessary assertions.

---

## [1.0.0-beta.5] — 2026-04-07

> Property browser, queue snippet diffs, and content replace UX polish.

### Added
- **Filters → Property Browser**: the Rules tab now shows a live, scrollable list of all vault properties directly in the Filters page. Click a property name to immediately add a `has_property` filter; expand any property with ▶ to see its known values and click one to add a `specific_value` filter — no modal required. The filter tree (active rules) moved exclusively to the Active Filters popup (FAB).
- **Queue Details → Content Snippet Diff**: when a Find & Replace Content operation is queued, opening Queue Details now shows a dedicated "Content changes" section below the property diffs. Each affected file renders async snippets: `…before context [MATCH → replacement] after context…` with the original match highlighted in red and the replacement in green.

### Fixed
- `simulateChanges()` no longer stores `MOVE_FILE` and `FIND_REPLACE_CONTENT` signal keys as fake property entries in the diff — this was causing `[object Object]` to appear in the Queue Details property diff table for content-replace and move operations.

### Internal
- `src/services/OperationQueueService.ts`: `simulateChanges()` now skips `MOVE_FILE` and `FIND_REPLACE_CONTENT` alongside the existing `RENAME_FILE` skip
- `src/modals/QueueDetailsModal.ts`: new async `renderContentOps()` method reads files via `vault.read()` and renders snippet-style diffs for `find_replace_content` ops
- `src/views/VaultmanView.svelte`: `propBrowserItems` reactive state + `refreshPropBrowser()` reads from `PropertyIndexService`; refreshes on mount and `metadataCache.resolved`
- `styles.css`: new `.vaultman-prop-browser*` and `.vaultman-diff-content-*` CSS utility classes

---

## [1.0.0-beta.4] — 2026-04-07

> Find & Replace in file content, Move to folder, batch queue performance, UI navigation overhaul.

### Added
- **Find & Replace Content tab**: search and replace raw file content (including frontmatter) using plain text or regex. Features case-sensitive toggle (`Aa`), regex toggle (`.*`), inline Preview (shows match count + collapsible per-file snippet list), and Queue Replace to stage the operation. Scope adapts to selected files or filtered files automatically.
- **Move to folder**: in-frame slide-up popup (following wireframe UX) to move selected/filtered files to a target folder with folder autocomplete
- **Scope tab inside Filters page**: sub-tab bar (Rules | Scope) in the Filters page — scope selection (All vault / Filtered files / Selected files) is now inline in the Filters page instead of a popup
- **Long-press nav icon reorder** (2s hold → drag to swap): pages can be reordered without leaving the sidebar; visual `.is-reorder-target` highlight during drag; order saved to settings
- **Bottom nav float + blur**: nav bar now floats over page content (`position: absolute; bottom: 0`) with a gradient fade and `padding-bottom: 80px` so content scrolls clear of the nav
- **Active filter badge** on Filters nav icon showing rule count; queue badge on Ops nav icon
- `addBatch()` on `OperationQueueService` — batches multiple queue additions into a single UI re-render event (prevents UI freeze when queuing 1000+ files)
- Chunked execution in `OperationQueueService.execute()` (20 files/tick, `setTimeout(0)` yield) + live progress Notice

### Fixed
- Ribbon icon now opens the sidebar (was incorrectly calling the bases picker)
- Navbar click navigation (was broken after pointer-capture refactor in Iter.3)
- Blank pages 2 & 3 — root cause: `overflow: hidden` was on the same element as `translateX`, clipping pages in local space. Fixed by adding `.vaultman-pages-viewport` wrapper
- `addClass('class1 class2')` → `addClasses(['class1', 'class2'])` in all 4 modals

### Internal
- `FIND_REPLACE_CONTENT` and `MOVE_FILE` signal constants in `src/types/operation.ts`
- `FolderSuggest` added to `src/utils/autocomplete.ts`
- Svelte 5 `$state` + `$derived` for all reactive UI — no framework bindings
- `.vaultman-pages-viewport` overflow wrapper pattern for horizontal slide navigation

---

## [1.0.0-beta.3] — 2026-04-06

> Full Svelte 5 migration, redesigned navigation, major layout fixes.

### Added
- **Svelte 5 sidebar**: `VaultmanView.svelte` replaces the old imperative TypeScript view — 3-page horizontal slide navigation (Ops | Files | Filters) with CSS `translateX` and `transitionend` guard
- **Frosted glass pill nav**: Lucide icons per page, active glow via `color-mix`, `backdrop-filter: blur`, per-page FABs on outer edges following the wireframe spec
- **Per-page FABs**: Files page always gets both FABs (View mode popup, Search popup); Ops page gets left FAB (Queue Details modal); Filters page gets right FAB (Active Filters popup)
- **View mode popup, Search popup, Active Filters popup, Scope popup**: all as in-frame overlays (slide-up spring animation)
- **Queue Details modal** (`QueueDetailsModal`): collapsible file sections, color-coded property diffs (green/red), "Show unchanged" toggle, live progress during execution
- **Linter batch modal** (`LinterModal`): runs Obsidian Linter on all filtered/selected files
- **File Move modal** (`FileMoveModal`): folder autocomplete via `FolderSuggest`

### Fixed
- Empty Files/Filters pages — `refreshFilterTree()` now called in `onMount`; `metadataCache.on('resolved')` triggers file re-render after vault indexes
- Page order default corrected to `['ops', 'files', 'filters']` (matches wireframe)
- HTML5 drag-and-drop replaced with pointer events (Obsidian intercepted native drag events and created tab groups)

### Internal
- `esbuild.config.mjs` updated with `esbuild-svelte@0.9.4` plugin (`css: "injected"`)
- `src/svelte.d.ts` created for TypeScript `.svelte` module declarations

---

## [1.0.0-beta.2] — 2026-03-28

> Bug-fix release addressing four known regressions from v0.9.0.

### Fixed
- **Inline rename**: double-clicking a name cell in the property grid now correctly opens the inline edit input
- **Header checkbox CSS**: "select all" checkbox in the grid header restored to accent/indeterminate styling
- **Grid re-render flash**: `MarkdownRenderer` cell updates no longer produce a visible rebuild flash on each click
- **Tags in grid**: `#hashtag` property values now render as styled tag chips matching Obsidian's live preview

---

## [1.0.0-beta.1] — 2026-03-27

> First public beta. Core features are functional but several known regressions exist. Not recommended for production vaults.

### Added
- Nothing new since 0.9.0 — this release packages the current state for BRAT beta testing

### Known issues in this release
- Inline rename (double-click on name cell) is broken
- Header checkbox lost its CSS styling
- Grid re-render flash on click (chunked render mode)
- Tags don't render exactly like Obsidian reading view

### Placeholder / not yet implemented
- File diff view for pending changes
- File move operation
- Linter tab
- Templates tab (Templater support)

---

## [0.9.0] — 2026-03-27

### Added
- **Inline file rename**: double-click a name cell in the grid (configurable via `gridEditableColumns` setting) — *note: currently has a bug, see Known Issues*
- **Live preview rendering**: property values render with Obsidian formatting (tags, wikilinks, dates) via `MarkdownRenderer` — supports plain, chunked, and full render modes — *note: tags still don't render exactly like reading view; chunked mode shows a visible re-render flash*
- **.base file integration**: bidirectional sync between the plugin grid and Obsidian Bases `.base` YAML files — columns, sort, column widths, and filters
- **Base filter parser**: full expression parser for Obsidian Bases query syntax (comparisons, `.contains()`, `.containsAny()`, `file.hasTag()`, `link()`, `date()`, nested AND/OR)
- New settings: `gridRenderMode`, `gridRenderChunkSize`, `gridLivePreviewColumns`, `gridEditableColumns`, `baseFilePath`
- New grid callbacks: `onSortChange` and `onColumnResize` for external sync
- i18n keys for all new settings (English and Spanish)

### Fixed
- **Checkbox toggle**: clicking a checkbox now correctly toggles selection (was always clearing and re-adding, making uncheck impossible)
- **Show only checked**: now correctly shows all selected files (was showing only the last due to checkbox bug)
- **Select all**: header checkbox now immediately updates all row checkboxes without requiring a column sort
- **Column widths**: table now has explicit pixel width matching colgroup sum, preventing columns from shifting with text content
- **Header checkbox accent**: indeterminate/accent styling now only appears when more than one file is selected
- **Ctrl/Shift selection**: separated checkbox click logic from row click logic so modifier keys work correctly on both paths

### Known regressions in this version
- Inline rename (double-click on name cell) is broken
- Header checkbox lost its CSS styling

---

## [0.8.0] — 2026-03-26

### Added
- Custom SVG plugin icon registered via `addIcon()` — replaces generic `settings-2` icon on ribbon, view tabs, and sidebar
- **Operations panel**: split layout with a pinned queue section always visible at the bottom, independent of active tab
- **Operations panel**: "Clear selected" button to deselect all files from the grid
- Column resize handles on the property grid — drag column header borders to adjust widths
- Native Obsidian status bar integration — file counts, property/value stats, and queue status
- Minimal session row replacing the colored header bar — session picker and show-selected toggle in a compact row

### Changed
- **Property explorer**: triangle toggle icons (▶/▼) replaced with Lucide chevron icons
- **Navbar**: hidden when the explorer panel is open, shown again when collapsed
- **Operations panel**: opens by default alongside the grid
- **Property grid**: uses a single `<table>` with `table-layout: fixed` and `<colgroup>` for precise column alignment
- **Property grid**: virtual scroll now uses spacer `<tr>` elements inside `<tbody>` instead of separate spacer divs
- Removed custom `.vaultman-statusbar` HTML in favor of Obsidian's native `addStatusBarItem()` API
- Removed `HeaderBarComponent` from the main view

### Fixed
- **Critical**: files and properties not appearing in views due to metadata cache timing — `PropertyIndexService` now rebuilds on `metadataCache.on('resolved')` event
- **Critical**: `FilterService.applyFilters()` re-triggered on `metadataCache.on('resolved')` to ensure filters run after cache is ready
- **Compatibility**: replaced `structuredClone()` with `JSON.parse(JSON.stringify())` for older Electron versions

---

## [0.7.0] — 2026-03-26

### Added
- `onExternalSettingsChange()` lifecycle hook — settings now sync when modified externally (e.g. via cloud sync)
- `onunload()` cleanup in SessionFileService and PropertyIndexService
- `destroy()` method on PropertyExplorerComponent for timer cleanup
- Vault `create` event listener in PropertyIndexService for accurate file count tracking
- README.md with full feature documentation, installation, and usage guide
- CHANGELOG.md following Keep a Changelog format
- CONTRIBUTING.md with architecture overview and development guidelines

### Changed
- **IconicService** and **PropertyTypeService** now extend `Component` with proper lifecycle management
- **PropertyIndexService**: incremental per-file removal on delete (was full vault rebuild)
- **PropertyIndexService**: metadata change handler debounced (50ms) to batch rapid updates
- **FileListComponent** and **PropertyGridComponent**: O(1) `getFileByPath()` lookups instead of O(n) vault scan
- **SessionFileService**: `detectConflicts()` scoped to parent folder instead of full vault scan
- Settings loading uses `structuredClone()` for deep merge

### Fixed
- Potential stale callback execution from pending `setTimeout` in SessionFileService on unload
- Global `document.querySelector` in PropertyExplorerComponent scoped to `ownerDocument`
- `.className = '...'` pattern wiping Obsidian-injected classes

---

## [0.1.0] — 2026-03-25

### Added
- Initial release of Vaultman as an Obsidian TypeScript plugin
- Property explorer with hierarchical tree view, search, sort, and Iconic integration
- Virtual-scrolled property grid with inline editing
- Advanced filter system with boolean logic (AND/OR/NOT) and 8 filter types
- Operations queue for batch property management (set, rename, delete, clean, change type)
- Session management with persistent `.md` files in `+/` folder
- Bidirectional session sync with Google Drive conflict detection
- File list component with search and checkbox selection
- Batch file renaming modal
- Obsidian Linter integration modal
- Filter template save/load system
- Settings tab with language, property type, layout, and behavior options
- Internationalization support (English, Spanish) with auto-detection
- Sidebar view with collapsible sections
- Full-screen main view with responsive layout
- Ribbon icon and command palette commands

> Versions 0.2–0.6 correspond to the Python script predecessor (PKM Manager).
> See `docs/pkm_manager_python_architecture.md` for that history.

[Unreleased]: https://github.com/Meibbo/Vaultman/compare/1.0.1...HEAD
[1.0.1]: https://github.com/Meibbo/Vaultman/compare/1.0.0...1.0.1
[1.0.0-beta.5]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.4...1.0.0-beta.5
[1.0.0-beta.4]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.3...1.0.0-beta.4
[1.0.0-beta.3]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.2...1.0.0-beta.3
[1.0.0-beta.2]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.1...1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/Meibbo/Vaultman-Plugin/compare/0.9.0...1.0.0-beta.1
[0.9.0]: https://github.com/Meibbo/Vaultman-Plugin/compare/0.8.0...0.9.0
[0.8.0]: https://github.com/Meibbo/Vaultman-Plugin/compare/0.7.0...0.8.0
[0.7.0]: https://github.com/Meibbo/Vaultman-Plugin/compare/0.1.0...0.7.0
[0.1.0]: https://github.com/Meibbo/Vaultman-Plugin/releases/tag/0.1.0
