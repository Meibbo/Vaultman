# Vaultman Explorer — Worldview Synthesis

Synthesis of 4 parallel research files. Date: 2026-05-14.
Sources: `vm-research-theme.md`, `vm-research-libraries.md`, `vm-research-parity-fto.md`, `vm-research-parity-psb.md`.
All four read against worktree `jovial-wilson-f81c67` (`.claude/worktrees/`).

**Evidence legend:** [FACT] = read directly from repo files by a research agent. [INFERENCE] = agent judgement / recommendation. [OPEN] = unresolved contradiction or unknown.

**Terminology normalized across files** (the four agents used different names):
- **Explorer** = the unified, multi-view, bulk-edit panel surface (`panelExplorer.svelte`). Generic over `ExplorerProvider`.
- **Provider** = a data source plugged into the Explorer (`explorerFiles`, `explorerTags`, `explorerProps`, `explorerContent`, `explorerOutline`, `explorerPlugins`, `explorerSnippets`, `explorerBasesImport`).
- **View mode** = a render style. See §6 reconciliation — there are **6**, not 5.
- **markmap view** = the mindmap view mode. It is a custom `ViewMarkmap.svelte` (pure CSS recursion) — **NOT** the `markmap` npm library, and not a real graph engine. "mindmap" in the brief = this view.
- **serviceTheme** = the multi-theme / native-disguise styling service. **service-unload** = the (not-yet-built) core-plugin disguise / "Control Panel" preset system.
- **useNativeDom** = the structural switch that gates whether components emit Obsidian-native class names (`nav-file`, `tree-item`, etc.).
- **2:1 / 1:1** = parity target: "2:1" more capable than core, with a settings dial that returns to "1:1" (looks/behaves identical to core).

---

## 1. Executive worldview

Vaultman's Explorer is, in mid-2026, a **strong but uneven** realization of the "unified bulk-edit surface that can disguise itself as core" vision. The architecture is sound: a single panel (`panelExplorer.svelte`) is generic over a `ExplorerProvider` interface, with 6 swappable view modes, a shared selection service, a shared queue/operations system, a filter service, and a find-and-replace ("FnR") island. Seven providers already exist. Where Vaultman has invested — multi-select, keyboard navigation, bulk rename/delete/set across many files, FnR with templates and date parsing — it is already **well past 2:1**: it does things no Obsidian core plugin can do at all. The bulk-edit thesis is proven in code.

The gap to the full vision is **not architectural — it is coverage, and it is lopsided**. Three patterns recur across all parity research. (1) **Providers are at wildly different maturity.** Tags is essentially at/above 2:1 already; Properties and File Explorer are ~1.5:1; Search and Bases have their *replace/interop* angle at 2:1 but their *core function* (query parsing; expression IR) barely at 1:1; Outline is **below 1:1** — its builder logic is good (it even parses tasks and block refs, exceeding core) but it has no first-class provider and no real view, just a static non-virtualized stub. (2) **The 1:1 "dial-back" half is mostly unbuilt.** Vaultman can be *more* than core but cannot yet *look identical* to core: native-DOM class emission (`nav-file`/`nav-folder`/`data-path`, `tag-pane-tag*`, `.metadata-property*`, `.search-result-*`, `.outline`) is partial-to-missing depending on view and provider. The capital-letter views (`ViewNodeTable/Cards/Grid`) emit some native classes under `useNativeDom`; `viewTree.svelte` emits only the generic `tree-item*` family and no provider-specific classes at all. (3) **"Disguise as core" — actually replacing a core plugin — does not exist yet.** `service-unload` is unbuilt; only the safe primitives (registered views, mirror classes, hover sources) are in place.

On **performance**, the library stack is fundamentally healthy — TanStack Virtual, TanStack table-core (headless), `@dnd-kit/svelte` 0.4.0 (confirmed Svelte-5-native) are all maintained and correctly chosen. There is **one real scaling hole and one churn-debt item**: the markmap view has *zero virtualization* (it mounts every node), and the codebase runs *two parallel virtualizers* (TanStack + a custom `TreeVirtualizer`). Everything else labeled a "performance problem" is actually a feature gap (no 2-D cell selection) or a measurement unknown (`@chenglou/pretext` text-measurement on the hot path, never benchmarked).

On **theming**, the two halves needed for the multi-theme selector already exist (`serviceTheme.svelte.ts` runes class + the older `applyVaultmanTheme` class-list toggler) but are **not unified** — they are two parallel, disconnected systems. Unifying them plus adding a token layer (`unocss-preset-theme`) is low-risk and additive.

**The single most important strategic insight:** Vaultman should stop thinking of "2:1" and "1:1" as one slider per provider and instead treat them as **two separable workstreams of very different risk**. The "2:1" capability work is provider-by-provider feature building — well-understood, parallelizable, low-risk. The "1:1 dial-back" is a **single cross-cutting concern**: a native-DOM-emission contract that every view and provider must honor, gated by `useNativeDom` + a theme. Building that contract *once, properly* (and routing the weak views — Outline especially — through `viewTree.svelte` so they inherit virtualization, collapse, keyboard, *and* the native-DOM path for free) unlocks 1:1 across every provider at once. The disguise/`service-unload` layer then sits safely on top, using only public API. The decomposition should cut along this seam, not along providers alone.

---

## 2. Library & performance

**Current stack — verdict per library** (all versions [FACT] from `package.json` / `pnpm-lock.yaml`):

| Library | Version | Role | Verdict |
|---|---|---|---|
| `@tanstack/svelte-virtual` | 3.13.24 | List/grid virtualization (4 capital-letter `View*` components) | **KEEP** — best-in-class, actively published (May 2026). Sound. |
| `@tanstack/table-core` | 8.21.3 | Headless table model (sort + row-selection only) | **KEEP v8, do NOT chase v9.** Doing very little work; not a bottleneck. v9 is alpha; its only win (bundle size) is irrelevant in a bundled Electron plugin. |
| `@dnd-kit/svelte` | 0.4.0 | Drag-and-drop | **KEEP.** Version ambiguity resolved — this is the *official* Svelte-5-native package (`peer svelte ^5.29.0`). Caveat: pre-1.0, so pin it. |
| custom `serviceVirtualizer.svelte.ts` (`TreeVirtualizer`) | in-repo, ~48 LOC | Fixed-height virtualization (`viewList`, `viewGrid`) | **CONSOLIDATE AWAY** (see lever 2). Cannot do measured heights. |
| custom `ViewMarkmap.svelte` | in-repo | "Mindmap" view — pure CSS recursion | **SWITCH or virtualize** (see lever 1). Weakest spot for scale. |
| `@chenglou/pretext` | 0.0.6 | Text measurement (`serviceTextMeasure.ts`) — feeds row-height estimation | **WATCH.** Pre-1.0, single-author, on the hot path. Cost never measured. |
| `bits-ui` | 2.18.1 | Headless UI primitives | KEEP. Only `vmPopover` + `vmDialog` used so far. |
| `@git-diff-view/svelte` | 0.1.3 | Diff rendering (`viewDiff`) | Niche, not perf-critical. |

Notably **absent**: no dedicated table-virtualization adapter, no `markmap` npm lib, no graph/flow library, no spreadsheet library.

**Biggest performance levers, ranked** (from `vm-research-libraries.md` §3):

1. **Replace or virtualize the markmap view.** It is the *only* Explorer view with zero virtualization — it mounts every node, with pseudo-element edges, for the full set. At 1000+ nodes it has no escape hatch: no culling, no canvas, every selection/badge change touches the whole tree. Recommended: adopt **`@xyflow/svelte` 1.0** (Svelte-5 rewrite, runes-based, viewport-culls offscreen nodes, actively maintained) if the mindmap should be a real pannable graph; OR, if it must stay a lightweight outliner-style map, add viewport culling at minimum. **Cross-ref to parity:** the FTO research independently calls the markmap view a "stub" / "mindmap-stub" — so this view is weak on *both* performance *and* feature completeness. It is the clearest "rebuild" candidate in the whole Explorer.
2. **Consolidate the two virtualizers into one.** TanStack Virtual (measured heights, 4 views) vs custom `TreeVirtualizer` (fixed height, 2 views) = double the surface for scroll/measurement bugs, and the custom one *cannot* do variable-height content previews. Recommendation: standardize on `@tanstack/svelte-virtual` everywhere, delete the custom one. This is churn-debt, not a crash risk — but it blocks variable-height content in `viewList`/`viewGrid`.
3. **Make bulk operations update per-node, not whole-tree.** With 1000+ nodes and constant per-node visual change (operation badges, filter state, selection), the cost is re-deriving/re-flattening the whole node array on every change. Key selection / operation-indicator / filter state per-node (a `Map` indexed by id, or `$derived` per row) so a 1000-node mutation is 1000 cheap row updates, not one giant `$derived.by` over the array. The `perfProbe.ts` scenarios (`operation-badges`, `filter-select`, `tree-scroll`, `filters-search`) are the right harness.
4. **Drop-time structural updates must be targeted.** `applyManualNodeReorder` rebuilds arrays with `filter`+`slice`; a drop should re-flatten/re-render only affected branches, not the whole tree.

**Not levers** (explicitly de-prioritized): table-core v8→v9 swap (bundle-size only); changing the DnD library for perf (DnD acts on small selections — never the bottleneck).

**Performance unknowns:** (a) `@chenglou/pretext` cost on the `tree-scroll` hot path — never benchmarked; check if `prepare`/`layout` is memoized and whether a fallback engine exists. (b) No measured perf numbers at all — `perfProbe.ts` defines the harness and 4 scenarios but was not run against a 1000+ node vault. (c) TanStack Virtual + Svelte 5 edge cases — issue TanStack/virtual#866 exists; check the `$effect`+`untrack`+`setOptions` dance in `ViewNodeTable.svelte` for re-render thrash.

---

## 3. Parity matrix — all 6 core plugins

Parity level scale: **<1:1** (missing core behavior) · **~1:1** (matches core) · **~1.5:1** (clearly exceeds core in some dimensions, gaps in others) · **>=2:1** (substantially more capable than core).

| Core plugin | VM provider | Parity level | Key functional gaps (blocks 1:1) | Key visual / DOM gaps | Standout strengths VM already has |
|---|---|---|---|---|---|
| **File Explorer** | `explorerFiles` | **~1.5:1** | Real filesystem move via DnD (current DnD is *reorder*-oriented, not "move file into folder"); full file/folder context menu (~7 core items missing: open-in-new-tab/pane/window, make-a-copy, reveal-in-nav, show-in-system, copy-URL, new-note/folder-from-folder, set-as-attachment-folder); folder notes; "new note / new folder" affordances; "follow active editor leaf" highlight (current highlight is selection/filter-driven) | `viewTree.svelte` emits only generic `tree-item*` and **only when `useNativeDom`** — no `nav-file`/`nav-folder`/`nav-folder-children`/`nav-file-title`/`is-collapsed`/`mod-collapsible`/`data-path`. Note: the capital-letter views (`ViewNodeTable/Cards/Grid`) *do* emit `nav-file*` under `useNativeDom` — the tree view is the specific gap. `serviceFoulDetection` self-checks for `.nav-file`, implying native emission is an intended-but-partial contract. | 6 view modes; box-select + Ctrl/Shift multi-select; rich keyboard nav (Arrow collapse/expand+parent-hop, PageUp/Down, Space, Enter); per-field visibility (`serviceNodeFieldVisibility`); bulk operations queue; **count** sort (frontmatter-key count — not a core option) |
| **Tags** | `explorerTags` | **>=2:1** (functionally); ~1:1 work remaining is visual | Primary click toggles a *Vaultman filter*, not Obsidian Search (Search reachable, but bound to *secondary* action) — a "core-compat mode" should swap this | **Missing** — `viewTree.svelte` never emits `tag-pane-tag` / `tag-pane-tag-text` / `tag-pane-tag-count` / `tree-item-flair`. No provider-specific native class path at all. | Tag rename / **merge** / delete (bulk, queue-based, multi-file) — core *cannot rename tags at all*; per-pane search/filter; `sortTarget` top-vs-children; iconic tag icons; ≈ Tag Wrangler-level capability |
| **Outline** | **none — provider MISSING** | **<1:1** | No first-class `ExplorerProvider` (only a builder, `buildOutlineForFile`, used to graft adopted children onto file rows). No click-to-jump-to-line; no collapse/expand in the view; no DnD heading-section reorder (a notable core capability); no "follow active editor leaf"; the view (`viewOutlineExplorer.svelte`) is **static — not virtualized**. The `explorer-outline` tab *slot* IS registered (`tabRegistry.ts`) and detachable — the slot exists, the provider + real view do not. | `viewOutlineExplorer.svelte` emits generic `tree-item*` only under `useNativeDom`; no `.outline` container class, no `collapse-icon` / `mod-collapsible` / `is-collapsed`. | Builder already parses **tasks** (`kind:'task'` + `taskState`) and **block refs** (`kind:'block'`) — core Outline is headings-only. The 2:1 raw material exists; the UI does not. |
| **Properties** | `explorerProps` | **~1.5:1** | `_changePropType` missing `datetime` type, and does not coerce/transform values to the new type; no inline type-specific **value editor widgets** (date picker, checkbox toggle, multitext chip editor) — `ViewNodeTable/Grid` render `cell.display` strings only, `editable?` flag + `gridEditableColumns` settings are scaffold with no handlers; no in-editor frontmatter block (likely out of scope by design); no File-properties (active-file) provider mode; `tags`/`aliases`/`cssclasses` not special-cased; value autocomplete partial | `ViewNodeTable.svelte` *does* emit `metadata-property` / `metadata-property-key` under `useNativeDom`; tree-view native-class parity for the All-Properties leaf not confirmed | Vault-wide bulk rename/delete/set across many files with queue + FnR handoff (exceeds core's per-property rename); prop+value tree with counts; per-provider search; sort (exceeds core); type icons; **type-conflict "Conflict" badge** (`isTypeIncompatible`); incremental `propsRevision` refresh |
| **Search** | `explorerContent` | **~1:1 on search side, >=2:1 on replace side** — net ~1.5:1 | **The query operator parser is entirely missing** — `indexContent.ts` does a literal `toLowerCase().indexOf()` substring scan, *no* `path:`/`file:`/`content:`/`tag:`/`line:`/`block:`/`section:`/`task:`/`property:`, no regex, no boolean `OR`/`-`/`"…"`/`( )`. This is the single biggest Search gap. Also: no case/diacritics toggle; no result sort; fixed ±30-char context (no "show more"); no copy-results; no embedded ```` ```query ```` code-block rendering; no folder-scoped content search; click opens file but **does not jump to the match line** (`match.line` captured but unused) | Content rows render through the generic `viewTree` / `ViewNodeTable` DOM (`vm-explorer-*`, `vm-node-table-*`) — **not** `.search-result-*` / `.search-result-file-match` / `.search-result-file-matched-text` | Cross-file **find & replace** — core search has *no replace at all*; the whole FnR island (templates, date parsing, prop-set); incremental chunked scan with progress; result cache keyed by query + vault fingerprint; multi-mode result rendering (core search is list-only); delete-from-result-row |
| **Bases** | `explorerBasesImport` | **<1:1 on fidelity, >=2:1 on the interop+bulk angle** — net ~1:1 | Filter-expression → Vaultman IR maps **only 4 shapes** (`prop == "value"`, `file.{name\|folder\|path}.contains`, `file.hasTag`, `file.inFolder`) — everything else (`!=`, comparisons, inline `&&`/`\|\|`/`!`, `.containsAny`/`.startsWith`/`.isEmpty`, list/string methods, `this`, `date()`/`today()`, regex, formula refs) is preserved-but-unsupported; **no `.base` export**; **no `registerBasesView` integration**; `formulas`/`summaries` not modeled even as preserve-only; no expression evaluator (`Value` type system); no `map` view; no plugin custom-view adapters | Bases renders its own views; concrete DOM class names are an explicit unknown. A custom view via `registerBasesView` gets a bare `containerEl` — so 1:1 DOM mimicry is **not required** for the custom-view path, only if VM tries to replace the core table/cards/list look inside its own panel | Discovers `.base` files + ```` ```bases ```` fences; parses YAML + preserves raw config; `and`/`or`/`not` group import; **global + per-view** filter import (`findViewFilters` + `combineFilters` — newer than the older compat-matrix claim); import-preview report with applied/unsupported/parse-errors; multi-mode rendering of imported data; bulk ops on Bases-derived rows (core Bases is read/query-only) |

**One-line parity verdict:** Tags is the model (at/above 2:1, only visual dial-back left). File Explorer and Properties are solid ~1.5:1. Search and Bases each have a 2:1 *superpower* (cross-file replace; interop+bulk) sitting on top of a *core function that isn't at 1:1 yet* (no query parser; only-4-shape expression IR). Outline is the laggard — below 1:1, but with a good builder that already over-delivers on raw data.

---

## 4. serviceTheme + service-unload

### Current state [FACT]

- **Two parallel, disconnected theme systems exist.** (1) `src/services/serviceTheme.svelte.ts` — a `ThemeService` runes class with `mode`/`identity` state, `useUtilities`, `useNativeDom`, `rootClasses`, `hydrate()` — but **no DOM binding and no theme-set switching**. It diverges from the plan doc's never-built `bindRoot`/`syncRootClasses` design. (2) `src/services/serviceTheme.ts` — a separate, *older* `applyVaultmanTheme(body, settings)` that toggles `vm-theme-default|native|polish|glass|custom` on `<body>`. This is the closest thing to a theme-set selector, but it is class-list-only and decoupled from the runes service. `main.ts` constructs `ThemeService` at :144 and calls `applyVaultmanTheme` at :393 — **both, unconnected**.
- **Token surface exists:** `_elastic.scss` defines a `.vm-root` CSS-var contract (`--vm-accent`, `--vm-bg`, per-`vm-id-*` density vars) — the indirection layer a theme system needs. `uno.config.ts` safelists `vm-root`/`vm-mode-*`/`vm-id-*`/`obsidian-mimic-*` but has **no theme-token / preset-theme layer**.
- **`useNativeDom` is wired** — components emit mirror classes (`nav-file`, `tree-item`, `metadata-property`) via `class:` arbitration keyed off `themeService.useNativeDom` (confirmed done for the capital-letter views; `viewTree.svelte` lags — see §3).
- **`service-unload` does NOT exist.** No code disables/unloads a core plugin. The function-selector / "Control Panel" preset system is unbuilt. `typeObsidian.ts` (the ADR-004-mandated typed wrapper for `(app as any)` internals) wraps `disablePluginAndSave` for community plugins but deliberately does **not** wrap internal-plugin disable.
- **Disguise primitives that DO exist:** `serviceNativeSurfaceBinding.ts` does capture-phase click/mouseover interception on native selectors + `registerHoverLinkSource` — proof Vaultman already does DOM-level interception of core surfaces.

### Recommended architecture [INFERENCE]

**serviceTheme — unify the two services into one:**
1. Theme tokens via **`unocss-preset-theme`** — each style set (`vaultman`, `native`, `polish`, `glass`) as a theme object emitted as CSS custom properties under a theme class.
2. `serviceTheme` (the runes service) owns ONE root class — `vm-theme-<name>` on `.vm-root` — replacing the detached `applyVaultmanTheme`. The `.vm-root` CSS-var contract in `_elastic.scss` is the indirection layer; the "native" theme re-points `--vm-accent` etc. at Obsidian's own `--text-accent` / `--nav-item-*` / `--background-*`.
3. `useNativeDom` stays the **structural** switch (gates native class emission). "Native theme" = `useNativeDom` true + `vm-theme-native` token remapping. Purely additive — existing `vm-mode-*` / `vm-id-*` styling untouched.
4. Bits UI is headless — style via `class={...}` props + `data-*` attributes; pass theme-aware UnoCSS shortcuts; avoid hardcoded colors in component `<style>` blocks.

**service-unload — preset-driven, public-API-first:**
- A runes `serviceUnload` holding a registry `{ coreId, displayName, vmReplacement, mode: 'off'|'collapsed'|'replace' }`. Presets ("Control Panel") = named toggle sets persisted in plugin settings.
- **Safe operations only by default:** register Vaultman's own views, collapse core leaves via the workspace API, emit mirror classes, register hover sources. All public, version-stable API.
- **Do NOT disable core plugins by default.** The legitimate disguise path is: don't disable `file-explorer`; register Vaultman's own view, let the user place it, optionally *collapse* the core one. Mirror classes already let community theme snippets target Vaultman's rows identically.
- Add a `setInternalPluginEnabled()` wrapper to `typeObsidian.ts` **only if** true disable is genuinely required — gate it behind `workspace.onLayoutReady` to dodge the load-order corruption bug, and always store original enabled-state to restore on `onunload`.
- Best persistence approach: don't touch `app.json` at all — just collapse leaves visually and store state in plugin settings.

### Feasibility verdict [INFERENCE]

- **Theme-switching: highly feasible, low risk.** Both halves exist; the work is unifying them + adding a token layer. Additive by construction.
- **Core-plugin disguise: feasible for "look + add", risky for "truly replace".** Safe = registered views, mirror classes, hover sources, visual leaf-collapse (all public API). Fragile = `internalPlugins.*.disable()`, CSS hiding via version-specific selectors, capture-phase interception.

### Biggest risks

1. **Toggling core plugins can persist bad config and disable ALL core plugins** — Obsidian loads community plugins *before* enabling core plugins, so calling `.disable()`/`.enable()` at the wrong time corrupts config (forum-reported). This is the headline hazard.
2. **DOM selectors break on Obsidian updates** — `.nav-files-container`, `.workspace-leaf-content[data-type=...]` etc. are version-fragile.
3. **Capture-phase listeners can interfere with other plugins.**
4. **`registerBasesView` silently returns `false` if Bases is disabled** — must be handled.

---

## 5. What exists / what's missing / suggested build order

### What exists (the platform is real)

`panelExplorer.svelte` generic over `ExplorerProvider`; 6 view modes; `serviceSelection.svelte.ts`; shared queue / bulk operations; `filterService`; the FnR island; `serviceNodeFieldVisibility`; 7 providers (Files, Tags, Props, Content, Outline-builder-only, Plugins, Snippets, BasesImport); `tabRegistry.ts` with detachable tab slots (including `explorer-outline`); `typeObsidian.ts` typed internals wrapper; `serviceNativeSurfaceBinding.ts`; `serviceFoulDetection.svelte.ts`; the `_elastic.scss` token contract; `perfProbe.ts` harness. Performance libraries (TanStack Virtual, table-core, `@dnd-kit/svelte`) are all sound.

### What's missing — grouped into coherent sub-systems

- **SUB-SYSTEM A — Native-DOM parity contract ("the 1:1 dial-back").** A single cross-cutting deliverable: every view (especially `viewTree.svelte`) and every provider emits the correct Obsidian-native class set under `useNativeDom` — `nav-file`/`nav-folder`/`data-path` (Files), `tag-pane-tag*` (Tags), `.metadata-property*` + All-Properties nav-tree (Props), `.search-result-*` (Search), `.outline`/`collapse-icon` (Outline). Plus the settings flag that forces `useNativeDom`, hides extra view modes / badges, and maps options to the exact core set.
- **SUB-SYSTEM B — serviceTheme unification.** Merge the two theme services; add `unocss-preset-theme` token layer; one `vm-theme-<name>` root class driven by the runes service.
- **SUB-SYSTEM C — Outline as a first-class provider.** Build `explorerOutline` as a real `ExplorerProvider` (like `explorerTags`), targeting the active file; render it through `viewTree.svelte` (inherits virtualization + collapse + keyboard + the Sub-system A native-DOM path); wire click → open at `line`; add follow-active-leaf. The builder already over-delivers (tasks/blocks) — surface that for 2:1.
- **SUB-SYSTEM D — Search query parser.** Implement the operator language (`path:`/`file:`/`content:`/`tag:`/`line:`/`block:`/`section:`/`task:`/`property:` + boolean `OR`/`-`/`"…"`/`( )` + `/regex/` + `match-case:`/`ignore-diacritics:`), replacing the literal substring scan in `indexContent.ts`. Plus jump-to-line, result sort, variable context, collapse-all, folder scoping, embedded `query` block.
- **SUB-SYSTEM E — Inline value editing (Properties + Table).** Type-specific inline widgets (date picker, checkbox toggle, multitext chip editor) in `ViewNodeTable`/`ViewNodeGrid`/`ViewNodeCards`; wire the existing `editable?` / `gridEditableColumns` scaffold; add `datetime` type + real type coercion in `_changePropType`. This also lays the groundwork for true 2-D cell/range selection (the CSV-editor surface).
- **SUB-SYSTEM F — File Explorer core-behavior gaps.** Real filesystem move via DnD (distinct from the existing reorder DnD); full file/folder context menu; folder notes; new-note/folder affordances; follow-active-editor-leaf highlight.
- **SUB-SYSTEM G — Markmap view rebuild.** Replace or virtualize `ViewMarkmap.svelte` — adopt `@xyflow/svelte` 1.0 or add viewport culling. (Performance lever 1 + the FTO "stub" finding converge here.)
- **SUB-SYSTEM H — Virtualizer consolidation.** Delete the custom `TreeVirtualizer`; standardize on `@tanstack/svelte-virtual`. (Performance lever 2.)
- **SUB-SYSTEM I — Bases interop depth.** Widen the filter-expression IR beyond 4 shapes (raw-expression leaves for the rest); model `formulas`/`summaries` as preserve-only; `.base` export; `registerBasesView` integration.
- **SUB-SYSTEM J — service-unload / Control Panel.** The preset-driven core-plugin disguise registry — built on `typeObsidian.ts`, public-API-first, sitting on top of Sub-systems A and B.
- **SUB-SYSTEM K — Bulk-op per-node reactivity hardening.** Per-node-keyed selection/badge/filter state so 1000-node mutations are cheap. (Performance levers 3 + 4.)

### Suggested build order (dependency-aware)

**Phase 0 — Foundations / de-risking (do first, unblocks everything):**
1. **Sub-system B (serviceTheme unification)** — small, low-risk, and Sub-system A's native-theme depends on a working theme service. Also Sub-system J depends on it.
2. **Sub-system A (native-DOM parity contract)** — the highest-leverage single deliverable; unlocks 1:1 dial-back across *all* providers at once. Do `viewTree.svelte` first since the most providers route through it.
3. **Sub-system H (virtualizer consolidation)** — pure churn-debt cleanup; cheap; do it before more views are built on the soon-to-be-deleted custom virtualizer.

**Phase 1 — Close the worst parity gaps:**
4. **Sub-system C (Outline provider)** — biggest parity deficit (<1:1); becomes cheap *after* A, because routing through `viewTree.svelte` inherits the native-DOM path for free.
5. **Sub-system D (Search query parser)** — biggest single functional gap in any provider; self-contained (lives in `indexContent.ts`); parallelizable with C.
6. **Sub-system K (bulk-op per-node reactivity)** — do before the Explorer is stressed harder by E/G; measure with `perfProbe.ts` first.

**Phase 2 — Capability depth (the "2:1" build-out):**
7. **Sub-system E (inline value editing)** — depends on A's table native-DOM work being stable; also the on-ramp to 2-D cell selection.
8. **Sub-system F (File Explorer core gaps)** — parallelizable; mostly independent.
9. **Sub-system G (markmap rebuild)** — somewhat independent, but lower priority than fixing providers that are below/at 1:1; bundle the perf fix and the "stub" feature build together.
10. **Sub-system I (Bases interop depth)** — largely independent; can run in parallel any time after Phase 0; depth-not-breadth work.

**Phase 3 — The disguise layer (built last, on top of everything):**
11. **Sub-system J (service-unload / Control Panel)** — depends on A (mirror classes) and B (theme); is the riskiest area, so it goes last and stays public-API-first.

**Rationale for the seam:** Phase 0 builds the *cross-cutting* machinery (theme + native-DOM contract) that makes the 1:1 half of every provider cheap. Phases 1–2 are then mostly parallelizable provider work. Phase 3 is the high-risk disguise layer, deliberately isolated at the end. This is the decomposition seam — cut along Phase boundaries, not along providers.

---

## 6. Open questions & unknowns

### RECONCILED contradiction — how many view modes? **SIX, not five.**

The libraries file (`vm-research-libraries.md`) repeatedly says "5 views" / "the explorer's 5 views", and the FTO file says "5 view modes (tree/grid/table/cards/mindmap-stub)". The PSB file resolves this with direct file evidence: **`typeViews.ts` `EXPLORER_VIEW_MODES` = 6: `tree`, `table`, `grid`, `cards`, `markmap`, `list`.** This is corroborated *within the libraries file itself* — it describes `viewList.svelte` and `viewGrid.svelte` as a separate pair (using the custom `TreeVirtualizer`) distinct from the four capital-letter `View*` components, and `panelExplorer.svelte` renders `ViewMarkmap` for `viewMode === 'markmap'`. So the count is 6; the "5" files simply omitted `list`. **The six view modes: `tree`, `table`, `grid`, `cards`, `markmap`, `list`.**

Note a naming subtlety surfaced by the libraries file: there appear to be **two grid implementations** — capital-letter `ViewNodeGrid.svelte` (TanStack-virtualized) and lowercase `viewGrid.svelte` (custom-virtualizer). Likewise `viewList.svelte`. Whether `list` and `grid` view modes each map to one component, or whether the lowercase/capital pairs are alternate implementations of the same mode, is **[OPEN]** — needs a look at `panelExplorer.svelte`'s view-mode switch. It does not change the count of *modes* (6, per `EXPLORER_VIEW_MODES`), but it matters for Sub-system H (virtualizer consolidation).

### RECONCILED — "mindmap" vs "markmap" vs "markmap library" vs "list"

- The brief's **"mindmap"** = the **`markmap` view mode** = the custom `ViewMarkmap.svelte` component. All three research files that mention it agree it is a *pure CSS recursive layout*, **not** the `markmap` npm library and **not** a graph engine. Terminology normalized: call the view mode **markmap**, call its nature a "mindmap-style view".
- **"list"** is a *separate, distinct* sixth view mode (`viewList.svelte`) — unrelated to markmap/mindmap. The brief's "possibly list" is confirmed: list exists.
- No contradiction remains here once normalized — the files were consistent on *substance*, only inconsistent on whether they *counted* `list`.

### Other contradictions reconciled

- **Bases per-view filter IR:** the older Bases compat-matrix said "no per-view filter IR"; the PSB research found `findViewFilters` + `combineFilters` *are* wired in the worktree. **Resolved: per-view filter import exists** — the compat-matrix row is stale. (Documented, not an open question.)
- **Bases code-fence keyword:** it is ```` ```bases ```` (regex `^\s*```\s*bases...`), not ```` ```base ````. (Resolved by file evidence.)

### Genuinely open — needs USER input / product decision

1. **Does Vaultman target in-editor / embedded surfaces at all?** Core Properties' *primary* surface is the frontmatter block *inside a note*; core Search's includes *embedded `query` code blocks*. Vaultman's Explorer is a *panel*. Reaching 1:1 on those in-editor surfaces may be deliberately out of scope — **product decision needed**, do not assume.
2. **"Truly replace" vs "look like + add" for the disguise layer** — how aggressive should `service-unload` be? The safe path (collapse leaves, never disable) vs the risky path (`internalPlugins.*.disable()`). This is a risk-appetite call for the user.
3. **`list` vs `grid` component-pair ambiguity** (see above) — minor, but affects Sub-system H scope.

### Genuinely open — needs LIVE verification (do NOT deep-web-research per brief)

4. **Obsidian core DOM/class names** — all parity research had to reconstruct these from community CSS snippets / theme repos because `obsidian.md/help/...` is JS-rendered (WebFetch got titles only). `.metadata-property*`, `.search-result-*`, `.tag-pane-tag*`, `tree-item-flair-outer`, `tag-pane-tag-self`/`-sub`, `data-heading-level` are high-confidence but **not verbatim-confirmed** — verify against a live `app.css` before building a pixel-1:1 skin.
5. **Bases view DOM** (`.bases-view`, `.bases-toolbar`) — essentially unconfirmed; Bases is newer so class names may still move.
6. **Exact runtime shape of `internalPlugins.plugins['file-explorer']`** — undocumented private API.
7. **Whether collapsing the core explorer leaf survives workspace save/restore.**
8. **`registerBasesView` / `BasesViewRegistration` API details** — and the confirmed gotcha that it returns `false` if Bases is disabled.
9. **Whether Obsidian's new "Community" platform / safety-scorecard (~2026-05-13) flags internal-plugin manipulation in plugin review** — could constrain how aggressive `service-unload` can be and still pass review.
10. **No measured performance numbers exist** — `perfProbe.ts` was never run. Every performance "lever" is well-reasoned but unconfirmed; run `__vaultmanPerfProbe.run(...)` against a 1000+ node vault before committing to G/H/K sequencing.
11. **`@chenglou/pretext` cost on the hot path** — never benchmarked; is `prepare`/`layout` memoized, and is there a fallback engine?

### Scope gaps in the research itself (not contradictions — just not covered)

- Grid / Table / Cards parity for the Tags and Outline providers was not assessed (FTO scoped to tree-surface parity).
- The Plugins and Snippets providers were not parity-audited at all.
- `pnpm-lock.yaml` transitive versions beyond the DnD family were not fully verified.
