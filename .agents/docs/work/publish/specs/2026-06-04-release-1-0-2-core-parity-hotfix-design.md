---
title: Release 1.0.2 core parity hotfix design
type: spec
status: accepted
parent: "[[docs/work/publish/index|Publish]]"
created: 2026-06-04T00:00:00
updated: 2026-06-04T00:00:00
tags:
  - agent/spec
  - initiative/publish
  - release/1-0-2
  - ux
  - core-parity
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Release 1.0.2 Core Parity Hotfix Design

## Status

Accepted by the maintainer on 2026-06-04 after choosing the core-parity acotado approach for the stable `1.0.2` hotfix.

Implementation is governed by [[docs/work/publish/plans/2026-06-04-release-1-0-2-core-parity-hotfix/index|Release 1.0.2 core parity hotfix implementation plan]].

## Problem

The current stable hotfix candidate has release-gate improvements, but several visible controls still violate the stable-channel rule that shipped UI should not contain inert or misleading behavior:

- Tags and Files actions can bypass the operation queue even though the queue is the product's visible safety model.
- File search finds files/folders but does not expand the tree enough to reveal matches.
- Content preview uses custom markup instead of Obsidian core Search result classes and waits too long before giving feedback.
- Property type identification is still partly inferred instead of reading Obsidian's property type manager where available.
- Statistics cards are only partially reactive and word count is a placeholder.
- Minimal style is visually inconsistent with Obsidian core controls and does not react live everywhere.
- The props tab icon was requested as `lucide-archive`, but the archive icon was put on the filters page instead.

## Obsidian Runtime Evidence

Live `plugin-dev` inspection with `obsidian-cli` confirmed:

- Core File Explorer toolbar buttons are `.clickable-icon.nav-action-button` with labels `New note`, `New folder`, `Change sort order`, `Auto-reveal current file`, and `Collapse all` / `Expand all`.
- Core Search results use `.search-result-container.mod-global-search.node-insert-event`, `.search-results-children`, `.tree-item.search-result`, `.search-result-file-title`, `.tree-item-flair`, `.search-result-file-match`, and `.search-result-file-matched-text`.
- Core property type data is available through `app.metadataTypeManager`, including `getWidget`, `getTypeInfo`, `getPropertyInfo`, `setType`, and `unsetType`.

## Selected Approach

Implement a stable, acotado core-parity pass. Do not import sandbox/Vite UI and do not refactor the explorer architecture. Patch the current stable components where the behavior is visibly wrong, using Obsidian core DOM classes and runtime APIs as the authority.

## Design Units

### Queue Stage/Bypass

`OperationQueueService` owns a small runtime mode: `stage` by default and `bypass` when explicitly selected from the queue island while the queue is empty. The toggle must not appear with pending queue entries, because changing mode with staged operations would be ambiguous.

Tags and Files actions must consult this mode. In `stage`, rename/delete/move style operations add a `PendingChange`; in `bypass`, they execute immediately.

### Files Explorer Search Reveal

`FilesExplorerPanel.setSearchFilter()` filters the visible files, then expands all ancestor folder ids for matching files. Folder search uses the matched folder term and expands ancestors for files inside matching folder paths. The stable tree keeps folders before files.

### Native Context Menu Parity

`ContextMenuService.openPanelMenu()` keeps Vaultman actions but, for real file or folder nodes, first asks Obsidian workspace menu listeners to populate the menu through the native `file-menu` event. Vaultman actions are appended after a separator. Folder nodes must carry enough metadata to resolve the `TFolder`.

### Explorer Header Controls

The searchbox contains a create button to the right of the category toggle. The button is present for props, tags, and files. In files mode it creates a note or folder based on the category toggle. In props/tags mode it enables the existing add/stage flow rather than adding a fake placeholder.

Minimal sort/view controls use native-like `clickable-icon nav-action-button` classes and avoid hardcoded pill styling that diverges from Obsidian.

### Content Preview

The Content tab renders preview results with core Search classes and updates incrementally while scanning. It keeps a loading state by toggling `is-loading` on the core search result container.

### Property Types

`PropsExplorerPanel` resolves property types through `metadataTypeManager` when available, then falls back to existing metadata. Type labels normalize `toggle -> checkbox`, `numeric -> number`, and `multitext -> list`. Icons remain:
tags, list, text, number, date, checkbox, aliases, cssclasses, unknown.

Changing property type should call native `metadataTypeManager.setType()` when available and stage a queue marker for visible feedback. The queue marker must not pretend to convert file contents when the type manager call is the actual source of truth.

### Statistics Reactivity

`pageStatistics.svelte` listens to filter, queue, metadata, vault modify/create, delete, and rename events. Counts and word count recompute when the selected scope changes or the relevant service events fire. Word count reads markdown files in chunks and cancels stale runs.

### Minimal Dock

When `minimalStyle` is active, the dock uses a solid Obsidian background and its side actions use `clickable-icon nav-action-button`. It does not mix `nav-icon` with action buttons, and locked actions keep a single lock overlay.

### Icon Correction

`VaultmanFrame` page filter icon returns to `lucide-filter`. `navbarTabs` assigns `lucide-archive` to `props`.

## Acceptance Criteria

- Tags and Files destructive/mutation actions stage by default and bypass only when the empty-queue toggle is set to bypass.
- File/folder search expands visible ancestors to show matches.
- File/folder context menus include native Obsidian file-menu actions where the native menu event can populate them.
- Content preview uses Obsidian core Search classes and streams result updates.
- Property type icons and filters use Obsidian type-manager data when present.
- Statistics files, links, and word count update without plugin reload.
- Minimal style updates live after settings changes.
- Minimal dock is solid and uses `clickable-icon nav-action-button` actions.
- `lucide-archive` is on the props tab, not the Filters page.
- Verification includes `pnpm run verify`, Svelte autofix/check on edited components, build sync to `plugin-dev`, plugin reload, DOM smoke, and `obsidian vault=plugin-dev dev:errors`.

## Non-Goals

- Do not migrate stable to Vite/Vite+.
- Do not import sandbox canary UI wholesale.
- Do not create or publish the `1.0.2` release.
- Do not add AI workflow files to the stable hotfix worktree.

## Spec Self-Review

- Placeholder scan: no placeholder-only requirements remain.
- Consistency check: the spec keeps the stable codebase and avoids canary migration while still using Obsidian core DOM/API as reference.
- Scope check: this is one UX/core-parity hotfix pass for `1.0.2`.
- Ambiguity check: bypass is allowed only when queue is empty; native file-menu parity is attempted for real `TFile`/`TFolder` nodes only.
