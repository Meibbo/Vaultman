# Vaultman Explorer — Parity Research: Properties, Search, Bases

Research date: 2026-05-14. Parity target: "2:1" (more capable than core, with
settings that dial back to 1:1 / look identical).

Method: read the prior Bases interop research doc + shards; verified Vaultman
state in the `claude/explorer` worktree (`.claude/worktrees/jovial-wilson-f81c67`);
Obsidian core-plugin behavior from official docs (pages are JS-rendered so
fetched outlines were thin — core-plugin feature lists below are from
established, stable Obsidian behavior, flagged as inference where not directly
re-confirmed on 2026-05-14).

IMPORTANT — worktree differs from the recon baseline. Actual files found:
- `src/components/containers/panelExplorer.svelte` (unified surface)
- Views: `src/components/views/viewTree.svelte`, `ViewNodeGrid.svelte`,
  `ViewNodeTable.svelte`, `ViewNodeCards.svelte`, `ViewMarkmap.svelte`,
  `viewGrid.svelte`, `viewList.svelte`, `viewOutlineExplorer.svelte`,
  `viewDiff.svelte`, `viewEmptyLanding.svelte`
- Providers: `src/providers/explorerProps.ts`, `explorerContent.ts`,
  `explorerFiles.ts`, `explorerTags.ts`, `explorerOutline.ts`,
  `explorerPlugins.ts`, `explorerSnippets.ts`; provider container shims under
  `src/components/containers/explorer*.ts`
- `src/components/containers/explorerBasesImport.ts` + `explorerProps.ts` (the
  recon "panelExplorer 5 modes / Props provider" matches; the named
  `serviceSelection.svelte.ts`, `serviceExplorerDataPlane.svelte.ts`,
  `logicExplorerSnapshot.ts`, `serviceNodeFieldVisibility.ts` all exist)
- Bases interop: `src/services/serviceBasesInterop.ts`,
  `src/types/typeBasesInterop.ts`, `src/index/indexBasesImportTargets.ts`,
  `src/components/containers/explorerBasesImport.ts`
- Search/content: `src/index/indexContent.ts`, `src/providers/explorerContent.ts`,
  `src/components/primitives/boxSearch.svelte`,
  `src/components/frame/frameFiltersSearch.ts`, `frameSearchSources.ts`
- FnR (find & replace): `src/services/serviceFnR.ts`, `serviceFnRIsland.svelte.ts`,
  `serviceFnRPropSet.ts`, `serviceFnRTemplate.ts`, `serviceFnRDateParser.ts`

---

## 1. PROPERTIES (Obsidian core "Properties" plugin)

### 1a. Functional feature list — Obsidian core

Core "Properties" plugin surfaces (facts, established Obsidian behavior):

- **Properties in the editor** — frontmatter rendered as a structured
  key/value table at the top of a note. Each row = property pill (name +
  type icon) and a type-specific value widget.
- **Property types**: `text`, `list` (multitext / tags-like chips),
  `number`, `checkbox` (boolean), `date`, `datetime`. Type is global per
  property name across the vault (stored in `app.metadataTypeManager` /
  `types.json`).
- **Type-specific widgets**: text input; list = chip editor with
  add/remove + autocomplete; number = numeric input; checkbox = toggle;
  date/datetime = date picker. Unknown/mismatched values show a type
  mismatch affordance.
- **Add property**: "Add property" command + `+` affordance in the editor
  properties block; name autocomplete from existing vault property names;
  value autocomplete from existing values.
- **Default new property type** setting (core plugin setting).
- **Properties view** (sidebar leaf, view type `all-properties`): a tree of
  every property name in the vault with usage counts; expanding a property
  lists its values. Has its own search box. This is the closest core
  analogue to Vaultman's Props provider.
- **File properties view** (sidebar leaf, view type `file-properties`):
  shows the active file's properties — mirrors the editor block in the
  sidebar.
- **Special properties**: `tags`, `aliases`, `cssclasses` get dedicated
  handling/widgets.
- **Context-menu actions** (on a property row): change type (submenu of the
  6 types), rename property (vault-wide rename), delete property, copy.
  In the All Properties view: right-click a property/value for similar
  actions; click a value to search for it.
- **Keyboard**: Tab/Shift-Tab between property fields; Enter to commit;
  Esc to cancel; arrow keys within chip lists; the properties block is
  keyboard-navigable in the editor.
- **Drag**: reorder properties in the editor block.
- **Settings**: "Properties in document" = visible / hidden / source.

### 1b. DOM / class hooks — Obsidian core

For a 1:1 visual mimic, the relevant core DOM hooks (stable Obsidian
class names; inference — verify against a live build):

- Editor properties block: `.metadata-container`, `.metadata-properties`,
  `.metadata-property` (with `data-property-key="…"` and
  `data-property-type="…"`), `.metadata-property-key`,
  `.metadata-property-key-input`, `.metadata-property-icon`,
  `.metadata-property-value`, `.metadata-add-button`.
- Value widgets: `.metadata-input-longtext`, `.metadata-input-number`,
  `.metadata-input-checkbox`, multitext chips as `.multi-select-pill` /
  `.multi-select-pill-content` inside `.multi-select-container`,
  `.metadata-link` for link-type values.
- All Properties view leaf: `.tree-item` / `.tree-item-self` /
  `.tree-item-inner` / `.tree-item-flair` (count), nested values as child
  `.tree-item`s — i.e. the standard Obsidian nav-tree DOM, the same family
  Vaultman's `viewTree.svelte` would need to emit for `useNativeDom`.
- Type icons are Lucide glyphs (`lucide-text`, `lucide-list`, `lucide-hash`,
  `lucide-check-square`, `lucide-calendar`, `lucide-clock`).

### 1c. Vaultman parity status

| Capability | Status | Evidence |
|---|---|---|
| Property-name tree w/ counts | **HAVE** | `explorerProps.ts` `getStructuralTree()` via `PropsLogic` (`logicProps`); counts on `TreeNode` |
| Expand property → values | **HAVE** | value nodes (`isValueNode`), `kindFor` → `'prop'`/`'value'` in `getSnapshot()` |
| Per-provider search box | **HAVE** | `setSearchTerm(term, mode)` `'all' \| 'leaf'`; `filterTree` |
| Sort (name/count, asc/desc, top/children target) | **HAVE** (exceeds core) | `setSortBy`, `setSortTarget`, `_applySort` |
| Change property type (6 types) | **PARTIAL** | `prop.type-*` actions exist but only `text, number, checkbox, date, list` — **missing `datetime`**; and `_changePropType` `logicFunc` just re-writes the existing value, it does not coerce/transform the value to the new type |
| Rename property (vault-wide) | **HAVE** (exceeds core: bulk + FnR handoff) | `_renameProp` → `NATIVE_RENAME_PROP` queued op; `startPropRenameHandoff` |
| Delete property | **HAVE** (bulk) | `_deleteProp` → `DELETE_PROP`; multi-select aware (`contextPropNodes`) |
| Rename / delete value | **HAVE** (bulk) | `_renameValue`, `_deleteValue`, `replaceValueUpdate`, `deleteValueUpdate` |
| Set property / set value (bulk write) | **HAVE** (exceeds core) | `prop.set`/`value.set`, `_setValueOnFiltered`, FnR `add-prop` island |
| Click value → filter; secondary → content search | **HAVE** (different model than core) | `handleNodeClick` toggles `filterService`; `handleNodeSecondaryAction` → `openContentSearch` |
| Type-specific **value editor widgets** (date picker, checkbox toggle, chip editor) | **MISSING** (scaffold only) | `ViewColumn`/`ViewCell` types carry an `editable?: boolean` flag and settings expose `gridEditableColumns` + `gridRenderMode` (`plain\|chunk\|all`), but `ViewNodeTable.svelte` / `ViewNodeGrid.svelte` have **no inline-edit handlers** — they render `cell.display` strings only. Vaultman edits via modal/FnR/queue, not the core pill+widget surface. The plumbing for inline editing is half-laid |
| In-editor frontmatter properties block (the rendered table in a note) | **MISSING / out of scope** | Vaultman is a panel surface; it does not render the note frontmatter block. This is core's primary Properties surface |
| File-properties view (active file's props) | **MISSING** | no per-file properties leaf; Props provider is vault-wide only |
| Property type icons | **HAVE** | `TYPE_ICON_MAP` in `explorerProps.ts` (text/number/checkbox/date/datetime/list/multitext) |
| Special props (`tags`/`aliases`/`cssclasses`) special handling | **MISSING** | treated as plain property names |
| Value autocomplete on add/set | **PARTIAL** | FnR island templates exist (`serviceFnRTemplate.ts`); not the core name+value autocomplete UX |
| Native DOM class parity (`.metadata-property*`, nav-tree) | **PARTIAL** | `ViewNodeTable.svelte` emits `metadata-property` / `metadata-property-key` classes when `useNativeDom`; tree view native-class parity for All-Properties leaf not confirmed |
| `propsRevision`-driven incremental refresh | **HAVE** | `getStructuralRevisions()`, `propsIndex.subscribe`, `structuralCache` |

### 1d. Notes for "2:1" (Properties)

- Already past 1:1 on **bulk ops**: vault-wide rename/delete/set across many
  files with a queue + FnR handoff is strictly more capable than core's
  per-property rename.
- Gaps to close for **1:1 look/feel**: add a `datetime` type action and real
  type coercion in `_changePropType`; add inline type-specific value
  widgets (date picker, checkbox toggle, multitext chip editor) in
  `ViewNodeTable`/`ViewNodeCards` so the table mode can *edit* like core's
  pill widgets, not just display strings; add a "File properties" provider
  mode bound to the active file; special-case `tags`/`aliases`/`cssclasses`.
- "Dial back to 1:1": a setting to hide the extra sort targets / bulk
  badges and emit `.metadata-property*` / nav-tree DOM so a theme can't
  tell Vaultman's Props view from core's All-Properties view.
- "2:1" stretch: type-mismatch/conflict surfacing already exists
  (`isTypeIncompatible` → red "Conflict" badge in `_decorateTree`) — extend
  to a bulk "fix all conflicts" op; multi-property bulk type change is
  already wired (loops `contextPropNodes`).

---

## 2. SEARCH (Obsidian core "Search" plugin)

### 2a. Functional feature list — Obsidian core

Core "Search" plugin (facts, established Obsidian behavior — query syntax
is stable and documented):

- **Global search pane** (sidebar leaf `search`): query input, result list
  grouped by file with match snippets/context.
- **Query operators**:
  - `path:` — match on file path
  - `file:` — match on file name
  - `content:` — match only body content
  - `match-case:` / `ignore-case:` — case sensitivity per-term
  - `tag:#…` — notes with a tag (incl. nested)
  - `line:(…)` — terms on the same line
  - `block:(…)` — terms in the same block
  - `section:(…)` — terms in the same section (between headings)
  - `task:`, `task-todo:`, `task-done:` — match task lines / state
  - `property:` — notes having a property (value matching too)
  - `[bookmark]` style? no — but `ignore-diacritics:` exists for diacritic
    folding
  - Regex: `/pattern/` as a term
  - Booleans: space = AND, `OR`, `-` negation, `"exact phrase"`,
    `( )` grouping. Operators nest.
- **Result interactions**: collapse/expand results, "collapse all",
  per-file expand, change sort order (file name A→Z/Z→A, modified time,
  created time), show more / less context lines, copy search results
  (as a list), hover-preview matches, click to open at the match.
- **Embedded search**: a ```` ```query ```` code block in a note renders a
  live search-results block inline.
- **Settings** (search pane "settings" gear / context): "Explain search
  term" (shows how the query parsed), collapse results default, show more
  context default, sort order default.
- **Scope**: "Search in folder" via folder context-menu; results can be
  scoped to a path. Search-and-replace is **not** part of core search
  (only find/replace within the active editor, Ctrl/Cmd-F / Ctrl-H).
- **Keyboard**: focus search command; Up/Down through results; Enter to
  open.

### 2b. DOM / class hooks — Obsidian core

For a 1:1 visual mimic (stable Obsidian classes; inference):

- Search leaf: `.search-result-container`, search input
  `.search-input-container` > `input`.
- Each file group: `.search-result` > `.search-result-file-title`
  (`.tree-item-self`) with `.tree-item-icon` collapse chevron and
  `.tree-item-flair` match count; matches in `.search-result-file-matches`
  > `.search-result-file-match` with the matched substring wrapped in
  `<span class="search-result-file-matched-text">`.
- Toolbar: `.search-result-hover-button`, the collapse/sort/context
  controls live in the leaf's `.nav-buttons-container` / `.search-info`.
- Embedded query block renders inside `.internal-query` /
  `.search-result-container` in reading view.

### 2c. Vaultman parity status

| Capability | Status | Evidence |
|---|---|---|
| Vault-wide content search w/ snippets | **HAVE** | `indexContent.ts` `createContentIndex` — scans `getMarkdownFiles()`, line-by-line substring match, ±30-char before/after context |
| Results grouped by file, expandable | **HAVE** | `explorerContent.ts` `getTree()` groups matches by `filePath`, file node → match children |
| Match highlight in snippet | **HAVE** | `matchNode` sets `highlights: [{start,end}]`; `.vm-search-highlight` class added in `explorerProps` decorate path |
| Click match → open file at line | **PARTIAL** | `handleNodeClick` → `workspace.openLinkText(file.path, '', false)` — opens the file but **does not jump to the match line** (`match.line` is captured but unused for navigation) |
| Incremental / chunked scan w/ progress | **HAVE** (exceeds core's perceived UX) | `refresh()` chunked (20 files), batched publish every 100 files / 250ms, `ContentSearchStatus` phase `scanning`/`done` |
| Search result cache | **HAVE** | `ServiceCache` keyed by query + vault fingerprint (mtime/size) |
| Query **operators** (`path:`,`file:`,`tag:`,`line:`,`block:`,`section:`,`task:`,`property:`, regex, `OR`, `-`, quotes, grouping) | **MISSING** | `indexContent.ts` does a plain `toLowerCase().indexOf()` substring match — **no operator parser at all**. This is the single biggest Search parity gap |
| Case sensitivity / diacritics toggle | **MISSING** | always lowercased |
| Sort order of results | **MISSING** | results emitted in file-scan order; no sort UI for content provider |
| Show more / less context lines | **MISSING** | fixed ±30 chars, single line only |
| Collapse-all / expand-all | **PARTIAL** | generic Explorer expansion (`utilExplorerExpansion.ts`) applies, but no Search-specific collapse-all control |
| Copy search results | **MISSING** | not found |
| Embedded ```query``` code block rendering | **MISSING** | no markdown-post-processor for query blocks |
| Search-in-folder scoping | **PARTIAL** | Explorer has `filterService` + operation scope, but content index always scans the whole vault (`getMarkdownFiles()`); no folder-scoped content search |
| Delete file from result row | **HAVE** (exceeds core) | `content.delete` context action + hover "delete" badge, bulk via `selectedNodes` |
| Find **and replace** across results | **HAVE** (far exceeds core) | the whole FnR island (`serviceFnR.ts`, `serviceFnRIsland.svelte.ts`) — core search has no replace |
| Native DOM parity (`.search-result*`) | **MISSING** | content rows render through the generic `viewTree`/`ViewNodeTable` DOM (`vm-explorer-*`, `vm-node-table-*`), not `.search-result-*` |
| Multi-view rendering of results (table/cards/grid) | **HAVE** (exceeds core) | content provider feeds the unified surface; core search is list-only |

### 2d. Notes for "2:1" (Search)

- The replace side is already **2:1+** — core has no cross-file replace and
  Vaultman has a whole FnR island with templates, date parsing, prop-set.
- To even reach **1:1 on the *search* side**, the dominant missing piece is
  a **query parser**: implement `path:`/`file:`/`content:`/`tag:`/`line:`/
  `block:`/`section:`/`task:`/`property:` + boolean `OR`/`-`/`"…"`/`( )` +
  `/regex/` and `match-case:`/`ignore-diacritics:`. Today `indexContent.ts`
  is a literal substring scanner.
- Other 1:1 gaps: jump-to-line on click (data is already there —
  `match.line`); result sort order; variable context lines; collapse-all;
  copy-results; folder scoping of the content scan; an embedded `query`
  code-block post-processor.
- "Dial back to 1:1": setting to render content results in the
  `.search-result-*` DOM and hide the table/cards/grid mode switch and the
  bulk-delete badges.
- "2:1" stretch beyond replace: structured query chips (reuse the filter IR
  from Bases interop), saved searches, regex with capture-group preview,
  result-set → bulk operation (already partly true via delete badge).

---

## 3. BASES (Obsidian core "Bases" plugin)

Builds on the existing research doc — see §4 for what that doc covers.

### 3a. Functional feature list — Obsidian core

Core "Bases" (confirmed in the prior research shards `01-sources-api.md`
from official docs checked 2026-05-05; `.base` = YAML):

- `.base` file schema: top-level `filters`, `formulas`, `properties`,
  `summaries`, `views`.
- **Views**: `type` (`table`, `cards`, `list`, `map`), `name`, optional
  per-view `filters`, `groupBy`, `order`, `summaries` + plugin-specific
  custom keys.
- **Filters**: global (all views, ANDed) + per-view; string expression OR
  recursive `{and|or|not: […]}` object. Filter strings share the formula
  expression language.
- **Expression language**: note props (`note.x`, shorthand `x`), file props
  (`file.name/.path/.folder/.ext/.ctime/.mtime/.tags/.links/.backlinks/…`),
  `formula.name`, `this` (context-dependent: base file / embedding file /
  active file). Operators `==` `!=` `<` `<=` `>` `>=`, `&&` `||` `!`;
  methods `.contains` `.containsAny` `.startsWith` `.endsWith` `.isEmpty`
  `.filter`; functions `file.hasTag` `file.inFolder` `file.hasLink`,
  `date()` `today()` `now()` `.format()`, `link()`, `html()` `image()`
  `icon()`, regex `/…/.matches(…)`.
- **Formulas**: named computed columns.
- **Summaries**: aggregates (`values.mean()`, `Average`, `.round()`).
- **Properties block**: per-property `displayName` and config metadata.
- Embedded bases via a ```` ```base ```` code fence in a note.
- **Public API**: `Plugin.registerBasesView(viewId, registration)` —
  custom view types; `BasesView extends Component` with `onDataUpdated()`,
  `app`, `config`, `allProperties`, `data` (`BasesQueryResult`);
  `BasesViewConfig` get/set/`getOrder()`/`getSort()`/`getDisplayName()`;
  `QueryController` is a public constructor dependency but exposes **no
  public arbitrary-query API** outside a registered view's lifecycle.
- `Value` type system (`NullValue`/`NumberValue`/`StringValue`/`DateValue`/
  `DurationValue`/`ListValue`/`ObjectValue`/`FileValue`/`RegExpValue`/
  `UrlValue` + HTML/icon/image/link values).

### 3b. DOM / class hooks — Obsidian core

Bases renders its own views; the prior research did not capture concrete
class names (DOM hooks are an **explicit unknown** — see §5). Known-stable
shells only: a Bases leaf/embed renders inside a `.bases-view` /
`.bases-toolbar` style container with a view-type switcher; the `table`
view is an HTML grid, `cards` a card grid, `list` a list. Custom views via
`registerBasesView` get a bare `containerEl` and own all their markup —
i.e. Vaultman *could* register a view and emit whatever DOM it wants
(including its own `vm-*` classes), so 1:1 DOM mimicry is **not required**
for the custom-view path; it only matters if Vaultman tries to *replace*
the core table/cards/list look inside its own panel.

### 3c. Vaultman parity status

| Capability | Status | Evidence |
|---|---|---|
| Discover `.base` files + notes w/ `base` code fences | **HAVE** | `indexBasesImportTargets.ts`, `explorerBasesImport.ts` provider (`id='bases-import'`), `BasesFencedBlock` type |
| Parse `.base` YAML, preserve raw config | **HAVE (partial scope)** | `serviceBasesInterop.ts`; `BasesImportPreview.rawConfig: Record<string,unknown>` keeps raw |
| Import preview w/ applied/unsupported/errors report | **HAVE** | `BasesInteropReport` (`applied`, `unsupported`, `parseErrors`); `BasesAppliedExpression` / `BasesUnsupportedExpression` (`preserved` flag) |
| Map safe filter expressions → Vaultman filter IR | **PARTIAL — narrow** | `serviceBasesInterop.ts` `convertExpression` maps **exactly 4 expression shapes**: `prop == "value"` (non-`file.`) → `specific_value`; `file.{name\|folder\|path}.contains("…")` → `file_name`/`file_folder`/`folder`; `file.hasTag("…")` → `has_tag`; `file.inFolder("…")` → `file_folder`. **Everything else** (`!=`, `<`/`<=`/`>`, `&&`/`\|\|`/`!` inline, `.containsAny`/`.startsWith`/`.isEmpty`, list methods, `this`, `date()`/`today()`, regex, formula refs) → `reportUnsupported` (`preserved: true`) |
| Filter object logic `and`/`or`/`not` | **HAVE** | `convertFilter` recurses objects/arrays; `GROUP_KEYS` = `and\|or\|not` → `BasesImportedFilterGroup.logic`; arrays default to `and` group |
| Global + per-view filter import | **HAVE (both)** | `previewBasesImport` calls `convertFilter` on `rawConfig.filters` AND `findViewFilters(rawConfig, targetViewName)`, `combineFilters` ANDs them — contradicts the older compat-matrix "no per-view filter IR" row; per-view filter import **is** implemented for a named target view |
| Bases code-fence detection | **HAVE (note: ` ```bases ` not ` ```base `)** | `extractBasesFencedBlocks` regex `^\s*```\s*bases(?:\s+\w+)?\s*$` — matches the `bases` fence keyword |
| Custom Vaultman Bases view via `registerBasesView` | **MISSING** | "no integration" (compat matrix row); not wired in worktree |
| `.base` **export** from Vaultman filters/views | **MISSING** | only import-preview types exist; no exporter, no `InteropReport` emitter for export |
| Formulas / summaries | **MISSING (preserve-only intent)** | research says preserve in config IR; not modeled — no `formulas`/`summaries` types in `typeBasesInterop.ts` |
| View `type`/`groupBy`/`order`/`sort` mapping | **PARTIAL / planned** | compat matrix maps core views → `ExplorerViewMode`; Vaultman has table/cards/grid/list/tree modes + `ViewGroup`; plugin-specific view keys preserved opaquely (planned, not all implemented) |
| `map` view | **MISSING** | no map mode in Vaultman |
| Plugin custom view types (TaskNotes, dynamic, facet, carousel) | **MISSING (preserve opaque)** | no renderer adapters; round-trip opaque only (planned) |
| Expression evaluator compatible w/ Bases `Value` system | **MISSING** | Vaultman flattens to strings; no `Value` subclasses |
| Multi-mode rendering of imported data (table/cards/grid/mindmap) | **HAVE** (exceeds core's 4 view types) | unified Explorer surface; once data is imported it gets all 5 Vaultman modes |
| Bulk ops on Bases-derived rows | **HAVE** (far exceeds core) | any provider's nodes flow into queue/FnR/selection; core Bases is read/query-only |

### 3d. Notes for "2:1" (Bases)

- Vaultman's *angle* on Bases is interop + bulk-edit, which is inherently
  "2:1": core Bases is a read/query/display surface; Vaultman can take the
  same `.base` filter/view config and drive **bulk edits** + multi-mode
  rendering off it.
- For **1:1**: (a) finish the filter expression IR so more of the corpus
  imports losslessly (the prior research's "wider IR with raw expression
  leaves" — comparisons, boolean ops, list/string methods, dates); (b)
  per-view filter IR; (c) model `formulas` and `summaries` even if only
  preserved; (d) ship at least one of the three "first slice" options from
  the research (read-only import preview is closest to done; `.base`
  export and `registerBasesView` are both still MISSING).
- "Dial back to 1:1 / look identical": register a Vaultman Bases view via
  `registerBasesView` whose default skin mimics core `table`/`cards`/`list`
  — then a Vaultman base looks like a core base but a setting unlocks the
  extra Explorer modes + bulk ops.
- "2:1" stretch: `.base` export so Vaultman filter/view state round-trips
  to a portable file; advanced query chips (read-only vs editable —
  research's open question §"Immediate Next Design Tasks #3").

---

## 4. How the existing Bases research doc relates

`.agents/docs/work/hardening/research/2026-05-05-bases-interop-research/`
(index + shards `01-sources-api`, `02-local-fixtures`, `03-compat-design`,
`04-compatibility-matrix`).

**What it covers (don't redo):**
- Authoritative Bases semantics + public API surface from official docs
  and `obsidian.d.ts` (shard 01) — schema, expression language, `Value`
  types, `registerBasesView`, `BasesView`/`BasesViewConfig`/
  `BasesQueryResult`.
- A 25-file `.base` corpus classified by expression feature + view type
  (136 views, 10 view types) — shard 02 / matrix "Corpus Classification".
- A full feature-by-feature **compatibility matrix** with import/export
  strategy + lossiness rating (shard 04).
- Confirmed direction: interop must be separate from FnR; needs a wider
  filter/view IR with raw expression leaves; import-preview-first.

**Gaps in that doc (this research adds / flags):**
- It is interop-only — no **functional or visual parity** framing vs core
  Bases as a *plugin surface* (no DOM/class hooks; that's an unknown here
  too, §5).
- It predates the current worktree; this doc verifies what actually landed
  (`serviceBasesInterop.ts` read in full, 268 lines):
  `serviceBasesInterop.ts` + `typeBasesInterop.ts` + `indexBasesImportTargets.ts`
  + `explorerBasesImport.ts` exist and implement **import-preview only**
  (`previewBasesImport`, `extractBasesFencedBlocks`). **`.base` export, an
  `InteropReport` emitter for export, formulas/summaries modeling, and
  `registerBasesView` are all still MISSING** — `grep registerBasesView src/`
  returns nothing.
- Two compat-matrix rows are now **stale vs the worktree**: (a) "View
  filters: no per-view filter IR" — per-view filter import *is* wired
  (`findViewFilters` + `combineFilters`); (b) the matrix implies a broader
  set of mappable predicates than the 4 shapes `convertExpression` actually
  handles today. The matrix is a *design target*; the worktree is a thinner
  first cut.
- It does not touch Properties or Search at all (this doc's §1–§2).

---

## 5. Explicit unknowns

- **Obsidian core DOM/class names not re-verified on 2026-05-14.** The
  official help pages (`obsidian.md/help/properties`, `…/plugins/search`)
  are JS-rendered; WebFetch returned only outlines/titles. The
  `.metadata-property*`, `.search-result-*`, `.tree-item-*` hooks listed
  are from stable, long-standing Obsidian class names (high confidence) but
  should be confirmed against a live build or `app.css` before building a
  pixel-1:1 skin.
- **Bases view DOM** (`.bases-view` etc.) is essentially unconfirmed — the
  prior research never captured concrete Bases markup, and Bases is newer
  so class names may still move.
- **Whether Vaultman targets in-editor surfaces at all.** Core Properties'
  primary surface is the *frontmatter block inside a note*; core Search's
  is the *sidebar pane* + *embedded query blocks*. Vaultman's Explorer is a
  panel. Reaching "1:1" on those in-editor/embedded surfaces may be out of
  scope by design — needs a product decision (flagged, not assumed).
- **Recon baseline vs worktree drift.** The task's recon described 5 view
  modes; `typeViews.ts` `EXPLORER_VIEW_MODES` is actually **6**: `tree`,
  `table`, `grid`, `cards`, `markmap`, `list`. Recon's named services all
  exist, but the worktree also has more views (`viewList`, `viewGrid`,
  `viewOutlineExplorer`, `viewDiff`) and providers (`outline`, `plugins`,
  `snippets`) than recon listed. Parity tables above are scoped to
  Props/Content/Bases providers; other providers not audited.
- Core Search operator list (`section:`, `task-*:`, `property:`,
  `ignore-diacritics:`) is from stable documented Obsidian syntax; not
  re-confirmed line-by-line against the 2026-05-14 docs build.

---

## 6. Parity gap summary (all three plugins)

| Plugin | HAVE (≥1:1) | PARTIAL | MISSING (blocks 1:1) | Already 2:1 |
|---|---|---|---|---|
| **Properties** | prop/value tree + counts, search, sort (exceeds), vault-wide bulk rename/delete/set, type icons, conflict badge, incremental refresh | change-type (no `datetime`, no value coercion), value autocomplete, native-DOM class parity | inline type-specific **value widgets** (date/checkbox/chip editors), in-editor frontmatter block, File-properties view, `tags`/`aliases`/`cssclasses` special-casing | bulk multi-file ops + multi-mode rendering + bulk type change + conflict surfacing |
| **Search** | content scan + snippets, grouped/expandable results, highlight, chunked scan w/ progress, result cache, delete-from-result (exceeds) | jump-to-line on click, collapse-all, folder scoping | **query operator parser** (`path:`/`file:`/`tag:`/`line:`/`block:`/`section:`/`task:`/`property:`/regex/booleans), case+diacritics toggle, result sort, variable context lines, copy-results, embedded `query` block, native `.search-result-*` DOM | cross-file **find & replace** (FnR island), multi-mode result rendering |
| **Bases** | discover `.base`/`bases`-fences, parse YAML + preserve raw, `and`/`or`/`not` group import, global+per-view filter import, import-preview report w/ preserved unsupported, multi-mode render of imported data (exceeds), bulk ops on rows (exceeds) | filter-expression→IR mapping is **only 4 shapes** (`==`, `file.*.contains`, `file.hasTag`, `file.inFolder`) — everything else preserved-but-unsupported | `.base` **export**, `registerBasesView` integration, `formulas`/`summaries` modeling, broader expression IR (`!=`/comparisons/inline booleans/list+string methods/`this`/dates/regex), expression evaluator (`Value` system), `map` view, plugin custom-view adapters | interop + bulk-edit angle on read-only core Bases |

---

## Sources

**Files read (worktree `claude/explorer` = `.claude/worktrees/jovial-wilson-f81c67`):**
- `src/providers/explorerProps.ts` (full)
- `src/providers/explorerContent.ts` (full)
- `src/index/indexContent.ts` (full)
- `src/services/serviceNodeFieldVisibility.ts` (full)
- `src/types/typeBasesInterop.ts` (full)
- `src/components/containers/explorerBasesImport.ts` (full)
- `src/components/views/ViewNodeTable.svelte` (full)
- `src/styles/explorer/_explorer.scss` (full)
- Directory listings: `src/`, `src/components/views/`, `src/providers/`,
  `src/services/`, plus `git log` on `panelExplorer.svelte`

**Prior research read:**
- `.agents/docs/work/hardening/research/2026-05-05-bases-interop-research/index.md`
- `…/01-sources-api.md`
- `…/04-compatibility-matrix.md`

**Web (official Obsidian docs — JS-rendered, only outlines retrieved):**
- https://obsidian.md/help/properties (redirect from help.obsidian.md/properties)
- https://obsidian.md/help/plugins/search (redirect from help.obsidian.md/plugins/search)
- Bases docs referenced via prior research shard 01: https://obsidian.md/help/bases/syntax,
  https://obsidian.md/help/bases/functions, https://docs.obsidian.md/plugins/guides/bases-view

**Inference vs fact:** Worktree file evidence = fact. Obsidian core
Properties/Search query syntax and behavior = established/documented but
not re-confirmed line-by-line on 2026-05-14 (JS-rendered docs) — treat
operator lists and class-name lists as high-confidence inference. Bases
semantics/API = fact (captured in prior research from official docs +
`obsidian.d.ts`). Bases view DOM = unknown.
