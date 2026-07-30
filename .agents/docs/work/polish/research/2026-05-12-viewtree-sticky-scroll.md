---
title: ViewTree sticky scroll research
type: research
status: draft
parent: "[[docs/work/polish/index|Polish]]"
created: 2026-05-12T00:00:00
updated: 2026-05-12T00:00:00
tags:
  - explorer
  - viewtree
  - ui
  - research
created_by: codex
updated_by: codex
---

# ViewTree Sticky Scroll Research

## User Request

Implement VS Code File Explorer-like sticky parent rows in `viewTree`: when an expanded parent scrolls past the top of the tree, it should remain floating as the first visible tree row until the last visible child in that parent's subtree scrolls out of the frame.

## External Research: VS Code Behavior

VS Code calls this feature **Sticky Scroll in tree views**.

Primary references:

- [VS Code 1.85 release notes: Sticky Scroll in trees](https://code.visualstudio.com/updates/v1_85#_sticky-scroll-in-trees)
- [VS Code 1.86 release notes: Sticky Scroll in tree views](https://code.visualstudio.com/updates/v1_86#_sticky-scroll-in-tree-views)
- [VS Code source: `StickyScrollController`](https://github.com/microsoft/vscode/blob/56bb9f5d3f949a92bd65b13b9e9cae3184eedcdb/src/vs/base/browser/ui/tree/abstractTree.ts#L1352-L1564)
- [VS Code source: sticky widget rendering](https://github.com/microsoft/vscode/blob/56bb9f5d3f949a92bd65b13b9e9cae3184eedcdb/src/vs/base/browser/ui/tree/abstractTree.ts#L1676-L1761)
- [VS Code source: sticky tree CSS](https://github.com/microsoft/vscode/blob/56bb9f5d3f949a92bd65b13b9e9cae3184eedcdb/src/vs/base/browser/ui/tree/media/tree.css#L124-L164)

Observed behavior from official release notes and source:

- The feature applies to all tree views, including Explorer.
- It is controlled by `workbench.tree.enableStickyScroll`.
- Sticky content is bounded to at most 40% of the tree view height.
- VS Code defaults the max sticky item count to 7.
- Sticky rows are interactive: selecting a sticky element jumps to that row, and parent chevrons still collapse their children.
- Internally, VS Code computes a sticky stack from the first visible node and its ancestors, calculates each sticky row's subtree range, and pushes the bottom sticky row upward when its last descendant reaches the sticky area.
- The sticky layer is a separate overlay container at the top of the scrollable tree, with copied rendered rows and its own background, border, focus, and hover treatment.

## Local Code Findings

Target component:

- `src/components/views/viewTree.svelte`

Relevant local architecture:

- The tree is virtualized with `@tanstack/svelte-virtual`.
- Rows are fixed-height for current sizing presets through `TREE_ROW_HEIGHT` and the CSS variable `--vm-tree-row-h`.
- `flatArray` is derived from `flattenMeasured(nodes, expandedIds)`.
- `flattenTreeNodes()` currently returns `FlatNode[]` with only:
  `node`, `depth`, `isExpanded`, and `hasChildren`.
- The component already tracks scroll fallback state:
  `fallbackScrollTop` and `fallbackViewportHeight`.
- Rendering is currently inline inside the virtual row `{#each}` block, so a sticky overlay would duplicate a large row template unless the row markup is extracted into a Svelte snippet.
- Existing styling for tree rows lives in:
  `src/styles/explorer/_virtual-list.scss`.
- Existing tests for ViewTree decorations and row behavior live in:
  `test/component/viewTreeDecorations.test.ts`.

Recent adjacent behavior:

- Indentation guides were added per parent depth in `viewTree.svelte` and `_virtual-list.scss`.
- Field visibility is now view-agnostic and already feeds the tree rows through `providerId`, `visibleFields`, and `visibleNodeFieldValues()`.

## Implementation Options

### Option A: CSS-only sticky rows

Use `position: sticky` on existing parent rows.

Tradeoffs:

- Lowest code volume.
- Does not work correctly with virtualized absolute-position rows.
- Cannot express the "sticky until subtree's last visible child exits" rule without subtree metadata.
- Breaks for nested sticky parent stacks.

Verdict: reject.

### Option B: VS Code-style overlay using computed sticky state

Extend flattening metadata, compute sticky ancestors from scroll state, render an overlay layer above the virtualized tree, and reuse the same row template via a Svelte snippet.

Tradeoffs:

- Matches VS Code's model closely.
- Works with virtualization because sticky state is computed from flat indexes and fixed row heights, not from live row DOM.
- Keeps sticky parent rows interactive by routing the same row handlers through the reused row template.
- Requires careful tests for subtree boundaries and nested parent stacks.

Verdict: recommended.

### Option C: Extract a reusable tree model/service first

Move flattening, sticky-state calculation, and row metadata into a separate service before changing the component.

Tradeoffs:

- Cleaner long-term boundary.
- More files touched and more design surface for a feature that can be implemented safely inside `viewTree.svelte`.
- Useful later if grid/table need hierarchical sticky behavior, but not needed for this request.

Verdict: defer unless the component becomes too large after implementation.

## Recommended Design

Implement **Option B**.

Design decisions:

- Name the behavior internally `stickyScroll`, matching VS Code's vocabulary.
- Keep it always enabled for `viewTree` initially; do not add a setting unless the user asks for configurability.
- Render a stack of sticky ancestors, not just one parent, because VS Code tree sticky scroll preserves hierarchy context.
- Limit sticky stack height to 40% of the viewport and max 7 rows, matching VS Code's published constraints.
- Preserve existing row UI by extracting the row markup into a Svelte snippet and rendering it from both the virtual row list and the sticky overlay.
- Keep sticky rows interactive for click, context menu, hover badges, badges, and chevron collapse.
- Mark sticky rows with a stable class/data attribute such as `.vm-tree-sticky-row` and `data-sticky="true"` for tests and styling.

## Sticky State Algorithm

Flatten metadata should include:

- `index`
- `parentIndex`
- `ancestorIndices`
- `subtreeEndIndex`

Runtime derivation:

1. Read `scrollTop` and `viewportHeight` from the existing fallback scroll state.
2. Compute `firstVisibleIndex = floor(scrollTop / rowHeight)`.
3. Find the first visible flat node.
4. Candidate sticky rows are expanded ancestor rows whose original top is above the viewport and whose `subtreeEndIndex` has not fully scrolled out.
5. For each candidate, calculate the preferred sticky top as `stackIndex * rowHeight`.
6. Push a sticky row upward when its subtree bottom overlaps the sticky area:
   `min(preferredTop, subtreeBottom - scrollTop - rowHeight)`.
7. Drop candidates that would exceed `min(7 rows, 40% viewport height)`.

This mirrors the useful part of VS Code's controller while staying simple because Vaultman's tree rows are fixed-height today.

## Styling Plan

Add a top overlay inside `.vm-tree-virtual-outer`:

- `.vm-tree-sticky-layer`
  - `position: absolute`
  - `top: 0`
  - `left/right: 0`
  - `z-index` above virtual rows but below selection box
  - `pointer-events: none`
- `.vm-tree-sticky-row`
  - `position: absolute`
  - same row height as virtual rows
  - `pointer-events: auto`
  - same background as tree surface to avoid transparent overlap
  - optional subtle bottom shadow/border when sticky stack is visible

The selection box should remain above sticky rows, preserving current box-select feedback.

## Test Plan

Add focused component tests:

- Sticky parent appears after scrolling past an expanded parent.
- Sticky parent disappears after the last visible descendant exits the viewport.
- Nested expanded parents render as a sticky stack.
- Collapsed parents do not become sticky.
- Sticky chevron calls `onToggle()` with the parent id.
- Sticky row click calls the same row handler as normal rows.

Likely targeted command:

```powershell
pnpm vitest run test/component/viewTreeDecorations.test.ts --environment jsdom
```

Follow with Svelte autofixer, `pnpm run check`, and the repo's normal focused verification for changed component/CSS behavior.

## Open Assumption

The implementation should match VS Code's sticky stack behavior by default:
multiple expanded ancestors can stick at the top, up to the viewport/count cap.
If the desired product behavior is only a single immediate parent, the sticky state computation should be capped to one row instead.
