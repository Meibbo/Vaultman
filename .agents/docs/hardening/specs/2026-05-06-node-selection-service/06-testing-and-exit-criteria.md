---
title: Testing and exit criteria
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-06-node-selection-service/index|node-selection-service]]"
created: 2026-05-06T07:05:00
updated: 2026-05-06T07:05:00
tags:
  - agent/spec
  - testing
---

# Testing And Exit Criteria

## Unit Tests

Create `test/unit/services/serviceSelection.test.ts`.

Required behaviors:

- plain pointer select replaces existing ids and sets anchor/focus;
- Control or Command pointer select toggles target and preserves other ids;
- Shift pointer select selects contiguous anchor-to-target range;
- Control or Command plus Shift pointer select adds a contiguous range;
- box select replaces selected ids by visible ordered targets;
- Control or Command box select adds targets to selected ids;
- arrow movement changes focus without changing selection by default;
- Shift arrow extends selection from anchor;
- Space toggles focused node;
- Shift Space selects anchor-to-focused range;
- Escape clear clears selected ids, anchor, focus, hover, and active;
- prune removes selected/focus/anchor ids no longer present in ordered ids.

Keep these tests on the service public interface, not private helper functions.

## Component Tests

Create or extend component tests around `ViewTree`.

Required behaviors:

- chevron click calls `onToggle` and does not call row selection or primary
  action;
- badge click calls badge action and does not call row selection or primary
  action;
- row-slot click calls row selection for clicks in the visual text area and in
  the apparent vertical gap area;
- label/action-zone click calls primary action without suppressing focus;
- context menu on an unselected node selects only that node before opening;
- context menu on a selected node passes the selected set;
- drag rectangle reports all intersecting virtual slot ids;
- Escape clear is wired through the parent explorer adapter;
- outside click clear is wired through the parent explorer adapter.

Create or extend component tests around `ViewGrid`.

Required behaviors:

- grid renders node tiles from generic nodes, not `TFile`-specific props;
- tile selection uses the same selected ids and modifiers as tree;
- tile context menu passes selected nodes;
- drag rectangle reports tile ids;
- tile action is separate from tile selection.

## Provider Tests

Extend provider tests for files, tags, and props.

Required behaviors:

- selected file nodes can be passed to file rename and delete actions;
- selected tag nodes can be passed to tag delete;
- selected prop nodes can be passed to property delete and type change;
- selected value nodes can be passed to value delete;
- direct primary action still toggles the correct filter or file action when
  no context-menu action is used;
- add mode quick actions still queue operations without activating rows.

## Accessibility Checks

Tree:

- root `role="tree"` declares `aria-multiselectable="true"` when selection is
  enabled;
- selectable treeitems expose `aria-selected="true"` or `"false"`;
- focused and selected states are visually distinct.

Grid:

- root `role="grid"` or a more appropriate selectable layout role declares
  `aria-multiselectable="true"` when selection is enabled;
- selectable tiles/rows expose selected state consistently.

## Verification Commands

Run focused tests first:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceSelection.test.ts
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewGridSelection.test.ts --fileParallelism=false
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/components/explorerFiles.test.ts test/unit/components/explorerTags.test.ts test/unit/components/explorerProps.test.ts
```

Then run:

```powershell
pnpm run check
pnpm run lint
pnpm run build
```

Avoid running Vite/Svelte component/build commands in parallel because the
current handoff records a transient resolver issue in combined runs.

## Exit Criteria

- Selection box, row click, keyboard, and context menu all use the same
  selection service state.
- Expand/collapse, badges, inputs, and label primary actions are not blocked by
  selection gestures.
- Clicking outside the explorer and pressing `Escape` clear selected nodes.
- Active/focused styling is visibly distinct from selected styling.
- Apparent visual gaps between virtual rows are still clickable row slots.
- Generic `viewGrid` exists and exercises the same node selection model.
- Focused verification commands pass or any remaining failures are documented
  with root cause.
