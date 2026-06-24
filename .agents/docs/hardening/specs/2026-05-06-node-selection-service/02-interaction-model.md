---
title: Interaction model
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-06-node-selection-service/index|node-selection-service]]"
created: 2026-05-06T07:05:00
updated: 2026-05-06T07:05:00
tags:
  - agent/spec
  - ui/interaction
---

# Interaction Model

## Terms

**Selected node** means the node is in the current operation set. Batch actions,
context menus, delete, rename, set prop/value/tag, and future queue operations
use this set.

**Focused node** means the keyboard navigation target. It can move without
changing selected nodes.

**Active node** means the visual row/tile currently pointed at by keyboard
focus or mouse hover. It uses a faint transparent highlight and can be derived
from focus and hover.

**Active filter node** means a node matching an enabled filter. It is not the
same as selection and should keep its existing semantic accent.

**Primary node action** means the provider action for the node. Examples:

- file label action opens or selects the file workflow defined by the files
  provider;
- prop label action toggles property filter unless a more specific action mode
  is active;
- value label action toggles value filter;
- tag label action toggles tag filter;
- add mode queues add operations through direct action badges or provider
  action handling.

## Pointer Model

Plain row-slot click:

- selects exactly that node;
- clears previous selected nodes;
- sets focus/active to that node;
- does not depend on clicking visible text;
- does not block chevron, badge, input, or context-menu controls.

Control or Command row-slot click:

- toggles that node in the selected set;
- keeps other selected nodes;
- sets focus/active to that node.

Shift row-slot click:

- selects the contiguous range from anchor to target;
- replaces the prior selected set.

Control or Command plus Shift row-slot click:

- adds the contiguous range from the additive range anchor to target;
- preserves the existing selected set.

Drag rectangle:

- selects all row/tile slots intersecting the rectangle;
- with Control or Command, adds them to the current selection;
- without Control or Command, replaces the current selection;
- should never be the only way to select multiple nodes.

Label/action-zone click:

- runs the provider primary node action;
- does not prevent the node from becoming active/focused;
- should not silently change a multi-selection unless the action explicitly
  consumes the selected set.

Chevron click:

- only toggles expansion;
- never changes selection;
- never triggers provider activation.

Badge or quick-action click:

- only runs the badge action;
- never changes row selection;
- never triggers provider activation.

Context menu:

- if the target node is not selected, replace selection with the target node
  before opening the menu;
- if the target node is selected, open the menu with the selected set;
- pass selected nodes to provider/context-menu actions.

Click outside active explorer:

- clears selected ids, anchor, focus, and active id for that explorer;
- does not clear expanded/collapsed tree state;
- does not clear active filters or selected files unless selected files are
  explicitly derived from the node selection for the current provider.

## Keyboard Model

`ArrowUp` and `ArrowDown`:

- move focus/active through visible ordered ids;
- should not change selected ids unless the selected interaction model says so.

`Shift+ArrowUp` and `Shift+ArrowDown`:

- extend range selection from anchor to new focus.

`Control+ArrowUp` and `Control+ArrowDown`:

- move focus without changing selection.

`Space`:

- toggles selection of the focused node.

`Shift+Space`:

- selects the contiguous range from anchor to focused node.

`Control+Shift+Space`:

- adds the anchor-to-focused range to the selected set.

`Enter`:

- runs the provider primary action for the focused node.

`Escape`:

- clears selected ids, anchor, focus, and active id unless a nested editor or
  popup consumed the key first.

`Home` and `End`:

- move focus to first or last visible node without opening or closing nodes.

`Control+A`:

- optional but useful. Select all visible nodes in the active explorer. If this
  is implemented, the explorer container must expose clear selection as well.

## Visual Model

Selected:

- stronger accent fill or outline;
- used by operation/batch action state;
- visible even when the node is not focused.

Focused/active:

- faint transparent highlight or thin inset ring;
- follows keyboard navigation and mouse hover;
- distinguishable from selected state.

Active filter:

- existing filter accent state;
- may coexist with selected and focused states.

Pending/deleted/warning:

- existing queue/decorative layers;
- must remain readable when combined with selection.

Reduced motion:

- gooey/liquid transitions are optional polish;
- selection state changes must be immediate and legible when motion is reduced.
