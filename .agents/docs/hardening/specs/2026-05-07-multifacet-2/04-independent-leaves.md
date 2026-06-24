---
title: Independent workspace leaves
type: design-spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-07-multifacet-2/index|multifacet wave 2 spec]]"
created: 2026-05-07T02:30:00
updated: 2026-05-07T02:30:00
tags:
  - agent/spec
  - workspace/layout
created_by: claude
updated_by: claude
---

# Independent Workspace Leaves

## Goal

Each Vaultman tab (explorer-files, explorer-tags, explorer-props,
explorer-values, content, page-tools, queue, etc.) can become its own
Obsidian `WorkspaceLeaf` and re-merge back into the panel.

## State Model

`LeafDetachService` owns:

- `detached: Record<TabId, boolean>` (mirrored to plugin data).
- `detach(tabId)`: register `VIEW_TYPE` if needed, spawn leaf, mount
  the same Svelte tab component there, remove tab from in-panel list.
- `attach(tabId)`: detach the leaf, restore the tab in the panel.
- `restore()`: called on plugin load. For each `detached[tabId] ===
  true`, spawn the leaf.

Each tab declares a unique `VIEW_TYPE` constant and a Svelte component
factory. `LeafDetachService` registers all view types up front during
`onload`; spawning is conditional.

## Persistence

- Plugin data key: `independentLeaves: Record<TabId, boolean>`.
- Detach writes flag = true and calls `saveData()`.
- Attach writes flag = false and calls `saveData()`.
- On `onLayoutReady`, replay each detached tab — but only after
  Obsidian's own workspace replay has finished, so we don't fight
  with it.
- We do **not** read or write `app.workspace.requestSaveLayout()` for
  this. Obsidian's workspace file may still contain stale leaf data
  from a previous session; `restore()` is idempotent and reconciles
  by leaf-type id.

## UI

- Each tab's `view` menu gets a new entry: **detach to leaf** /
  **return to panel**, label flips based on current state.
- Settings page gains a global toggle: **all tabs as independent
  leaves**. Toggle on = call `detach` for every tab. Toggle off =
  call `attach` for every tab.

## Tab Registry

A `tabRegistry.ts` module enumerates which tabs are detachable:

```ts
type TabId = 'explorer-files' | 'explorer-tags' | 'explorer-props'
  | 'explorer-values' | 'content' | 'page-tools' | 'queue';

const DETACHABLE: ReadonlySet<TabId> = new Set([
  'explorer-files', 'explorer-tags', 'explorer-props',
  'explorer-values', 'content', 'page-tools', 'queue'
]);
```

If a tab is not in `DETACHABLE`, its menu does not show the entry.

## Acceptance

- Detaching a tab spawns a new leaf; in-panel slot for that tab is
  hidden.
- Re-attaching closes the leaf; in-panel slot reappears.
- Plugin reload preserves detach state via plugin data, regardless of
  the user's workspace file.
- `LeafDetachService` is the only writer of `independentLeaves`.

## Anti-Goals

- No private API monkey-patching. If detach requires it, stop and
  document.
- No reliance on Obsidian's workspace file for our state.
- No cross-tab state duplication; each leaf renders the same Svelte
  component bound to the same services as the in-panel version.
