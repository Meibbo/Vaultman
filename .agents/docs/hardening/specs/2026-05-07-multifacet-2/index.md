---
title: Multifacet wave 2 spec
type: design-spec-index
status: draft
parent: "[[docs/work/hardening/specs/2026-05-06-node-selection-service/index|node-selection-service]]"
created: 2026-05-07T02:00:00
updated: 2026-05-07T02:00:00
tags:
  - agent/spec
  - initiative/hardening
  - explorer/find-replace
  - explorer/badges
  - explorer/commands
  - workspace/layout
  - explorer/note-binding
created_by: claude
updated_by: claude
---

# Multifacet Wave 2 Spec

> **For agentic workers:** read this index, then the relevant numbered shard
> before editing. Treat captured user requirements verbatim; design proposals
> must preserve them. If a shard is missing, draft it before implementation.

**Goal:** ship five user-driven UX upgrades on top of the verified node
selection / viewgrid foundation: a unified Find & Replace (FnR) toolbar island
with templating variables, hover multiselection badges with collision rules,
quick commands and double-click filter clearing, per-tab independent layouts,
and a "create note for a node" flow with explorer-wide `set` actions.

**Architecture:** keep `NodeSelectionService` as the source of truth for
selected and filtered nodes. Introduce a shared `FnRIslandService` that owns
the toolbar takeover state, parsed template variables, and submit semantics
across all explorers. Replace ad-hoc badge ordering with a fixed primitive
ordered list (`set, rename, convert, delete, filter`) and gate visibility with
`activeOpsByNode`. Register Obsidian `Command` entries for high-frequency
panel actions, and let each `pageTab` declare optional `independentLeaf`
support so Settings can detach/attach tabs. New per-node "binding note" lives
in the vault under a configurable folder with a deterministic `aliases` entry
keyed by node kind.

**Tech Stack:** TypeScript, Svelte 5 runes, existing services (`serviceFnR`,
`serviceQueue`, `serviceViews`, `NodeSelectionService`), `OperationQueueService`,
Obsidian `Command` API, Obsidian `WorkspaceLeaf`, existing SCSS partials,
existing i18n maps, Vitest unit and component tests.

## Items In Scope

| # | Item | Shard |
|---|------|-------|
| 1 | FnR toolbar island unification + template variables | `01-fnr-island-templating.md` |
| 2 | Hover multiselection badges, fixed order, collision rules, ops-log tab | `02-hover-badges-and-ops-log.md` |
| 3 | Quick commands and double-click filter/queue clear | `03-quick-commands.md` |
| 4 | Per-tab independent workspace leaves | `04-independent-leaves.md` |
| 5 | Note-for-node binding + explorer-wide `set` action | `05-note-binding-and-set.md` |

## Captured User Requirements

The following bullets are user-authored requirements. They override design
proposals. Sub-shards must restate them and only refine implementation detail.

### 1. Find & Replace island

- 1.1 FnR moves into the searchbox. The current standalone island disappears.
  Exception: `content` explorer currently shows three inputs (two duplicate
  inputs and one unnecessary one). Reduce `content` to one searchbox plus a
  category toggle that switches between **search** and **replace**.
- 1.1 In rename/replace mode, the searchbox absorbs the legacy rename modal
  logic for templating variables.
- 1.2 When activated, FnR expands into a toolbar-wide island that hides the
  surrounding menus until dismissed.
- 1.3 Variables use `{{name}}` (double brace), not `{name}`. Required tokens:
  - `{{base}}` — the selected node, or the node about to be created. Resolves
    differently when search vs. rename mode is active.
  - `{{filter}}` — the entire filtered set, including data and metadata, used
    as the base file for the operation.
  - `{{date}}` — a single-entry date. Default to `+1` for sequential nodes,
    accept `datejs`-style suffix math (`+`, `-`, `x`, etc.), and accept a
    natural-language parser (`today`, `tomorrow`, `in two hours`).
  - `{{counter}}` — sequential counter pattern (`1, 2, 3 …`).
- 1.4 Add additional variables modeled on Ant Renamer / Advanced Renamer
  categories: filename parts, parent directory, current/created/modified
  date-time, image EXIF, audio ID3, document metadata, file size, checksum.
  Specific token mapping is in shard 01. Add toggles for **match case**,
  **whole word**, and **regex (JS flavor)**.
- 1.5 Move the two toolbar menus to the right side in minimalist style. Free
  space on the right of the searchbox (left of `view` and `sort`) for a new
  button: `lucide-plus` icon, label `crear`. The button reads the current FnR
  searchbox content and queues an `add` (or analogous) op for the active
  explorer's node kind.

### 2. Hover multiselection badges

- 2.1 On node hover, four badges appear inline in the existing badge slot:
  `set`, `rename`, `delete`, `filter` (`convert` is **out**). They render in
  fixed order, with no surrounding box, faint icon-only on hover, normal text
  weight when active. If a node already has a badge for `filter` or for an
  active op of the same kind, that badge slot is occupied and the
  corresponding hover badge is hidden — no double-op on the same node.
- 2.2 Delete-vs-other-op conflict: if `delete` is the active op for a node,
  hide every other hover badge except `filter`. If the user adds `delete`
  while other ops exist, show a confirmation modal that lists the ops to be
  purged for that node and, on confirm, drops them from the queue.
- 2.3 Out of scope: the obsidian-console mirror tab.
- 2.4 In `pageTools`, add a single new tab: **Ops log**. Scope is broader
  than the queue: it must also surface app performance — plugin boot time,
  per-plugin load duration, command response latencies, queue op start /
  commit / undo, and any other timed event the engineer judges useful.
  Includes a clear-log action.

### 3. Quick commands

- 3.1 Double-click on the active-filter pills (navbar) clears all filters.
  Same gesture on the queue badge clears the queue.
- 3.2 Register Obsidian commands:
  - `vaultman:open-filters`
  - `vaultman:open-queue`
  - `vaultman:process-queue`
  - `vaultman:open-view-menu`
  - `vaultman:open-sort-menu`
  - `vaultman:open` (open / focus Vaultman so keyboard navigation lands on the
    active explorer's first node)
  - `vaultman:open-find-replace-active-explorer`
- 3.3 The `open` command must focus the active explorer such that arrow-key
  node navigation works immediately — not the explorer-type selector.

### 4. Layout options

- 4.1 Each tab gains a **detach to leaf** toggle inside its `view` menu. A
  global Settings toggle either detaches all tabs at once or merges them
  back. Detached tabs become independent Obsidian `WorkspaceLeaf` instances.
- 4.2 Layout state persists across Obsidian reloads. Persistence target is
  the plugin's own data store (per-tab `independentLeaf: bool`), not
  Obsidian's workspace file. Detach and re-attach both write to plugin
  data; the plugin replays the layout on next load.

### 5. Note for a node + explorer-wide `set`

- 5.1 Non-file nodes get a `cmenu` action: **create binding note**. The note
  is created with a deterministic `aliases` frontmatter entry keyed by node
  kind:
  - `prop` → `[propname]` (square brackets)
  - `tag` → `#tagname`
  - `folder` → `label==filename`, fallback `/foldername`
  - `value`, `template` → `label==filename`
  - `snippet` → `$snippetname`
  - `plugin` → `%pluginname`
  If a single existing note already carries that alias, the cmenu action
  binds to it. If multiple notes match, route the user to the filter pane
  with a synthetic filter: `aliases has <token>`.
- 5.2 Default location: vault root. Settings exposes a configurable target
  folder.
- 5.3 Add a `set` cmenu entry on every explorer. Semantics per explorer:
  - `tag` explorer → add tag to frontmatter of every filtered file.
  - `prop` explorer → open FnR pre-filled with `{{prop}}: ` so the user
    types the value as if it were source code; submission writes that
    `prop: value` line into every filtered file.
  - `value` explorer → add `prop=value` to every filtered file.
  - `file` explorer → "add link": append wikilinks to selected files at the
    end of every filtered file's body.
- 5.4 `pageTools` gains two node-note-oriented tabs:
  - `tabSnippets`: explorer over CSS files in `.obsidian/snippets/`.
    The row count slot is replaced by an enable/disable toggle for that
    snippet. Binding notes use `aliases: ["$snippetname"]`.
  - `tabPlugins`: explorer over installed community plugins from Obsidian's
    plugin manifests. Binding notes use `aliases: ["%pluginname"]`. Plugin
    enable/disable controls are allowed only as explicit guarded actions
    because they mutate Obsidian plugin state.

## Out Of Scope

- Replacing TanStack virtualizer.
- Inline grid expansion (still gated, separate plan).
- Obsidian-console mirror tab (item 2.3 dropped by user).
- Migrating any AI files to `main`.

## Stop Conditions

- Stop if any FnR variable can write outside the vault or evaluate arbitrary
  code. Re-scope before continuing.
- Stop if `independentLeaf` cannot persist via Obsidian's workspace API
  without monkey-patching private fields. Document and propose an
  alternative.
- Stop if `set` semantics on the `prop` explorer cannot route through FnR
  without bypassing `OperationQueueService`. Queue-first is mandatory.
- Stop if a `delete`-conflict purge would silently drop ops the user did not
  see. Confirmation is mandatory.

## Source Links

- [[docs/current/status|current status]]
- [[docs/current/handoff|current handoff]]
- [[docs/current/engineering-context|engineering context]]
- [[docs/work/hardening/plans/2026-05-07-multifacet-2/index|implementation plan]]
- [[docs/work/hardening/specs/2026-05-06-node-selection-service/index|node selection service spec (parent)]]
- [[docs/work/hardening/plans/2026-05-07-node-expansion-keyboard-grid/index|previous multifacet plan]]
