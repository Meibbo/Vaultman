# Vaultman Explorer Parity Research — File Explorer, Tags, Outline

Date: 2026-05-14. Scope: parity (functional + visual/DOM) of Vaultman's unified Explorer vs three Obsidian CORE plugins — **File Explorer, Tag pane, Outline**. Parity target: "2:1 — more capable than core, with a settings dial back to 1:1 / look identical."

Worktree read: `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\jovial-wilson-f81c67`.

> **Method note.** Obsidian's help site (`help.obsidian.md` → `obsidian.md/help/...`) is JS-rendered; WebFetch returned title-only. Functional baselines below are assembled from Obsidian help summaries via search, DeepWiki (`obsidianmd/obsidian-help`), community plugin READMEs (Notebook Navigator, Tag Wrangler, Quick Explorer), and forum threads. DOM/class hooks come from community CSS-snippet repos that mirror the live DOM. **These are well-corroborated but not the verbatim source — flagged as [inference] where a fact is reconstructed rather than directly documented.** The `musiweb3/obsidian-web` / `MusiCode1/obsidian-web` repo lead was not reachable/located in this pass (see Unknowns).

---

## 1. FILE EXPLORER

### 1a. Functional feature list (Obsidian core baseline)

**Tree / structure**
- Hierarchical folder + file tree; folders expand/collapse via a collapse indicator (chevron). Root is `mod-root`.
- "Show attachments" / file-type visibility governed by global Files & Links settings (not the plugin pane itself).
- Single active file is highlighted (`is-active`); follows the active editor leaf.
- Folder note support [inference, from help summary]: previewing/navigating a folder can surface a "folder note" of the same name.

**Interactions**
- Click file → open in current pane. Ctrl/Cmd-click or middle-click → open in new tab/pane/split. (Standard Obsidian link-open modifiers.)
- Click folder title → toggle collapse.
- Drag-and-drop: move file(s) into folders; move folders; drag a file into the editor to create a link. Multi-drag of a selection.
- Multi-select: Ctrl/Cmd-click toggles, Shift-click range. Selection used for bulk move/delete.
- Rename: `F2` or context menu or double-click-ish slow-click; inline rename input over the title.
- New note / new folder buttons at the top of the pane.
- Collapse-all button in the pane header.
- "Reveal current file in navigation" command scrolls + highlights the active file.
- Drag-to-reorder is NOT supported by core (files sort by configured order only); custom order needs a community plugin.

**Settings (core plugin + related global)**
- File sorting order: File name (A→Z / Z→A), Modified time (new→old / old→new), Created time (new→old / old→new). Set via the sort dropdown in the pane header.
- "Show all file types" (global Files & Links) — whether non-md files appear.
- Confirm file deletion; deleted files → system trash / Obsidian `.trash` / permanent (global setting).
- Default location for new notes.

**Context menu (file)**: Open in new tab / new pane / new window; Make a copy; Delete; Rename; Move file to…; "Add to" (Bookmarks if enabled); Open in default app; Show in system explorer; Reveal in navigation; copy Obsidian URL. (Exact set varies by enabled plugins.)
**Context menu (folder)**: New note; New folder; Set as attachment folder; Rename; Delete; Move folder to…; Search in folder.

**Keyboard**: `Ctrl/Cmd+N` new note; `F2` rename; arrow keys navigate the tree when focused (up/down move, left/right collapse/expand) [inference]; `Enter` opens; `Delete` deletes [inference]. Core keyboard support in the file tree is comparatively thin — much navigation is mouse-driven.

### 1b. DOM / class hooks (for 1:1 mimicry)

```
.nav-files-container .nav-folder.mod-root
  └ .nav-folder-title (mod-collapsible)            ← folder row
      .nav-folder-collapse-indicator .collapse-icon
      .nav-folder-title-content
  └ .nav-folder-children
      └ .nav-folder.is-collapsed / (expanded)
      └ .nav-file
          └ .nav-file-title  (.is-active when active)
              .nav-file-title-content
              .nav-file-tag                         ← e.g. extension badge
```
Also part of the shared tree primitive: `.tree-item`, `.tree-item-self`, `.tree-item-inner`, `.tree-item-children`, `.is-collapsed`, `.is-active`, `.mod-collapsible`, `.is-being-dragged`, `.nav-file-title.is-active`. Each row carries a `data-path` attribute. The pane lives in a `.workspace-leaf-content[data-type="file-explorer"]`; tab header `aria-label="File explorer"`.

### 1c. Vaultman parity status

| Aspect | Status | Evidence |
|---|---|---|
| Folder/file tree, expand/collapse | **Have** | `viewTree.svelte` flatten+virtualize; `panelExplorer.svelte` `expandedIds`, `toggleExpand`, `expandAllParents/collapseAllParents`; `explorerFiles.ts` `logic.buildFileTree({foldersFirst})` |
| Multi-select (Ctrl/Shift/box) | **Have** (exceeds core) | `serviceSelection.svelte.ts` `NodeSelectionService`; `selectPointer`, `selectBox`, Shift-range, keyboard nav in `panelExplorer.handleRowKeydown` |
| Keyboard nav (arrows, PageUp/Down, Space, Enter) | **Have** (exceeds core) | `panelExplorer.handleRowKeydown` — ArrowLeft/Right collapse/expand+parent-hop, PageUp/Down step 10, Space toggle, Enter→secondary action |
| Sorting (name/date/count) | **Have**, partly exceeds | `explorerFiles._sortFiles` supports name, date (mtime), **count** (frontmatter key count — not a core option). No created-time sort. |
| Context menu (file/folder) | **Partial** | `explorerFiles.registerActions`: Rename, Delete, Set(append link), Move file, folder Filter. Missing core items: open-in-new-tab/pane/window, make-a-copy, reveal-in-nav, show-in-system, copy-URL, new note/folder from folder, set-as-attachment-folder. |
| Drag-and-drop move into folders | **Partial / Missing** | DnD infra exists (`serviceDnd`, `serviceManualDnd`, `applyManualNodeReorder`, `manualDndEnabled`) but it is **reorder-oriented**, not "move file into folder = filesystem move". `handleManualNodeDrop` only handles `operation === 'reorder'`. |
| Inline rename | **Partial** | `viewTree.svelte` has `editingId`/`vm-tree-input`/`onRename`, but `panelExplorer.svelte` does not wire `editingId`/`onRename` to ViewTree — rename goes through `FileRenameModal`/FnR handoff instead. |
| Active-file highlight + reveal | **Have** | `scrollTarget`/`revealNode`, `is-active-filter`/`is-selected`/`is-focused` classes; `vaultman:open` → `focusFirstNode`. Note: highlight is *selection/filter* driven, not "follows active editor leaf" — see 2:1 notes. |
| Folder note support | **Missing** | No folder-note concept in `explorerFiles.ts`. |
| New note / new folder buttons | **Missing in this surface** | Not in `panelExplorer.svelte` toolbar (`GridNavigationToolbar` is grid-nav only). |
| 1:1 DOM mimicry | **Partial** | `viewTree.svelte` emits `tree-item`, `tree-item-self`, `tree-item-inner` **only when `useNativeDom`** (`themeService.useNativeDom`). It does NOT emit `nav-file`, `nav-folder`, `nav-folder-children`, `nav-file-title`, `is-collapsed`, `mod-collapsible`, `data-path`. **Note:** the *other* views are further along — `ViewNodeTable.svelte`, `ViewNodeCards.svelte`, `ViewNodeGrid.svelte` DO emit `nav-file` / `nav-file-title` under `useNativeDom` (Grep ll. 643/672, 406/433, 921/966). So the tree view is the specific 1:1-DOM gap, not the whole Explorer. Also `serviceFoulDetection.svelte.ts` (l.50) self-checks that the files explorer renders `.nav-file` — implying native-DOM emission is an intended, partially-shipped contract. |

### 1d. Notes for 2:1 (more capable than core)

- Vaultman already exceeds core: 5 view modes (tree/grid/table/cards/mindmap-stub), box-select, rich keyboard nav, badges/queue overlay, per-field visibility (`serviceNodeFieldVisibility` FILE_TREE_FIELDS: icon/name/ext/date/tags/path), bulk operations queue.
- To claim 2:1 *and* offer a 1:1 dial-back: add a settings flag that (a) forces `useNativeDom` + emits the full `nav-folder`/`nav-file`/`data-path` class set and `is-collapsed`/`mod-collapsible`, (b) hides extra view modes and badge overlays, (c) maps sort options to exactly the core six.
- Gaps to close even for "2:1": real filesystem move via DnD; full file/folder context menu; folder notes; "new note/folder" affordances; "follow active editor leaf" highlight.

---

## 2. TAG PANE

### 2a. Functional feature list (Obsidian core baseline)

- Lists every tag in the vault with a usage **count** next to each.
- **Nested tags** (`#parent/child`) render hierarchically; parent rows expand/collapse to reveal children. A parent tag that is itself unused still shows as a grouping row.
- Click a tag → opens Search with `tag:#thatTag` (populates the search pane). [inference: long-standing behavior]
- Sort options in the pane header: by name (A→Z, Z→A) and by frequency/count (greatest→least, least→greatest).
- Search/filter box within the pane to narrow the tag list [inference — present in recent versions].
- Context menu on a tag is minimal in core (essentially "search for this tag"); rename/merge requires the community Tag Wrangler plugin — a strong signal of where core stops.
- Counts aggregate: a parent tag's count includes descendants [inference].
- Both frontmatter `tags:` and inline `#tags` are surfaced.

### 2b. DOM / class hooks

```
.workspace-leaf-content[data-type="tag"]
  .tag-container
    .tree-item (.is-collapsed for collapsed parents)
      .tree-item-self .tag-pane-tag .is-clickable (.mod-collapsible if has children)
        .tree-item-icon .collapse-icon          ← chevron for nested
        .tree-item-inner  →  .tag-pane-tag-text (often split: .tag-pane-tag-self + .tag-pane-tag-sub for nested segment)
        .tree-item-flair-outer → .tree-item-flair .tag-pane-tag-count   ← count pill
      .tree-item-children                        ← nested child tags
```
Key hooks: `.tag-pane-tag`, `.tag-pane-tag-text`, `.tag-pane-tag-count`, `.tree-item-flair`, plus shared `.tree-item*`, `.is-collapsed`, `.is-clickable`, `.mod-collapsible`. [inference — corroborated by Tag Wrangler / theme CSS, not verbatim docs.]

### 2c. Vaultman parity status

| Aspect | Status | Evidence |
|---|---|---|
| Tag list with counts | **Have** | `explorerTags.ts` provider; nodes carry `count`/`countLabel`; `viewTree` `vm-tree-count`. `COMMON_TAG_FIELDS` includes `count` (defaultOn), `files`. |
| Nested tag hierarchy + expand/collapse | **Have** | `explorerTags.getTree()` → `TagsLogic.getTree()` produces nested `TreeNode<TagMeta>`; tree expand/collapse shared with file explorer. `searchMode 'leaf'` can flatten to leaves only. |
| Sort by name / count | **Have** | `explorerTags._sortNodeList` (name `localeCompare`, `count`); plus `sortTarget` 'top' vs 'children' (exceeds core — core sorts uniformly). |
| Search / filter within pane | **Have** (exceeds core) | `explorerTags.setSearchTerm(term, mode)` + `logic.filterTree`; `all` vs `leaf` modes. |
| Click tag → search | **Partial / different** | `handleNodeClick` toggles a **Vaultman filter** (`filterService.addNode has_tag`), not Obsidian's Search pane. `handleNodeSecondaryAction` *does* route to content search (`openContentSearchHook`/`contentIndex.setQuery`). So behavior is reachable but bound to secondary action, not primary. |
| Context menu | **Have / exceeds** | `explorerTags.registerActions`: Rename (FnR handoff or modal), Set tag, Create/open binding note, Delete (bulk-aware "Delete N tags"). Core only really does "search". Vaultman ≈ Tag Wrangler-level. |
| Tag rename / merge (bulk) | **Have** (exceeds core) | `_renameTag` → `buildTagRenameChange` across `filesWithTag`; queue-based, multi-file. Core cannot rename tags at all. |
| Iconic tag icons | **Have** | `_decorateTree` reads `iconicService.getTagIcon`. |
| 1:1 DOM mimicry | **Missing** | `viewTree.svelte` never emits `tag-pane-tag`, `tag-pane-tag-text`, `tag-pane-tag-count`, `tree-item-flair`. `useNativeDom` only adds generic `tree-item*`. No provider-specific native class path. |

### 2d. Notes for 2:1

- Vaultman's Tags surface already substantially exceeds core (rename/merge/delete/set, filtering, binding notes, multiple view modes, icons). The functional 2:1 is essentially met.
- 1:1 dial-back work is mostly **visual**: emit `tag-pane-tag` + `tag-pane-tag-count` + `tree-item-flair` under a native-DOM flag; optionally make primary click open Search instead of the Vaultman filter when in "core compat" mode.
- 2:1 extras worth noting: tag co-occurrence, drag-tag-onto-files to bulk-tag (DnD hover badge `set` already half-implements this via `handleHoverBadge('set')`), per-tag last-modified (`date` field exists but returns '').

---

## 3. OUTLINE

### 3a. Functional feature list (Obsidian core baseline)

- Shows the **heading hierarchy** of the active note (H1–H6), indented by level.
- Click a heading → scrolls/jumps the editor to that heading.
- **Collapse/expand** heading sections within the outline pane (a relatively recent addition).
- **Drag-and-drop reorder**: dragging an outline item reorders the corresponding heading section *in the document* (moves the heading + its body). This is a notable core capability.
- Updates live as headings are added/edited/removed (with a known historical quirk: outline can reset collapse state on edits).
- Follows the active editor leaf — switching notes re-populates the outline.
- Context menu is minimal; the pane has a collapse-all and a "follow"/sync affordance [inference].
- Only headings — core Outline does NOT show tasks, list items, or block refs.

### 3b. DOM / class hooks

```
.workspace-leaf-content[data-type="outline"]
  .outline                              ← container
    .tree-item (.is-collapsed)
      .tree-item-self .is-clickable (.mod-collapsible)
        .tree-item-icon .collapse-icon
        .tree-item-inner   ← heading text
      .tree-item-children
        … nested heading tree-items …
```
Hooks: `.outline`, plus shared `.tree-item`, `.tree-item-self`, `.tree-item-inner`, `.tree-item-icon`, `.tree-item-children`, `.is-collapsed`, `.is-clickable`, `.mod-collapsible`. Heading level sometimes exposed via a `data-heading-level` style attribute [inference]. [DOM reconstructed from theme CSS — not verbatim docs.]

### 3c. Vaultman parity status

| Aspect | Status | Evidence |
|---|---|---|
| Heading hierarchy of a file | **Have (logic)** | `explorerOutline.ts` `buildOutlineForFile` parses `#`..`######` into nested `AdoptedNode[]` with depth; also parses **tasks** and **block ids** (exceeds core). |
| Dedicated Outline view component | **Have but minimal/disconnected** | `viewOutlineExplorer.svelte` renders a static recursive tree (`vm-outline-row`/`vm-outline-self`/`vm-outline-label`). It is a plain render — **no virtualization, no click-to-jump, no collapse/expand, no DnD**. |
| Outline as a panelExplorer provider | **Missing / partial** | There is no `explorerOutline` *provider class* implementing `ExplorerProvider` (Grep of `implements ExplorerProvider` returns Files/Tags/Props/Content/Plugins/Snippets/BasesImport — **not Outline**). `explorerOutline.ts` is only a builder used by `explorerFiles.preloadAdoptedChildren` to graft outline nodes as *adopted children* of file rows. **However**, `explorer-outline` IS a registered first-class **tab identity** in `registry/tabRegistry.ts` (`TabId`, `DETACHABLE`, `ALL_TAB_IDS`, inner-id `'outline'` ↔ `'explorer-outline'`) — so the panel *slot* exists and is detachable; what is missing is the provider + a real view wired into `panelExplorer.svelte`. The tab currently must be backed by the minimal `viewOutlineExplorer.svelte`. |
| Click heading → jump to location | **Missing** | `viewOutlineExplorer.svelte` has no click handler; `AdoptedNode` carries `line` but nothing navigates to it. (Adopted nodes inside Files go through `panelExplorer.activateNode`, which opens the *file*, not the line.) |
| Collapse/expand sections | **Missing** in `viewOutlineExplorer.svelte` | Component renders all children unconditionally. (If routed through `viewTree.svelte` it would inherit collapse, but it is not.) |
| Drag-and-drop reorder of headings | **Missing** | No DnD in `viewOutlineExplorer.svelte`; no "move heading section in document" operation anywhere in scope read. |
| Follows active editor leaf | **Missing / unverified** | No active-leaf subscription found feeding `viewOutlineExplorer`. |
| Live update on edit | **Partial** | `buildOutlineForFile` is invoked by `preloadAdoptedChildren` (cache keyed by path); refresh path exists for the Files explorer but not a standalone Outline. |
| Tasks + block refs in outline | **Have (exceeds core)** | `buildOutlineForFile` emits `kind: 'task'` (with `taskState`) and `kind: 'block'` nodes — core Outline shows headings only. `viewOutlineExplorer` icons cover header/task/bookmark. |
| 1:1 DOM mimicry | **Partial** | `viewOutlineExplorer.svelte` emits `tree-item`/`tree-item-self`/`tree-item-inner`/`tree-item-children` **only when `useNativeDom`**. Does NOT emit `.outline` container class, `collapse-icon`, `mod-collapsible`, `is-collapsed`. |

### 3d. Notes for 2:1

- **Outline is the weakest of the three for parity.** Even 1:1 is not met: no click-to-jump, no collapse, no DnD reorder, no active-leaf follow. The panel *slot* (`explorer-outline` tab) exists and is detachable, but it has no `ExplorerProvider` behind it and is backed by the minimal static `viewOutlineExplorer.svelte`.
- Path to 1:1: make Outline a real `ExplorerProvider` (like `explorerTags`) that targets the active file, render it through `viewTree.svelte` (gets virtualization + collapse + keyboard for free), wire click → `workspace` open at `line`, and add the `.outline` native-DOM class path. The plumbing (`tabRegistry` slot, `buildOutlineForFile`) is already half-built.
- Path to 2:1 (Vaultman's natural strength): the builder *already* produces tasks + block refs; surface them with filters/toggles. Add: heading-section DnD reorder (reuse `serviceManualDnd` + a "move lines" queue op), multi-file outline (outline across a selection — unique vs core), outline search, breadcrumb of current scroll position, badges for task completion state.

---

## 4. Parity gap summary (all three plugins)

| Capability | File Explorer | Tags | Outline |
|---|---|---|---|
| Tree + expand/collapse | **Have** | **Have** | Logic Have / **view Missing collapse** |
| Virtualized rendering | **Have** (`viewTree` + TanStack) | **Have** | **Missing** (`viewOutlineExplorer` is static) |
| First-class `ExplorerProvider` | **Have** (`explorerFiles`) | **Have** (`explorerTags`) | **Missing provider** (builder only) — but `explorer-outline` tab slot IS registered (`tabRegistry.ts`) |
| Multi-select / keyboard nav | **Have** (exceeds core) | **Have** (exceeds core) | **Missing** |
| Sorting | **Have** (+count, −created) | **Have** (+sortTarget) | n/a (core: none) |
| Search within pane | partial (toolbar) | **Have** (exceeds core) | **Missing** |
| Context menu vs core | **Partial** (missing ~7 items) | **Have / exceeds** | **Missing** |
| Click → primary core action | Have (open file) | **Partial** (filter vs Search; Search on secondary) | **Missing** (no jump-to-line) |
| Drag-and-drop (core behavior) | **Partial** (reorder infra ≠ filesystem move) | n/a (core: none; VM has `set` hover badge) | **Missing** (no heading reorder) |
| Inline rename | **Partial** (view supports, panel unwired) | **Have** (modal/FnR) | n/a |
| Bulk edit / queue ops | **Have** (exceeds core) | **Have** (exceeds core) | **Missing** |
| Follows active editor leaf | **Partial** (selection-driven, not leaf-driven) | n/a | **Missing** |
| Folder notes | **Missing** | n/a | n/a |
| 1:1 native DOM classes | **Partial** (generic `tree-item*` only, no `nav-*`/`data-path`) | **Missing** (no `tag-pane-tag*`) | **Partial** (no `.outline`/`collapse-icon`) |
| Exceeds core today (2:1-ish) | **Yes** (5 view modes, badges, fields) | **Yes** (rename/merge/delete/bind/filter) | **Partially** (tasks+blocks in builder, but UI minimal) |

**One-line verdict:** Tags is at/above 2:1 functionally (needs visual dial-back work). File Explorer is ~1.5:1 — strong tree/selection/keyboard, but missing real DnD-move, full context menu, folder notes, and native `nav-*` DOM. Outline is below 1:1 — the builder is good and even exceeds core (tasks/blocks), but there is no first-class virtualized, clickable, collapsible, DnD-capable Outline panel.

---

## 5. Explicit unknowns

- **Verbatim Obsidian help text** for all three plugins: `obsidian.md/help/...` is JS-rendered; WebFetch got titles only. Functional lists are corroborated via DeepWiki + community plugins + forums but not quoted verbatim.
- **`musiweb3/obsidian-web` / `MusiCode1/obsidian-web`**: not located/reachable this pass — Obsidian's actual internal class names and exact DOM nesting (esp. `tree-item-flair-outer`, `tag-pane-tag-self`/`-sub`, `data-heading-level`) are [inference] from theme CSS, not confirmed against source.
- **Exact current (May 2026) Obsidian context-menu item set** for file/folder — varies by version + enabled plugins; list above is representative, not version-pinned.
- **Whether `viewTree.svelte` can already be pointed at the Tags or Outline providers** to inherit virtualization — `panelExplorer.svelte` is generic over `ExplorerProvider`, so Tags already uses it; whether an Outline provider would "just work" was not exercised (no such provider exists).
- **`useNativeDom` / `themeService`** full behavior — `serviceTheme.svelte.ts` not read. Confirmed: `ViewNodeTable/Cards/Grid` emit `nav-file*` under `useNativeDom`; `viewTree.svelte` does not. The full native-class contract (does it ever emit `tag-pane-tag` / `.outline` / `nav-folder`?) is unconfirmed — Grep found `tag-pane-tag` only in `serviceNativeSurfaceBinding.ts`, which *consumes* Obsidian's native DOM for hover/binding, it does not *emit* Vaultman rows. So no evidence Vaultman emits `tag-pane-tag` or `.outline` anywhere.
- **`serviceFoulDetection.svelte.ts`** asserts `.nav-file` must exist in the files explorer — suggests there is a code path (theme/native mode) where `viewTree.svelte` *should* emit `nav-file`; the exact trigger/condition was not traced.
- **Grid/Table/Cards parity** for Tags/Outline not assessed — scope was tree-surface parity vs core.
- Core File Explorer **keyboard arrow-key navigation** specifics (left/right collapse, Delete-to-trash) marked [inference] — core's tree keyboard support is known to be thin but exact bindings unverified.

---

## 6. Sources

Web:
- Obsidian Help (via search summaries; pages JS-rendered): File explorer, Tag pane, Outline — `obsidian.md/help/plugins/{file-explorer,tag-pane,outline}`
- DeepWiki — `deepwiki.com/obsidianmd/obsidian-help/4-core-note-taking-features`
- Notebook Navigator — `github.com/johansan/notebook-navigator` (file-explorer feature baseline / comparison)
- Tag Wrangler — `github.com/pjeby/tag-wrangler` (signals where core Tag pane stops)
- Quick Explorer — `github.com/pjeby/quick-explorer`
- obsidian-css-snippets (Dmytro-Shulha) — `github.com/Dmytro-Shulha/obsidian-css-snippets/blob/master/Snippets/File%20explorer%20-%20Obsidian.md` (DOM/class hooks)
- Obsidian forum: "Core plugin - tags / nested-tags - UPDATE"; "Fold headings in document using the Outline core plugin"; "How to apply style to nested sub folders in the file explorer"

Files read (worktree `jovial-wilson-f81c67`):
- `src/components/containers/panelExplorer.svelte`
- `src/components/views/viewTree.svelte`
- `src/components/views/viewOutlineExplorer.svelte`
- `src/providers/explorerFiles.ts`
- `src/providers/explorerTags.ts`
- `src/providers/explorerOutline.ts`
- `src/services/serviceNodeFieldVisibility.ts`
- `src/styles/explorer/_explorer.scss`
- (Glob inventory of `src/components/views/*`, `src/providers/explorer*`, `src/services/serviceExplorer*`, `serviceSelection.svelte.ts`)
