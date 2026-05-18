---
title: 01 — Architecture
type: spec-shard
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 01 — Architecture

## Principles

- **Deep modules with small interfaces** (Ousterhout). Each new
  module exposes a narrow public surface and hides substantial
  implementation depth. The View Feature Contract is the small
  interface; the view-host + presentation service + per-view
  emission rules are the deep modules.
- **Data-driven, not code-driven.** Vocab choices per (view ×
  preset × context) live in contract literals, not in view
  component templates. Adding a new provider or vocab dialect
  becomes a literal edit, never a rewrite.
- **Services stay agnostic of presentation.** `serviceDnd`,
  `serviceManualDnd`, `serviceNodeRowMeasure`, `serviceExplorerScrollGeometry`,
  and `NodeSelectionService` do not learn about preset / native
  vocab / `btnNodeElementsVisibility`. View components are the
  presentation boundary.
- **Context API for state-crossing, props for control flow.**
  ViewHost distributes shared state (viewHost service, mask,
  preset) via typed-Symbol contexts (`VIEW_HOST_KEY`,
  `NODE_ELEMENT_MASK_KEY`, `PRESET_KEY`) — the pattern O established
  for `FRAME_NAVIGATION_KEY` / `FRAME_POPUPS_KEY`. Per-view
  control flow (row inputs, callbacks, scroll target) remains
  prop-based; the EDP-009 row contract is untouched.
- **Preserve user intent across preset toggles.** Override state
  on the viewHost service is not cleared when preset switches; it
  is dormant under `lockNodeElementVisibility=true` and reasserts
  when the user returns to an unlocked preset.

## Component graph

```
panelExplorer.svelte (panel surface)
  └─ <ViewHost
        preset={preset}
        mountContext="panel"
        viewMode={bindable}
        rowInputs/projection={…}
        …callbacks
     />
       ├─ serviceViewHost (runes class, panel-scoped)
       │     ├─ context.set(VIEW_HOST_KEY, service)
       │     ├─ context.set(NODE_ELEMENT_MASK_KEY, { value: () => service.nodeElementMask })
       │     └─ context.set(PRESET_KEY, { value: () => preset })
       └─ {#if viewMode === 'tree'}    <viewTree …/>
          {:else if viewMode === 'list'}  <ViewNodeList …/>
          {:else if viewMode === 'table'} <ViewNodeTable …/>
          {:else if viewMode === 'grid'}  <ViewNodeGrid …/>
          {:else if viewMode === 'cards'} <ViewNodeCards …/>

overlayViewMenu.svelte (existing, edited)
  ├─ getContext(VIEW_HOST_KEY)
  ├─ {#each viewHost.selectableModes} → view-mode button
  └─ {#if viewHost.multiSelectionAvailable}
        <ViewMenuNodeElementsToggle service={viewHost} />
```

## File layout

```
src/
├── services/
│   ├── serviceExplorerViewContract.ts        [EDIT — extend]
│   ├── serviceNodeElementVisibility.ts       [NEW]
│   └── serviceViewHost.svelte.ts             [NEW]
├── components/
│   ├── explorer/                             [NEW folder]
│   │   ├── ViewHost.svelte                   [NEW]
│   │   └── viewHostContext.ts                [NEW — Symbol keys]
│   ├── containers/
│   │   └── panelExplorer.svelte              [EDIT — C5 extraction]
│   └── overlays/
│       └── overlayViewMenu.svelte            [EDIT — C7 wiring]
├── types/
│   └── typeViewHost.ts                       [NEW]
```

## Module ownership boundaries

| Module | Owns | Public interface |
|---|---|---|
| `serviceExplorerViewContract.ts` (extended) | Per-view feature flags, scale gates, native vocab literals (panel + in-editor), state-mod allowlists | `explorerViewContract(viewMode)` getter; `EXPLORER_PLATFORM_VIEW_MODES`; `isExplorerPlatformViewMode`; type exports |
| `serviceNodeElementVisibility.ts` | Pure derivation of `NodeElementMask` from preset + overrides | `computeNodeElementMask(preset, overrides)`; `baseMaskFromPreset(preset)` |
| `serviceViewHost.svelte.ts` | Per-panel mutable host state | `ViewHostService` class: `preset`, `mountContext`, `viewMode`, `btnNodeElementsVisibility`, `selectableModes`, `nodeElementMask`, `multiSelectionAvailable`, `setViewMode(mode)`, `toggleElement(kind)`, `toggleBadgeKind(kind)`, `resetOverrides()` |
| `viewHostContext.ts` | Typed Symbol key constants | `VIEW_HOST_KEY`, `NODE_ELEMENT_MASK_KEY`, `PRESET_KEY` |
| `ViewHost.svelte` | Mode switch, mount of view component, context distribution | Props: `preset`, `mountContext`, `viewMode` (bindable), row-input props, all callbacks panelExplorer threads today |
| `overlayViewMenu.svelte` (edited) | View-mode selector UI + node-elements visibility toggle | Existing component shape preserved; consumes context internally |
| 5 view components (edited) | Row rendering; gate per-element render on mask | Existing prop surface preserved; consume `NODE_ELEMENT_MASK_KEY` |

## Non-goals (locked OUT of 0-A)

- No in-editor renderer (`mountInEditorViewHost` real, MarkdownView / CodeMirror / Decoration wiring) — fast-follow sub-phase.
- No SCSS → UnoCSS migration mass — Sub-system N. (UnoCSS bracket syntax where natural OK.)
- No wire `preset.dock` / `preset.tabs` / `preset.toolbar.buttons` — Sub-systems 6/7.
- No `preset.unload` / `preset.colors` / `preset.layout` / `preset.workspaceId` wiring — future sub-systems.
- No change to EDP-009 `ExplorerRowInput<>` shape.
- No rewrite of `panelExplorer.svelte` beyond the ViewHost extraction (C5).
- No change to view-component virtualization (TanStack), variable-height geometry, row measurement services.
- No new view mode (Map / ViewNodeMap stays deferred; outline view stays deferred).
- No selection / focus authority change (`NodeSelectionService` remains sole owner).
- No DnD behavior change (`serviceDnd` / `serviceManualDnd` / dnd-kit untouched).
- No settings-level persistence for `btnNodeElementsVisibility` (panel-scoped in-memory only).
- No per-preset viewMode memory across preset toggles (Theme Builder territory).
- No Bases data-plane consumption / Bases-replacement / overlay coexistence — Provider Extensibility sub-system.
- No Polished preset rewrite (React/CSS source files) integration — dedicated session post-0-A.
- No Action Routing Contract — future sub-system.
- No comprehensive adversarial scroll harness rebuild — Sub-system 0-A.S.
- No 3-plugin sequential perf comparison — Sub-system 0-A.S.
- No Notebook Navigator parity beyond current baseline metrics.

## Preserve constraints (must not break)

- EDP-009 `ExplorerRowInput<NodeBase>` shape identical (all 5 views still consume it as today).
- `NodeSelectionService` remains sole authority for `selectedIds`, `focusedId`, `activeId`.
- No direct VFS mutation paths added.
- Panel rendering path preserved — ViewHost is mounted by panelExplorer, surrounding panelExplorer behavior unchanged.
- Scroll smoothness from variable-scroll-repair preserved — per-row measurement stays; scroll-idle defer pass untouched (only the flicker SYMPTOM gets fixed in C12, not the deferral mechanism unless that turns out to be the root cause; in that case escalate before patching).
- `main` branch zero AI workflow files (per AGENTS.md).
- Obsidian CLI live tests target `vault=plugin-dev` explicitly.
- Map / ViewNodeMap remains deferred and non-selectable.
- Media slot defaults OFF in every preset.
- `EXPLORER_PLATFORM_VIEW_MODES = ['tree','list','table','grid','cards']` — no markmap, no outline.
- TanStack virtualization untouched.
- `themeService` instance + `useNativeDom` derivation contract preserved (consumed via new context channel but underlying derivation unchanged).
- `overlayViewMenu.svelte` existing structural location preserved (only its internals get refined).

## Historical-compatibility note: btnMultiSelection → btnNodeElementsVisibility

0-B documents and discussion threads refer to the user-facing
multi-element visibility toggle button as `btnMultiSelection`.
0-A renames the identifier across the codebase to
`btnNodeElementsVisibility` because the historical name reads as
"multi-row selection" which is a different feature owned by
`NodeSelectionService` (Ctrl-click, Shift-click, box-select). The
new name reflects the actual semantic: a per-`NodeElementKind`
visibility selector.

A post-rename grep across `.agents/docs/` is mandated in C7 to
update or annotate any remaining references with the rename note.
