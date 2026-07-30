---
title: 08 — In-editor seam vocabulary
type: spec-shard
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 08 — In-editor seam vocabulary

0-A declares the in-editor seam: types + class vocabulary contract per (view × preset × context) cell + DnD pattern inspiration from Obsidian's Outline tab. The actual in-editor renderer is built in a separate fast-follow sub-phase. This shard is the contract that the renderer implements against.

## Declared types

```typescript
// src/types/typeViewHost.ts (additions, declare-only)

export type ViewHostMountContext = 'panel' | 'in-editor';

export interface NoteContextProvider {
  activeFile: () => string | null;
  activeHeadingPath: () => readonly string[];
  cursorPosition: () => { line: number; ch: number } | null;
}

export interface InEditorMountContract {
  hostElement: HTMLElement;
  preset: ThemePreset;
  initialViewMode: ExplorerPlatformViewMode;
  noteContextProvider: NoteContextProvider;
  unmount(): void;
}
```

No implementation. No function called `mountInEditorViewHost` yet.
Future renderer constructs an object satisfying `InEditorMountContract`, constructs a `ViewHostService` with `mountContext: 'in-editor'`, and mounts `<ViewHost>` against `hostElement`.

## Class vocabulary cells

Combined matrix for both contexts (data lives in `02-extended-view-feature-contract.md` as contract literals — this shard is the human-readable summary).

| View | Preset | Context | rowRoot | primaryLabel | innerWrapper | childrenContainer | collapseIcon | cellWrapper | coverImage | headerCell | rowStateMods |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tree | native | panel | `tree-item` | `tree-item-inner` | `tree-item-self` | `tree-item-children` | `collapse-icon` | — | — | — | full |
| tree | native | in-editor | `tree-item` | `tree-item-inner` | `tree-item-self` | `tree-item-children` | `collapse-icon` | — | — | — | reduced |
| tree | vaultman | panel | — | — | — | — | — | — | — | — | vm-only |
| tree | vaultman | in-editor | — | — | — | — | — | — | — | — | vm-only |
| list | native | panel | — | — | — | — | — | — | — | — | vm-only |
| list | native | in-editor | — | — | — | — | — | — | — | — | vm-only |
| list | vaultman | panel | — | — | — | — | — | — | — | — | vm-only |
| list | vaultman | in-editor | — | — | — | — | — | — | — | — | vm-only |
| table | native | panel | `bases-tr` | `bases-table-cell` | — | — | — | `bases-td` | — | `bases-table-header` | full |
| table | native | in-editor | `bases-tr` | `bases-table-cell` | — | — | — | `bases-td` | — | `bases-table-header` | reduced |
| table | vaultman | panel | — | — | — | — | — | — | — | — | vm-only |
| table | vaultman | in-editor | — | — | — | — | — | — | — | — | vm-only |
| grid | native | panel | — | — | — | — | — | — | — | — | vm-only |
| grid | native | in-editor | — | — | — | — | — | — | — | — | vm-only |
| grid | vaultman | panel | — | — | — | — | — | — | — | — | vm-only |
| grid | vaultman | in-editor | — | — | — | — | — | — | — | — | vm-only |
| cards | native | panel | `bases-cards-item` | `bases-cards-property mod-title` | — | — | — | `bases-cards-property` | `bases-cards-cover` | — | full |
| cards | native | in-editor | `bases-cards-item` | `bases-cards-property mod-title` | — | — | — | `bases-cards-property` | `bases-cards-cover` | — | reduced |
| cards | vaultman | panel | — | — | — | — | — | — | — | — | vm-only |
| cards | vaultman | in-editor | — | — | — | — | — | — | — | — | vm-only |

Legend:

- "—" = `null` in the contract literal (no vocab in this slot).
- "full" rowStateMods = `is-active`, `is-selected`, `is-focused`, `has-active-menu`, `is-being-dragged`, `is-being-dragged-over`.
  (Plus `mod-collapsible` and `is-collapsed` for tree.)
- "reduced" rowStateMods = `is-active`, `is-selected`, `is-focused` only. DnD state mods omitted by default; future in-editor renderer may opt in by amending the contract literal.
- "vm-only" = view emits only `vm-*` classes regardless of `preset.useNativeDom`.

## Universal DnD vocab

```typescript
export const UNIVERSAL_DND_VOCAB = {
  dragSource: 'is-being-dragged',
  dragTarget: 'is-being-dragged-over',
  dropIndicator: 'drop-indicator',
  dropIndicatorActive: 'is-active',
  bodyGrabbing: 'is-grabbing',
  ghost: 'drag-ghost',
  ghostSelf: 'drag-ghost-self',
  ghostIcon: 'drag-ghost-icon',
  ghostAction: 'drag-ghost-action',
} as const;
```

State lifecycle of DnD (universal across Obsidian panels per the obsidian-web-lab investigation):

```
USER INITIATES DRAG (mousedown on draggable row, .grip-handle, etc.)
  ↓
  body class += UNIVERSAL_DND_VOCAB.bodyGrabbing  (cursor: -moz-grabbing)
  drag-ghost element created, fixed position, follows pointer
  source row class += UNIVERSAL_DND_VOCAB.dragSource
  ↓
DRAG OVER DROP TARGET (mousemove)
  ↓
  target row class += UNIVERSAL_DND_VOCAB.dragTarget
  drop-indicator element positioned absolutely:
    class = UNIVERSAL_DND_VOCAB.dropIndicator + ' ' + UNIVERSAL_DND_VOCAB.dropIndicatorActive
  ↓
USER RELEASES (mouseup)
  ↓
  drag-ghost destroyed
  source row class -= dragSource
  target row class -= dragTarget
  drop-indicator hidden / removed
  body class -= bodyGrabbing
```

`serviceDnd` and `serviceManualDnd` are responsible for the behavior; 0-A only standardizes the strings written to the DOM.

## Outline tab inspiration (heading panel pattern)

Captured from `C:\Users\vic_A\Desktop\obsidian-web-lab\obsidian\app.css` during 0-A brainstorm research. Documents the pattern Obsidian's core Outline tab uses to render the active note's heading hierarchy with native DnD reorder. The future Vaultman in-editor renderer inherits this pattern when (and if) it implements a heading-tracker view.

**Row structure (per heading):**

- `.tree-item-self` — heading row root (clickable, draggable)
- `.collapse-icon` — expand/collapse triangle (presence signals nested children)
- `.tree-item-inner` — content wrapper
  - `.tree-item-inner-text` — heading text, H-level badge
- `.tree-item-flair` — optional badge (block count under heading)
- `.tree-item-children` — indented container for sub-headings

**Active-focus tracking:**

The Outline tab tracks which heading is "active" by inspecting the editor's cursor position. The currently active heading row gets `.tree-item-self.is-active`. When the user navigates the note, Outline auto-scrolls the panel to keep the active heading visible.

Vaultman's `NoteContextProvider.cursorPosition()` and `activeHeadingPath()` are the seam through which a future renderer implements equivalent tracking.

**DnD pattern (Obsidian-canonical):**

- Headings are atomic drag units. Content blocks (paragraphs) under a heading move WITH the heading; they are NOT exposed as separate drag items in the Outline view.
- Source row: `.tree-item-self.is-being-dragged` (accent background, on-accent text).
- Target row: `.tree-item-self.is-being-dragged-over` (faint accent tint).
- Drop position indicator: `.drop-indicator.is-active` — 2px border line, positioned absolutely above/below target row.
- Ghost element: `.drag-ghost > .drag-ghost-self > .drag-ghost-icon`
  + heading text (opacity 0.7).
- Body cursor: `body.is-grabbing` (forces grabbing cursor across viewport during active drag).

**Implication for future Vaultman in-editor renderer:**

If Vaultman ships a heading-tracker view (out of 0-A scope), reuse the `tree-item-self`-rooted DOM structure and the universal DnD vocab. Active-focus updates flow from `NoteContextProvider.cursorPosition()` to `viewHost.viewMode` selection. Drag reorder calls into the editor's transaction system to mutate heading order; the visual feedback (state mods) emits the canonical universal classes.

## Selection state propagation in-editor

`NodeSelectionService` remains the sole authority for `selectedIds`, `focusedId`, `activeId` in BOTH panel and in-editor contexts. The future in-editor renderer subscribes to its store and threads these IDs to `<ViewHost>` as props, exactly like panelExplorer does today. The ViewHost contract does not change between contexts; only the mounting parent changes.

## Out of scope (deferred to fast-follow renderer)

- Real `mountInEditorViewHost()` function implementation
- MarkdownView integration, Decoration API wiring, CodeMirror extension setup
- Active-focus tracking from editor cursor position (only the PROVIDER interface is declared in 0-A; implementation deferred)
- Drag preview / `.drag-ghost` DOM construction (services own behavior; the strings are declared here)
- In-editor scroll geometry (may diverge from panel's TanStack setup — future renderer decides)
- Per-context CSS rules in `src/styles/` for `.in-editor` variants

The fast-follow renderer can begin once 0-A merges, using this shard as the locked contract.
