---
title: Context menu and actions
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-06-node-selection-service/index|node-selection-service]]"
created: 2026-05-06T07:05:00
updated: 2026-05-06T07:05:00
tags:
  - agent/spec
  - explorer/actions
  - ui/context-menu
---

# Context Menu And Actions

## Action Channels

Vaultman needs three action channels:

1. **Primary direct action**
   - Triggered by label/action-zone click or Enter.
   - Used for common single-node behavior.
   - Must be fast and discoverable.

2. **Selection-aware context menu**
   - Triggered by right click or context menu key.
   - Uses selected nodes when the target is already selected.
   - Replaces selection with target when right-clicking an unselected node.
   - Hosts batch and destructive actions.

3. **Mode-aware quick actions**
   - Hover/focus badges or toolbar controls.
   - Used for add mode, quick queue actions, and future operation shortcuts.
   - Must never trigger row selection or provider activation accidentally.

## Required Context Menu Coverage

Not every node type has every action. The menu should expose only valid actions
for each node type and selected set.

Files:

- rename selected files through FnR handoff;
- delete selected files through queue;
- move selected files when supported;
- open focused/target file as a direct action, not necessarily as a batch
  context-menu action;
- send selected files to selected-files filter when appropriate.

Tags:

- rename tag through FnR handoff;
- delete selected tags through queue;
- add tag in add mode;
- toggle tag filter as primary action;
- batch delete selected tags.

Properties:

- rename property through FnR handoff;
- delete selected properties through queue;
- change selected property types;
- add property in add mode;
- toggle property filter as primary action;
- batch delete selected properties.

Values:

- rename value through FnR handoff;
- delete selected values through queue;
- toggle value filter as primary action;
- batch delete selected values when selected values share valid context.

## Sending Selection To Filters

The selection service should not know filter semantics. Providers should expose
selection-aware actions that can consume `selectedNodes`.

Potential action names:

- `filters.apply-selected-files`;
- `filters.apply-selected-tags`;
- `filters.apply-selected-props`;
- `filters.apply-selected-values`;
- `queue.delete-selected`;
- `fnr.rename-selected`.

These can appear in context menus first. A later toolbar or add-mode toggle can
promote the most common ones.

## Add Mode

Add mode should stay a mode, but it should not be the only way to add selected
nodes.

Recommended behavior:

- when add mode is active, direct label/quick-action add still queues the add
  operation;
- context menu should include add actions for selected compatible nodes;
- quick-action badges must stop propagation and not alter selection;
- selected set can be used to queue batch add operations when the node type
  supports it.

## Provider Contract

Avoid making `panelExplorer.svelte` understand all domain actions. Providers
already know node meta and queue/filter/FnR services. Keep the domain behavior
there.

The provider contract can grow a focused method later if needed:

```ts
handleNodePrimaryAction?(node: TreeNode<TMeta>, selectedNodes: TreeNode<TMeta>[]): void;
handleNodeSelectionAction?(nodes: TreeNode<TMeta>[], actionId: string): void;
```

For the first slice, prefer using the existing `handleNodeClick`,
`handleNodeSelection`, and `handleContextMenu` methods unless tests show the
name collision is causing ambiguity.
