---
title: Layout dock, tabs, DnD, and node mouse foundation
type: implementation-plan
status: active
created: 2026-05-10T08:14:00
updated: 2026-05-10T08:14:00
tags:
  - polish/layout
  - polish/dnd
  - hardening/mouse
created_by: codex
updated_by: codex
---

# Layout Dock, Tabs, DnD, And Node Mouse Foundation

## Intent

The user wants Vaultman's old page-specific `navbarPill` to become a generic `navbarDock`, `navbarTabs` to stay generic, and `serviceLayout` to start owning where high-level navigation content is rendered. The immediate default layout is:

- frame pages render in the tab strip;
- filter tabs render in the dock;
- dock labels are hidden by default;
- label position is configurable as bottom or side for both dock and tabs.

The same slice also repairs the Tools snippets/plugins panel height contract, improves node click/drag separation, makes the sort target placeholder affect top-level versus child sorting, makes manual DnD visible in the sort menu, adds a node-note hover badge, and starts configurable node mouse actions.

## Slices

1. Add `serviceLayout` with normalized persisted settings and defaults.
2. Create a generic `navbarDock` and route frame pages through generic tabs while filter tabs can be rendered in the dock.
3. Fix Tools snippets/plugins active panel height by giving their wrappers the shared tab fill contract.
4. Extend sort menu state to route sorting to top-level categories or children.
5. Relax rectangle selection so dragging from a node surface can start selection after movement while clicks still select/open normally.
6. Add the `node-note` badge and configurable node mouse commands with primary defaulting to filter/add-to-filters.
7. Verify focused unit/component suites, `check`, `lint`, `build`, and scoped diff whitespace.

## External Interaction Rule

For click-versus-drag thresholds and drag capture, prefer Pointer Events' capture/cancel model and explicit drag thresholds. Native HTML DnD remains a payload/export layer, not the selection-box gesture primitive.
