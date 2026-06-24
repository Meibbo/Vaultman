---
title: Context and evidence
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-06-node-selection-service/index|node-selection-service]]"
created: 2026-05-06T07:05:00
updated: 2026-05-06T07:05:00
tags:
  - agent/spec
  - explorer/selection
---

# Context And Evidence

## User-Visible Regression

The selection box currently works, but it behaves like a replacement for normal
node interaction instead of an additional selection input.

Reported failures:

- expand/collapse via node chevron no longer reliably works;
- direct label interaction no longer reliably opens file nodes or triggers
  provider-specific actions for props, values, and tags;
- selecting one node without modifier keys should clear the prior selection,
  but should not erase the concept of keyboard focus or hover active node;
- clicking outside the explorer and pressing `Escape` should clear all current
  selected nodes;
- active/focused/hovered node styling should be faint and separate from
  selected styling;
- virtual spacing between nodes creates apparent dead zones where a click
  selects nothing;
- the same selection model needs a second view, `viewGrid`, so behavior can be
  tested across projections instead of being hardcoded to tree rows.

## Current Code Shape

`src/components/views/viewTree.svelte` currently owns:

- tree flattening through `TreeVirtualizer`;
- virtual row windowing;
- selection rectangle pointer state;
- rectangle DOM intersection against `.vm-tree-virtual-row[data-id]`;
- row click suppression after box selection;
- badge action suppression;
- chevron event handling;
- render-time selected/focused/active-filter class assignment.

`src/components/containers/panelExplorer.svelte` currently owns:

- `selectedNodeIds`;
- `selectionAnchorId`;
- `focusedNodeId`;
- `manualExpandedIds` and `manualCollapsedIds`;
- direct calls to `applyPointerSelection`, `applyKeyboardMove`, and
  `applyBoxSelection`;
- context-menu selected node resolution;
- mirroring selected ids back into `plugin.viewService`;
- files selected-file synchronization.

`src/logic/logicKeyboard.ts` already has good pure selection functions, but
they are shallow as the main interface. The callers still own all lifecycle and
coordination state.

`src/services/serviceViews.svelte.ts` already stores selection and focus per
explorer id, but only exposes `select`, `clearSelection`, and `setFocused`.
It does not own anchors, range selection, box selection, active/hover state,
outside clear, or keyboard movement.

`src/components/views/viewGrid.svelte` duplicates selection logic for files
only. It uses `TFile` props, `selectedFiles`, `onFileClick`, `onContextMenu`,
and `app.metadataCache`. It is not a generic node grid and is closer to a
file-table/list projection than the intended `viewgrid`.

Read-only subagent inspection added these specifics:

- `ViewGrid` identity is `file.path`, while tree identity is `TreeNode.id`.
- `panelExplorer.svelte` fills `nodes` in tree mode but fills `flatFiles` in
  grid mode, so view switching also switches selection models.
- grid branch currently creates synthetic file nodes for click/context menu
  callbacks, which is a compatibility shim rather than a stable node-grid
  interface.
- `ViewService` currently builds row models with empty cells, so it is useful
  future vocabulary but not a sufficient foundation for an interactive
  table/grid in this slice.

## Accessibility Evidence

The WAI-ARIA APG tree view guidance explicitly separates focus from selected
state in multi-select trees. It states that multi-select trees let users move
focus while selecting multiple items, and that selected state is independent of
focus. It also defines expected keyboard behavior for arrows, Enter, Space,
Shift ranges, Control ranges, and `Control+A`.

The APG grid guidance treats grid as a composite widget that must manage focus
inside the grid. This supports designing `viewGrid` as a real adapter with its
own focus mapping, not as a static table that only happens to use CSS grid.

MDN documents that when a `tree` or `grid` supports multi-selection, the owner
element should declare `aria-multiselectable="true"`, selected descendants
should expose `aria-selected="true"`, and selectable unselected descendants
should expose `aria-selected="false"`.

## Architecture Evidence

The existing explorer view service spec already decided that:

- `viewGrid.svelte` should be rebuilt as an icon/tile grid, not as table debt;
- selection and focus belong in the shared view model;
- tree, table, grid, cards, and list projections should present the same
  semantic layers in different visual forms.

This slice should honor that direction without attempting the whole view system
at once.

## Confirmed Root Cause Hypotheses

The first implementation risk is not the selection rectangle itself. The risk
is that selection gestures and provider activation are coupled in different
places:

- plain click currently both selects and then activates;
- modifier clicks select without activation;
- drag box selects without activation and suppresses the follow-up click;
- files use `handleNodeSelection`, while props and tags use `handleNodeClick`;
- context menu depends on selected same-type nodes.

The service must preserve those distinctions. It should not make every click a
selection-only event, and it should not let a minor pointer movement become a
box-select gesture that suppresses intended activation.

## Design Research Notes

Apple's Liquid Glass guidance emphasizes hierarchy, translucent materials,
legibility, and controls that do not obscure content. For this selection slice,
that translates into restraint:

- selected state should be clear but not noisy;
- active/hover/focus should be lighter than selection;
- queue/filter badges remain crisp and readable;
- hover-revealed actions may feel fluid, but reduced-motion and hit-target
  reliability take priority over decorative animation.
