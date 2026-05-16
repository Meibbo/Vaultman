---
title: Tree migration and visual contract
type: spec-shard
status: active
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass spec]]"
created: 2026-05-15T18:00:10.0199112-05:00
updated: 2026-05-15T18:00:10.0199112-05:00
tags:
  - agent/spec
  - explorer/tree
  - explorer/visual-contract
created_by: codex
updated_by: codex
---

# Tree Migration And Visual Contract

## Migration Rule

The `viewTree` work is a real migration to the platform architecture, but it is
not a visual remake.

The correct baseline is the expected tree contract, not the currently broken
tree state. Known regressions must be fixed as part of the migration because
they are user-visible and currently make the tree feel broken.

## Known Broken Contracts To Fix

### Selection Box

Tree box selection is currently broken and must be restored.

Expected behavior:

- drag selection works in tree;
- selection range maps to semantic node ids;
- virtualized rows do not lose selection state;
- scrolling during or after selection does not corrupt selected ids.

### Selection Highlight

Selected rows should use the expected grey selection treatment.

Expected behavior:

- selected row background is grey;
- selected state remains legible;
- selection does not become accent-only;
- selection state is consistent with keyboard focus and click selection.

### Filtered Highlight

Filtered nodes should use accent as a semantic signal without becoming
eye-candy or reducing label readability.

Expected behavior:

- filtered rows have a left border in accent;
- filtered rows use the existing translucent accent background token/color;
- filtered background must not be 100% accent;
- labels remain readable in light and dark themes;
- implementation must verify and reuse the current accent transparency source
  before changing CSS.

### Selected And Filtered Composition

Rows that are both selected and filtered need explicit composition.

Expected behavior:

- selected grey remains the base selection signal;
- filtered accent left border remains visible;
- any accent tint must use the existing translucent accent treatment and must
  not overpower label readability;
- behavior is documented and covered by visual/component tests.

### File Extension Placement

File extensions should be aligned at the far right of the row, not at an
intermediate point.

Expected behavior:

- extension area is right-aligned;
- label truncation does not push extension placement into the middle;
- extension placement remains stable under virtualization and resize;
- `.md` is hidden because it is implied and the props counter already carries
  the relevant markdown/file signal.

## Style Lock

The migration must not introduce arbitrary visual changes.

Locked unless explicitly approved:

- row height;
- indentation scale;
- typography;
- icon choice;
- icon size;
- colors outside the known fixes;
- spacing;
- density;
- hover affordance style;
- badge shape and placement;
- context menu affordances.

If implementation discovers a tempting cleanup outside this list, it should be
recorded as follow-up polish rather than bundled into the migration.

## Required Baselines

Before product migration begins, capture the expected tree states as tests or
snapshots:

- default row;
- folder row expanded;
- folder row collapsed;
- file row;
- selected row;
- filtered row;
- selected + filtered row;
- focused row;
- hover row;
- row with badges;
- row with right-aligned extension;
- markdown file with hidden `.md`;
- box selection active.

The migration is done only when these states preserve or restore the expected
contract while moving the data/scroll/geometry responsibilities out of the
current god object.
