---
title: Multi-platform layout strategy
type: research
status: active
parent: "[[docs/work/polish/index|polish]]"
created: 2026-05-09T22:30:00
updated: 2026-05-09T22:30:00
tags:
  - agent/research
  - initiative/polish
created_by: gemini
updated_by: gemini
---

# Multi-Platform Layout & UX Strategy

## 1. The "2-3 Clicks" Philosophy
The core objective is to minimize cognitive load and interaction depth. Every vault management operation should be reachable and executable within 3 clicks.

- **Click 1: Filter/Identify.** Use the sidebar or explorer to narrow down the file set.
- **Click 2: Staging.** Add a property operation or linter rule to the queue.
- **Click 3: Execution.** Confirm the diff and apply.

### Implementation Guidelines:
- **Persistent Sidebar:** Keep the "Control Panel" accessible without deep menu nesting.
- **Contextual Actions:** Use pointer/long-press menus to trigger operations directly from the explorer nodes.
- **Bulk Defaults:** Assume bulk action by default; single-file editing should be a subset of the bulk workflow.

## 2. Multi-Platform Requirements

| Feature | Desktop (Mouse/KB) | Mobile (Touch) |
| :--- | :--- | :--- |
| **Touch Targets** | 28px - 32px height | **Min 44px height** (Apple/Google standard) |
| **Context Menu** | Right-click (`oncontextmenu`) | **Long-press** (mapped to `oncontextmenu`) |
| **Selection** | Shift/Ctrl + Click | **Checkbox mode** or "Selection Mode" toggle |
| **Grid Layout** | Multi-column spreadsheet | Single-column or card-based list |
| **Diff View** | Split (side-by-side) | **Unified** (inline) + Line Wrapping |
| **Modals** | Floating (centered) | **Full-screen** or Bottom Sheets |

## 3. Library Integration & "Absorption" Strategy
Third-party libraries (like SVAR or git-diff-view) are temporary placeholders for experimentation.

### Criteria for "Absorption" (Writing native versions):
- **Event Bloat:** If a library requires heavy polyfills for mobile touch/drag-and-drop.
- **Bundle Size:** If a file manager brings 500KB+ of unused features.
- **API Friction:** If the library doesn't easily support Obsidian-specific features (e.g., `processFrontMatter`).

### Transition Path:
1. **Facade Pattern:** Wrap third-party components in a Vaultman Svelte component to keep the interface stable.
2. **Mobile Forking:** If a library is too heavy for mobile, use `Platform.isMobile` to render a lightweight, custom Svelte list instead of the full library.
3. **Full Replacement:** Once the UX "clicks," rewrite the component using Svelte 5 runes and native Obsidian APIs to eliminate the dependency.

## 4. Technical Constraints (No-Go Zone)
- **Node.js APIs:** NEVER import `fs`, `path`, `os`, or `crypto` from Node. These break on iOS/Android. Use `this.app.vault` and standard Web APIs.
- **Fixed Widths:** Avoid `px` for container widths. Use `100%`, `vw`, or flexbox to handle the narrow viewports of mobile devices.
- **Hover Effects:** Do not hide critical functionality behind `:hover` states, as they don't exist on touch screens.
