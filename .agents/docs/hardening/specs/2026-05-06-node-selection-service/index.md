---
title: Node selection service and viewgrid spec
type: spec-index
status: draft
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-06T07:05:00
updated: 2026-05-06T07:05:00
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
  - explorer/selection
  - ui/interaction
glossary_candidates:
  - node selection service
  - active node
  - selected node
  - primary node action
  - viewgrid
---

# Node Selection Service And Viewgrid Spec

This spec turns the current explorer selection regression into an explicit
architecture slice. The selection box should become one input method for the
same node selection model used by keyboard navigation, single-node selection,
context menus, and future grid tiles. It must not replace node activation,
expand/collapse, hover affordances, or provider-specific actions.

## Decision Summary

- Create a dedicated node selection service rather than keeping selection state
  split between `panelExplorer.svelte`, `viewTree.svelte`, `viewGrid.svelte`,
  `logicKeyboard.ts`, and partial mirroring into `ViewService`.
- Keep focus, hover/active node, active filter, and selected node visually and
  semantically distinct.
- Treat the selection rectangle as an adapter to the service. It contributes
  target ids; it does not own selection policy.
- Restore direct node interactions: chevron toggles expansion, label/action
  affordances trigger provider actions, and row-slot clicks select.
- Add document-level clear semantics: click outside the active explorer clears
  node selection; `Escape` clears selection unless a nested editor/action has
  consumed the key first.
- Make row/tile hit targets fill their virtual slots so visual spacing never
  creates dead zones.
- Rebuild `viewGrid.svelte` as a generic node/tile view that uses the same
  selection service and action semantics as the tree. The implementation may
  land first as `ViewNodeGrid.svelte` if that protects current file workflows
  while the old file-specific grid is renamed or retired.
- Use TDD and split implementation into subagent-friendly phases.

## Shards

1. [[docs/work/hardening/specs/2026-05-06-node-selection-service/01-context-and-evidence|Context and evidence]]
2. [[docs/work/hardening/specs/2026-05-06-node-selection-service/02-interaction-model|Interaction model]]
3. [[docs/work/hardening/specs/2026-05-06-node-selection-service/03-service-architecture|Service architecture]]
4. [[docs/work/hardening/specs/2026-05-06-node-selection-service/04-view-adapters-and-hit-targets|View adapters and hit targets]]
5. [[docs/work/hardening/specs/2026-05-06-node-selection-service/05-context-menu-and-actions|Context menu and actions]]
6. [[docs/work/hardening/specs/2026-05-06-node-selection-service/06-testing-and-exit-criteria|Testing and exit criteria]]

## Recommended Approach

Use a service-first refactor with narrow adapters.

The current pure helpers in `logicKeyboard.ts` are useful, but they are not a
deep module by themselves. Callers still manage anchors, focus ids, clearing,
provider sync, and box semantics manually. A `NodeSelectionService` should own
that state per explorer id and expose a small command interface:

- `selectPointer(explorerId, orderedIds, targetId, modifiers)`
- `selectBox(explorerId, orderedIds, targetIds, modifiers)`
- `moveFocus(explorerId, orderedIds, direction, modifiers)`
- `toggleFocused(explorerId, orderedIds)`
- `setActive(explorerId, id | null, source)`
- `clear(explorerId)`
- `snapshot(explorerId)`

Tree and grid views remain rendering adapters. `panelExplorer.svelte` remains
the coordinator between provider actions and view adapters until the broader
view-service migration is ready.

Read-only exploration confirmed the key source split:

- tree mode is node-oriented through `provider.getTree()` and `TreeNode`;
- current grid mode is file-oriented through `TFile[]`, `selectedFiles`,
  `file.path`, hardcoded file columns, and direct `app.metadataCache` reads;
- `logicKeyboard.ts` is generic enough to reuse, but not deep enough as the
  state owner;
- `panelExplorer.svelte` currently splits selection into node selection for tree
  and selected-file state for grid, which is the exact split this spec removes.

## Alternatives Considered

### Approach A: Patch `viewTree.svelte` inline

Fix the current bugs by adding `Escape`, outside click, more stopPropagation,
and wider row CSS.

Tradeoff: quickest local patch, but it leaves selection rules duplicated across
tree and grid and keeps the selection box as a special case.

### Approach B: Extend `logicKeyboard.ts` only

Add more pure functions for clear, active row, and box behavior while keeping
state in components.

Tradeoff: better testability than Approach A, but callers still need to
remember ordering, anchor, focus, provider sync, and clear rules. The interface
remains nearly as complex as the implementation.

### Approach C: Dedicated selection service with tree/grid adapters

Promote selection to a service with per-explorer state and command methods.
Views emit user intent; the service decides selected ids, anchor, focus, and
active node. This is the recommended path.

Tradeoff: slightly larger first slice, but it gives locality and leverage
because tree, grid, context menu, and future cards/list views share one
behavioral model.

## Source Records

- [[docs/current/status|current status]]
- [[docs/current/handoff|current handoff]]
- [[docs/current/engineering-context|engineering context]]
- [[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|Explorer view service spec]]
- [[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/index|User-facing recovery wave A]]
- WAI-ARIA APG Tree View Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
- WAI-ARIA APG Grid Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
- MDN `aria-multiselectable`: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-multiselectable
- Apple Human Interface Guidelines, Materials and Liquid Glass:
  https://developer.apple.com/design/human-interface-guidelines/materials
  and https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass

## Non-Goals

- Do not build `viewTable.svelte` in this slice.
- Do not base the new grid on the current file-table semantics.
- Do not migrate all explorer render models to `ViewService` in one pass.
- Do not add drag-and-drop, cell editing, or table cell range selection.
- Do not make hover alone mutate filters, files, tags, properties, or queue
  state. Hover may reveal controls; click/keyboard activation performs actions.
