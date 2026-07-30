---
title: Detachable layout workspace tabs
type: spec
status: draft
parent: "[[docs/work/polish/index|polish]]"
created: 2026-05-11T00:00:00
updated: 2026-05-11T00:00:00
tags:
  - agent/spec
  - initiative/polish
  - workspace/layout
  - dock
  - dnd
created_by: codex
updated_by: codex
glossary_candidates:
  - detachable workspace tabs
  - dock workspace persistence
  - Vaultman tab leaf
---

# Detachable Layout Workspace Tabs

## Intent

Vaultman's existing detachable-tab setting exists but does not behave like a real detached tab system. `serviceLeafDetach` persists detach flags and spawns Obsidian leaves, but `VaultmanTabLeafView` currently renders only a placeholder instead of the selected tab's actual toolbar and content. The global toggle also lives in Settings even though the feature is a layout/workspace behavior.

The approved direction is to make detachable tabs a `pageTools` Layout feature, develop the behavior through `serviceLayout`, and connect dock/workspace drag events through the semantic `serviceDnd` path. Detached tabs should feel normal:
each detached tab shows only its own relevant toolbar plus tab content, without the rest of the frame shell.

## Research Notes

Use public Obsidian workspace APIs before touching private DOM. The current developer docs describe the workspace as a tree of parent items and leaf items, with plugin leaves added through `workspace.getLeaf(true)`, `getLeftLeaf()`, `getRightLeaf()`, or `createLeafInParent()`, and removed by `WorkspaceLeaf.detach()` or `workspace.detachLeavesOfType()`:
https://marcusolsson.github.io/obsidian-plugin-docs/user-interface/workspace

The TypeScript API reference exposes `Workspace.onLayoutReady`, `getLeavesOfType`, `revealLeaf`, `openPopoutLeaf`, `setActiveLeaf`, `createLeafInParent`, and `detachLeavesOfType`:
https://obsidian-developer-docs.pages.dev/Reference/TypeScript-API/Workspace/

The custom-view guide warns not to store long-lived view references in plugin properties because Obsidian can call a view factory multiple times. Access view instances through workspace leaf queries instead:
https://marcusolsson.github.io/obsidian-plugin-docs/user-interface/views

Obsidian 1.7.2+ defers background views. When code needs to interact with a custom view, reveal the leaf first or carefully call `loadIfDeferred()`; always check `leaf.view instanceof CustomView` before assuming the view type:
https://docs.obsidian.md/plugins/guides/defer-views

Conclusion: the first implementation should remain API-first. Generalizing this to arbitrary Obsidian tabs is a future phase unless it can be expressed through public `WorkspaceLeaf` state. DOM interception of native tab chrome is allowed only behind a researched adapter boundary and must fail closed.

## Approved Scope

First implementation:

- Move the global detachable toggle from Settings into `pageTools` Layout.
- Keep `serviceLeafDetach` as the low-level persistence and Obsidian leaf executor.
- Extend `serviceLayout` into the orchestration facade for detachable layout actions, including dock/workspace drag outcomes.
- Add semantic DnD operations for moving a Vaultman tab between dock/top-tab surfaces and the Obsidian workspace.
- Render real detached content for supported Vaultman tabs instead of the current placeholder.
- Hide or disable a tab's in-frame slot when that tab is detached, so there is not a confusing duplicate primary surface.
- Keep detached leaves focused: their shell renders the tab's toolbar and tab content, not the full Vaultman frame navigation.

Future-facing design:

- Model a general "workspace tab source" vocabulary so the dock can later act as a persistent workspace tool, not only a Vaultman frame accessory.
- Support arbitrary Obsidian tabs only after a source audit proves the target can be controlled through stable workspace APIs or a narrow DOM adapter.
- Consider a dock setting that persists as an Obsidian workspace tool/window, independent of whether the full Vaultman frame is open.

## Architecture

### `serviceLayout`

`serviceLayout` remains the owner of normalized dock/tabs placement settings, but gains pure helpers and a small orchestration interface for detachable layout:

- classify a tab drag source as `vaultman-tab`, `workspace-tab`, or unsupported;
- classify a drop target as `dock`, `top-tabs`, `workspace`, or unsupported;
- convert source/target pairs into layout actions:
  - `detach-tab` for dock/top-tabs to workspace;
  - `attach-tab` for workspace leaf to dock/top-tabs;
  - `move-tab-surface` for dock to top-tabs or top-tabs to dock;
  - `reorder` when source and target are the same surface;
- expose a facade that calls `LeafDetachService` for supported detach/attach actions, while returning a rejected result for unsupported arbitrary tabs.

The service should not query DOM. Any future DOM work belongs in a separate adapter with tests that prove it fails closed when selectors change.

### `serviceLeafDetach`

`serviceLeafDetach` keeps its current responsibility:

- load and sanitize `independentLeaves`;
- persist detach flags without losing sibling plugin data;
- call host `spawnLeaf(tabId)` and `closeLeaf(tabId)`;
- restore persisted leaves after `app.workspace.onLayoutReady`.

The main change is consumer direction: `pageTools`, frame navigation, and DnD should call detachable behavior through `serviceLayout`, not directly through ad-hoc UI code.

### Detached Leaf Views

`VaultmanTabLeafView` must become a real host shell:

- receive `plugin` and `tabId`;
- mount the component for that tab;
- render a compact toolbar only when that tab normally has one;
- avoid full-frame page navigation, dock, page viewport, islands, or unrelated tabs;
- unmount Svelte on close.

Supported first-slice tab mapping:

- `page-tools`: render `pageTools.svelte`, with its own internal tool tabs.
- `explorer-files`, `explorer-tags`, `explorer-props`, `explorer-values`, and `content`: render the relevant explorer tab through a focused shell that owns its toolbar/menu state.
- `queue`: render the queue explorer shell.

If a supported tab cannot be rendered safely in this slice, it must show a clear disabled state and keep the detach action unavailable. Placeholder "independent leaf" content is not acceptable for enabled tabs.

### Frame And Dock Behavior

The frame computes detached tabs from the layout facade and passes them as disabled/faint/externally-mounted ids to dock/top tabs. Detached tabs should be discoverable in the dock, but selecting one reveals its workspace leaf instead of mounting a duplicate in the frame.

When the dock contains filter tabs and a filter tab is detached:

- the dock item stays visible unless the user hides it via future settings;
- the item appears externally mounted;
- clicking it reveals the leaf;
- dragging the leaf back to the dock calls `attach-tab`.

When top tabs contain frame pages and a page is detached:

- the frame page slot should not double-render the page content;
- selecting the tab should reveal the detached workspace leaf.

### DnD Contract

`serviceDnd` should gain layout-aware operations without making UI components know about Obsidian:

- subject kind: keep existing `tab`, and allow `workspace-tab` only if needed;
- operation: add `detach-tab`, `attach-tab`, and `move-tab-surface`;
- target data: include `surface: 'dock' | 'top-tabs' | 'workspace'`;
- result handling: frame code delegates to `serviceLayout`.

The Svelte adapter remains thin. It should map `@dnd-kit/svelte` events to semantic `DndService` calls, not embed layout decisions.

## PageTools Layout UI

`pageTools > layout` becomes the primary control surface:

- show the global "all tabs as independent leaves" toggle;
- show a list of detachable Vaultman tabs with status;
- provide attach/detach controls per tab;
- expose future dock persistence settings in the same area, but disabled until implemented;
- show unsupported arbitrary workspace-tab controls only as future capability, not as working UI.

`SettingsUI` should no longer render `SettingsLeafToggle`. General placement settings can remain in Settings for now, but detachable behavior belongs in the Layout tool surface.

## Testing Requirements

Use TDD. Required coverage:

- unit tests for `serviceLayout` action resolution:
  - dock/top tab to workspace resolves `detach-tab`;
  - workspace to dock resolves `attach-tab`;
  - same-surface tab drop resolves `reorder`;
  - unsupported arbitrary tab drops reject cleanly.
- unit tests for `serviceLeafDetach` continue passing.
- unit tests for `serviceDnd` cover new layout operations and rejection cases.
- component tests for `pageTools` Layout controls replacing Settings toggle.
- component tests for dock/top tab externally-mounted state and reveal behavior.
- component tests or integration smoke proving `VaultmanTabLeafView` mounts real content for at least `page-tools` and one explorer tab.
- Svelte autofixer on edited `.svelte` files.
- `pnpm run check` after focused tests.

## Non-Goals

- Do not monkey-patch Obsidian workspace internals in the first slice.
- Do not attempt arbitrary native/third-party workspace tab capture in the first implementation.
- Do not move AI workflow files to `main`.
- Do not remove `serviceLeafDetach`; it is useful as the low-level executor.
- Do not keep enabled detached leaves as placeholders.

## Open Follow-Ups

- Research arbitrary workspace tabs as a second spec: identify public API paths, inspect popular plugins that manage workspace leaves, and decide whether a DOM adapter is acceptable.
- Research persistent standalone dock as a workspace tool: custom `ItemView`, popout leaf, or side leaf, with settings for startup behavior.
- Decide whether detached filter tabs should disappear from the frame surface or remain as reveal-only launchers after early UX testing.
