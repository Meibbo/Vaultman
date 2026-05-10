---
title: Multifacet wave 2 implementation plan
type: implementation-plan-index
status: draft
parent: "[[docs/work/hardening/specs/2026-05-07-multifacet-2/index|multifacet wave 2 spec]]"
created: 2026-05-07T02:00:00
updated: 2026-05-07T02:00:00
tags:
  - agent/plan
  - initiative/hardening
  - explorer/find-replace
  - explorer/badges
  - explorer/commands
  - workspace/layout
  - explorer/note-binding
created_by: claude
updated_by: claude
---


# Multifacet Wave 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL — use test-driven-development
> for every behavior change. Use subagent-driven-development or
> executing-plans to implement this plan task-by-task. Steps use checkbox
> syntax inside each shard for tracking. Open the matching spec shard before
> starting any phase.

**Goal:** translate the multifacet-2 spec into vertical phases that ship
incremental user value while keeping `NodeSelectionService`,
`OperationQueueService`, and `serviceFnR` as the single sources of truth.

**Architecture:** keep `ViewTree` and `ViewNodeGrid` as intent-reporting view
adapters. Promote FnR state, badge primitives, command registry, leaf
detachment, and binding-note routing into typed services. Introduce
`FnRIslandService`, `BadgeRegistry`, `LeafDetachService`, and
`NodeBindingService`. Wire each through the existing panel container without
touching virtualization assumptions.

**Tech Stack:** TypeScript, Svelte 5 runes, `SvelteSet`, TanStack virtualizer,
existing services (`serviceFnR`, `serviceQueue`, `serviceViews`,
`serviceFilter`), `OperationQueueService`, Obsidian `Command` API,
Obsidian `WorkspaceLeaf`, existing SCSS partials, existing i18n maps,
Vitest unit and component tests.

## Phase Order

1. [[docs/work/hardening/plans/2026-05-07-multifacet-2/01-fnr-island-island|FnR toolbar island and `crear` button]]
2. [[docs/work/hardening/plans/2026-05-07-multifacet-2/02-fnr-templating|FnR templating variables and modifiers]]
3. [[docs/work/hardening/plans/2026-05-07-multifacet-2/03-hover-badges-primitive|Hover multiselection badges primitive]]
4. [[docs/work/hardening/plans/2026-05-07-multifacet-2/04-delete-conflict-and-ops-log|Delete-conflict modal and ops-log tab]]
5. [[docs/work/hardening/plans/2026-05-07-multifacet-2/05-quick-commands-and-double-click|Quick commands and double-click clear]]
6. [[docs/work/hardening/plans/2026-05-07-multifacet-2/06-independent-leaves|Independent workspace leaves]]
7. [[docs/work/hardening/plans/2026-05-07-multifacet-2/07-binding-notes-and-set|Binding notes + explorer-wide `set`]]
8. [[docs/work/hardening/plans/2026-05-07-multifacet-2/08-settings-styles-verification|Settings, styles, docs, and verification]]

## Recommended Cuts

Ship in three vertical cuts so each lands user-visible value before the next
starts:

1. **Toolbar cut:** phases 1 + 2. FnR island, `crear` button, double-brace
   templating, `match case` / `whole word` / `regex` toggles.
2. **Selection-actions cut:** phases 3 + 4 + 5. Hover badge primitive,
   delete-conflict purge, ops-log tab, quick commands, double-click clear.
3. **Layout-and-binding cut:** phases 6 + 7 + 8. Independent leaves, binding
   notes, explorer-wide `set`, then settings/styles/verification.

## Phase Summaries

Each summary captures what the corresponding shard must expand. Shards remain
to be drafted before implementation; phase 8 is the global verification.

### 1. FnR toolbar island and `crear` button

- Replace standalone FnR island with a searchbox-based island. Reduce
  `content` explorer inputs from three to one searchbox + category toggle.
- Add `FnRIslandService` (Svelte rune service) owning: active explorer,
  mode (`search` / `rename` / `replace` / `add`), input string, modifier
  flags, and submit handler.
- When active, expand island to cover the toolbar; hide menus behind it.
- Move existing toolbar menus to right side in minimalist mode and add the
  `crear` button (lucide-plus) left of `view` and `sort`. The button submits
  the searchbox text as an `add` op for the active explorer's node kind via
  `OperationQueueService`.
- Tests: unit `serviceFnRIsland`, component `searchboxIsland`,
  `panelExplorerCrear`.

### 2. FnR templating variables and modifiers

- Implement double-brace tokenizer with strict allowlist:
  `{{base}}`, `{{filter}}`, `{{date[:expr]}}`, `{{counter[:pad]}}`, plus
  category tokens (filename parts, parent dir, current/created/modified
  date-time, EXIF, ID3, document, filesize, checksum). Token taxonomy
  modeled on Advanced Renamer categories — full mapping in shard 02.
- `{{date}}` accepts `datejs`-style suffix math and natural-language input
  via a tiny parser (`today`, `tomorrow`, `in two hours`).
- Add `match case`, `whole word`, `regex (JS)` toggles to island.
- Reject unknown tokens with inline error and keep submit disabled until
  resolved. No arbitrary code evaluation.
- Tests: unit `serviceFnRTemplate`, `serviceFnRDateParser`,
  `serviceFnRTokenAllowlist`.

### 3. Hover multiselection badges primitive

- Replace ad-hoc badge ordering with `BadgeRegistry`: fixed order
  `set, rename, convert, delete, filter`, where `convert` is omitted from
  hover render.
- Render hover badges only when no badge of the same kind already exists for
  the node (no duplicate ops on the same node).
- Visual: icon-only faint on hover, normal text weight when active. Drop the
  surrounding box style across explorers.
- Tests: component `viewTreeHoverBadges`, `viewGridHoverBadges`,
  `panelExplorerBadgeCollision`.

### 4. Delete-conflict modal and ops-log tab

- When `delete` is active for a node, hide all hover badges except `filter`.
- When `delete` is queued for a node that already has other ops, show a
  confirmation modal listing the ops to be purged. On confirm, drop the
  conflicting ops from the queue via `OperationQueueService`.
- Add `pageTools` tab **Ops log**: chronological event log covering both
  queue activity (`OperationQueueService` start / commit / undo) and app
  performance metrics — plugin boot duration, per-plugin load time
  (sampled from `app.plugins.plugins[*]` load completion), Vaultman
  command response latency, and notable Vaultman service timings (filter
  eval, FnR submit, leaf detach). Add a `PerfMeter` helper that wraps
  timed sections via `performance.now()` and emits log records.
  Implement bounded retention (ring buffer, default 1000 records,
  configurable in settings) plus a clear-log action that purges only the
  log, never the queue.
- Tests: component `pageToolsOpsLog`, unit `serviceQueueDeletePurge`,
  component `panelExplorerDeleteConflict`.

### 5. Quick commands and double-click clear

- Double-click on navbar active-filter pills clears all filters via
  `serviceFilter.clear()`. Double-click on the queue badge clears the queue
  via `OperationQueueService.clear()`.
- Register Obsidian commands listed in spec §3.2. `vaultman:open` focuses
  the active explorer's first focusable node so arrow keys work
  immediately.
- Tests: unit `serviceCommandsRegistration`, component
  `navbarPillDoubleClickClear`, component `navbarQueueDoubleClickClear`,
  smoke `obsidianCommandsSmoke`.

### 6. Independent workspace leaves

- Add `LeafDetachService` that, per tab, can detach the tab to a new
  Obsidian `WorkspaceLeaf` and re-attach it back inside the plugin panel.
- Each tab's `view` menu gains a **detach to leaf** toggle bound to the
  service.
- Settings gains a global toggle: **all tabs as independent leaves**, which
  detaches every detachable tab at once or merges them back.
- Persist state in plugin data (`loadData` / `saveData`) as a per-tab
  `independentLeaf: bool` map. On plugin load, replay each detach by
  spawning the matching `WorkspaceLeaf`; on re-attach, write the flag back
  to plugin data. Do not depend on Obsidian's workspace file.
- Tests: component `tabViewMenuDetach`, settings `settingsLeafToggle`,
  smoke `obsidianLeafPersistence`.

### 7. Binding notes and explorer-wide `set`

- `NodeBindingService` creates or binds a note for a non-file node.
  Frontmatter `aliases` entry depends on node kind:
  - `prop` → `[propname]`
  - `tag` → `#tagname`
  - `folder` → `label==filename`, fallback `/foldername`
  - `value`, `template` → `label==filename`
  - `snippet` → `$snippetname`
  - `plugin` → `%pluginname`
- If exactly one note already carries the alias, bind to it. If multiple,
  route to the filter pane with synthetic `aliases has <token>` filter.
- Default note location: vault root. Setting exposes a configurable folder.
- Add `pageTools` tabs for snippets and plugins:
  - `tabSnippets` lists CSS snippets from `.obsidian/snippets/` and renders
    an enable/disable toggle where the numeric counter would normally sit.
  - `tabPlugins` lists community plugins from Obsidian plugin manifests and
    can create/open binding notes. Any plugin enable/disable control must be
    explicit and guarded.
- `set` cmenu action on every explorer:
  - `tag` → add tag to frontmatter of all filtered files (queue
    `NATIVE_ADD_TAG` ops).
  - `prop` → open FnR with `{{prop}}: ` template; submit writes a property
    line into all filtered files.
  - `value` → queue `prop=value` insertion across filtered files.
  - `file` → "add link": queue wikilink append at body end of all filtered
    files.
- Tests: unit `serviceNodeBinding`, unit `serviceFnRPropSet`, component
  `cmenuSetAction`, component `cmenuCreateBindingNote`.

### 8. Settings, styles, docs, and verification

- Add settings entries: binding-note folder, leaf detach defaults, ops-log
  retention, FnR regex flag default.
- Update SCSS partials: `_searchbox.scss`, `_toolbar.scss`,
  `_badges.scss`, `_pageTools.scss`. Regenerate `styles.css` via
  `pnpm run build`.

Continua en [[docs/work/hardening/plans/2026-05-07-multifacet-2/index-shard-1|continuacion 1]].