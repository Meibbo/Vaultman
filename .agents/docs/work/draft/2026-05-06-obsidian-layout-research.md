# Research Report: Obsidian Layout Manager (Updated)

## Overview
This report outlines the technical strategy for building a new Obsidian plugin that implements advanced workspace layouts, including a VS Code-style bottom panel with alignment options, secondary ribbons, and i3wm-inspired keyboard navigation.

## 1. Technical Stack
*   **Build Tool**: Vite + TypeScript (consistent with Vaultman).
*   **Framework**: Svelte 5 (utilizing runes for reactive layout state).
*   **Obsidian API**: `app.workspace` for leaf management, `Modal` for switchers, and DOM manipulation for advanced alignment.

## 2. Component Implementation Strategies

### A. Bottom Panel (VS Code Style)
*   **Alignment Options**:
    *   **Center (Standard)**: Use `app.workspace.getLeaf('split', 'horizontal')`. This split stays within the `rootSplit`, between the sidebars.
    *   **Justify (Full Width)**: To "push" the sidebars, the panel must be injected as a sibling to `.workspace-split.mod-vertical` (the main container). This requires custom DOM injection in `onload` and careful CSS flex management.
*   **Functionality**:
    *   The panel should be a split that can be maximized (`mod-maximized` class).
    *   It should support "pinning" to prevent accidental closure.
*   **Keyboard Commands**:
    *   `Set Panel Alignment: Justify/Center`.
    *   `Maximize Active Panel`.

### B. Secondary Ribbon (Activity Bar Style)
*   **Implementation**: Create a custom narrow `ItemView` (e.g., 48px) and dock it to the left/right sidebar area.
*   **Styling**: Use CSS to remove headers and make it look like a vertical icon bar.
*   **Advanced**: If "Justify" is active, this ribbon should sit *above* the bottom panel.

### C. Advanced Navigation (i3wm / VS Code)
*   **Split to New Tab**:
    *   `getLeaf('split', direction)` creates a new leaf. Do not call `openFile` to keep it "empty" or open a specific "Blank View".
*   **Group Operations**:
    *   `Move Tab to Group`: Move a single leaf.
    *   `Move Group Tabs`: Iterate through all leaves in a `WorkspaceTabs` parent and relocate them to a new split.
*   **Tiling / Fullscreen**:
    *   `Toggle Fullscreen Group`: Maximize the entire `WorkspaceTabs` container.
*   **Quick Tab Switcher**:
    *   **Implementation**: A custom `Modal` that mounts a Svelte 5 component.
    *   **Logic**: Query `app.workspace.iterateAllLeaves()` to build a list. Sort by "last active" using an internal tracker if `app.workspace.getMostRecentLeaf()` isn't enough.
    *   **UI**: Fuzzy search (Fuse.js) to quickly filter and select tabs via keyboard.

## 3. Recommended Libraries
*   **[Svelte-Tiler](https://x0k.dev/)**: For internal tiling within a view.
*   **[Fuse.js](https://fusejs.io/)**: For the fuzzy tab switcher.
*   **[Tab Shifter](https://github.com/shmup/obsidian-tab-shifter)**: Reference for leaf relocation logic.

## 4. Proposed Command Set
| Category | Command | Action |
| :--- | :--- | :--- |
| **Panel** | `Toggle Bottom Panel` | Show/Hide the bottom split. |
| **Panel** | `Set Panel Alignment: Justify` | Expand panel to full window width. |
| **Nav** | `Quick Tab Switcher` | Open modal to switch between tabs. |
| **Nav** | `Move Group to Split` | Move all tabs in group to new split. |
| **Nav** | `Split Empty (Horiz/Vert)` | Create a new split without duplicating tab. |
| **Layout** | `Toggle Maximize Group` | Set `mod-maximized` on the active group. |

## 5. Next Steps for Implementation
1.  Initialize project with `vite-plus` and Svelte 5.
2.  Test DOM injection for "Justify" alignment (injecting into `.workspace`).
3.  Implement the Quick Switcher modal logic.
4.  Expose keyboard commands via `this.addCommand`.
