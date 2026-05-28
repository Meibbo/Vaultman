---
title: Explorer Model — Panel Kinds, Interaction Axons, Mutation + Layout
type: architecture
status: active
parent: "[[docs/architecture/explorer-model/index|Explorer Architecture Model]]"
created: 2026-05-26T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/architecture
  - explorer/view-decomposition
  - explorer/interaction
  - explorer/operations
---

# Panel Kinds, Axons, Mutation + Layout

Extends [[docs/architecture/explorer-model/03-surfaces-and-interaction|03 surfaces + interaction]]
with: what panel kinds exist and who owns which concern, why Selection/Dnd are cross-scope,
the input→action layer, the unified mutation pipeline, and the LayoutBuilder/profiles
brainstorm. Status: [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-ledger|decision-ledger]].

## Panel kinds (LOCKED kinds; one OPEN)

There is no single "Panel host" — host concerns are owned **per kind**:

| Kind | Renders | Kind-specific host concerns | Projection/Expansion? |
|---|---|---|---|
| `panelExplorer` | nodes via engines × modes | provider-tree sync, sort, view-engine select, search forward | yes |
| `panelData` | widgets (stats / heatmaps / decoration primitives) | widget/stat refresh; mostly read-only | no |
| `panelContent` | header-section embed w/ live-preview editing (full Obsidian md render) | editor-render, edit-mode | no (block-level) |
| `custom-panel` | user composition of our primitives and/or scripts | user-defined | depends |

So Projection + Expansion are **`panelExplorer`-kind controllers**, not generic-panel. Each
kind composes only the controllers it needs. `panelExplorer` is the only kind needing
sort/view-engines (its many views = how versatile an explorer is for organising/presenting).

**OPEN — `panelContent` vs `ContentNode`:** today one behaves as a read-only snippet result
in the content-search scene; the other is a live-preview embed of a header section with full
editor render caps. Likely the SAME thing at two fidelities (read-only projection vs editable
embed). Resolve: is `panelContent` a `panelExplorer`/embed over `ContentNode`s, or its own kind?

## Selection + Dnd = scope-generic axons (not panel-only)

Per the LOCKED "decoration / dnd / selection = Logic-axis contracts (axons)" decision,
Selection and Dnd are **generic engines instantiated per scope**, not panel-bound:

| Scope | Selection of | Dnd of | Instance owner |
|---|---|---|---|
| panel | nodes | nodes / rows | the panel (`panelExplorer`) |
| workspace / layout-edit | scenes + layout elements (tiles / bars / primitives) | move + **resize** elements (free-canvas + optional-grid) | `WorkspaceMediator` |

In **live-layout-edit** (ThemeBuilder organising frame/workspace) the user selects, drags,
drops, and resizes every element as a free canvas with optional grid-placement — the SAME
Selection/Dnd engines, at workspace scope. That is the "super-controller" feel: one engine,
many scopes. The panel-scoped instance is unchanged; a second instance runs at workspace scope.

## input→action routing (resolves the keyboard fork)

ALL inputs provoke actions and actions modify each other → dispatch is **input-agnostic**,
not mouse-only. One layer maps raw input → intent:

```text
input (mouse gesture · key · future InputBinding / swipe / touch)
  -> InputRouter
      -> nav-intent    -> Selection / Expansion controllers (move / expand / select)
      -> action-intent -> ActionProvider -> ActionNode (cmenu / bar / fab / command)
```

Keyboard-nav wiring (`createKeyboardNav`) is **part of InputRouter** — NOT a standalone
`NavController`, NOT folded into Selection. Mouse (`serviceMouse`), keyboard
(`serviceKeyboardNav`), and the DEFERRED `InputBindingNode` are all input adapters into the
same router. Each panel wires an InputRouter that delegates nav to that panel's
Selection/Expansion and actions to the ActionProvider.

## Unified mutation pipeline (LOCKED)

Editor-drop applying preview-before-commit confirms the convergence: **every mutation flows
one path**, whether from drag-drop (incl. editor-drop), an agent action, FnR, rename, or a
manual edit:

```text
mutation intent -> OperationNode (queue)
  -> preview: serviceDecorate pending-op layer (live-preview of the pending value)
           + diffview (a View engine over the op's chunks)
  -> chunk acceptance (accept / reject per chunk — agentic-IDE accept/reject UX)
  -> execute (VFS / serviceQueue)
```

Ties **Operations × View (diffview) × Surface (editor) × Logic (decorate)**. The queue is an
explorer of `OperationNode`s; `diffview` is a View engine over op chunks; chunk-acceptance is
new (formalise against the agentic-IDE pattern). Sources:
[[docs/work/pkm-ai/plans/2026-05-10-service-api-read-plan-enqueue/index|service-api-read-plan-enqueue]],
[[docs/work/pkm-ai/plans/2026-05-10-queue-contract-repair/index|queue-contract-repair]],
[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/03-thread-vfs-review|thread-vfs-review]].

## LayoutBuilder + Workspace-profiles (OPEN — own brainstorm)

Obsidian's core layout (and the Workspaces core plugin) lacks our granularity. Wanted:

- granular control of split distribution + dimensions for main-leaf, side-leaf, or the whole
  set; plus overlay order.
- presets across theme / layout-builder / native-editor / polish / custom-slots.
- **whole profiles** = on/off bundles of {plugins, layout, snippets, theme, slots} to switch
  the entire vault in a few clicks — different "faces" over the SAME root folder.

Research before designing: Obsidian core **Workspaces** plugin (layout save/restore); **Notion**
(best-in-class draggable editor blocks → drag a paragraph beside another to make a column).
Distinct brainstorm; do not start it inside the explorer-decomposition track.

## Status

Panel-kind taxonomy · Selection/Dnd scope-generic axons · input→action (keyboard resolved) ·
mutation pipeline = **LOCKED**. `panelContent` vs `ContentNode` · LayoutBuilder/profiles =
**OPEN** (the latter needs its own brainstorm + Workspaces/Notion research). Per-item: ledger.
