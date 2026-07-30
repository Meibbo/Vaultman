---
title: proto-v6 Sidebar Map (proto piece → our model → roadmap slot)
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-05-26-style-source-reconciliation/index|Style Source Reconciliation]]"
created: 2026-05-26T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/research
  - initiative/hardening
  - proto/merge
  - explorer/surfaces
---

# proto-v6 Sidebar Map

From the read-only JSX deep-read of **proto design** (the rolling prototype stream). This map is the **snapshot at v6** (v7 ships 2026-05-28; docs refer to the STREAM as "proto design", not a pinned version — pin a snapshot id only when mapping). Sidebar-mode-visible only;
big-picture/dashboard deferred. Decision verbs: ADOPT / RESHAPE / MAP / ADD / FIX / DROP / DEFER / SUPERSEDE.

## Central insight

The proto's **islands ARE Scenes mounted on overlay / pop-up surfaces** — each island = a Scene backed by our logic (filters / queue / view-config / sort / FnR). Concretises the locked "filter-lists + queue become Scenes, mountable on any surface" + "islands = overlay-in-surface".

## Map

| Proto piece (file) | What it is | Our model | Decision | Roadmap slot | Near-term? |
|---|---|---|---|---|---|
| Bottom nav: pill / dual / drawer modes, multi-gesture FABs, pulse (`sidebar.jsx`) | dock / bottom-bar + FAB actions | bars overlay + ActionProvider/ActionNode + InputRouter + LayoutBuilder | RESHAPE | Surface foundation (lane A) + menu-curator (lane D) | LATER |
| **FiltersIslandV4**: orphans + AND/OR/NONE groups + subgroups + DnD + composer (`stack-island.jsx`) | filter builder | filter logic + `serviceGroup` (ContainerNodes) + Dnd axon; **filter-Scene** | RESHAPE | **logicProps/Tags (NOW)** defines behavior; filter-Scene = Surface | **NEAR-TERM (UX target for logicProps/Tags)** |
| QueueIslandV4: auto-group by action kind + custom groups + apply (`stack-island.jsx`) | queue builder | **queue-as-Scene** (explorer of `OperationNode`s) + `serviceGroup` + Operations | RESHAPE | Operations (lane E) + queue-Scene | partial (queue-Scene locked) |
| ViewIslandV4: list/icons/tiles/cards + size presets + column + behavior toggles (`stack-island.jsx`) | view-config editor | `view-config` (engine/mode/orientation + cell columns) + Geometry sizes | RESHAPE | V.D / view-config + LayoutBuilder | NEXT/LATER |
| SortIslandV4: multi-level sort + manual + group-by + A-Z (`stack-island.jsx`) | sort builder | sort logic + `serviceGroup` + manual-dnd | RESHAPE | logic-extraction (sort) + serviceGroup | partial |
| **SearchIsland / FnR**: pinned replace + advanced toggles + search\|create modes + suggestions (`search-island.jsx`) | find-and-replace + search | **FnR cluster (`logicFnR*`)** + search (minisearch, deferred) | RESHAPE | **logicFnR* (NOW, row 6)** + search | **NEAR-TERM (UX target; beta's FnR broke via bits-ui)** |
| ControlIsland: layout + theme + accent (`control-island.jsx`) | LayoutBuilder/ThemeBuilder overlay | LayoutBuilder + ThemeBuilder; **DROP 6 palettes** (umbrella); keep accent + layout | RESHAPE + DROP palettes | Theme Builder #10 + Surface | LATER |
| Pages/tabs: reorderable provider tabs + sticky-header detect (`pages.jsx`) | in-scene tab-switcher + sticky | in-scene tab-switcher primitive (locked) + render-runtime sticky | RESHAPE | P.D + render-runtime | NEXT/LATER |
| Action-driven animations: FAB pulse ← apply/clear/add (`sidebar.jsx`) | animations tied to actions | animation ← InputRouter/ActionNode intent + tokens | ADOPT pattern | Style/Theme (N) + P.D | LATER (pattern noted) |
| StatsPage, nautilus icons | big-picture dashboard / desktop icons | panelData / Geometry visuals | DEFER (out of sidebar scope) | — | NO (excluded) |

## Near-term actionable (the only two that touch the NOW spine)

- **FiltersIslandV4 → `logicProps` / `logicTags` extraction** (NOW): proto's AND/OR/NONE group + subgroup + DnD model = the intended filter UX. Spec the extracted filter logic against this shape
  + `serviceGroup` (ContainerNodes).
- **SearchIsland (FnR) → `logicFnR*` extraction** (NOW, row 6): proto's pinned-replace + advanced toggles (case/word/regex/sep/next/all) + search|create modes + suggestions = the working FnR island. Beta's FnR broke during a bits-ui attempt → extract `logicFnR*` pure, render against the proto shape, avoid the bits-ui coupling that broke it.

Everything else (dock, ControlIsland, View/Sort islands, animations, tabs) = LATER (Surface foundation / Theme Builder / Style-Theme). Validates "islands = Scenes on overlay surfaces".

## Pass 2 — more sidebar pieces (2026-05-27)

| Proto observation | Our model | Decision | Slot |
|---|---|---|---|
| FAB 2×-click = secondary action → anim + pulse "done"; per-kind OR per-action-order (gesture/modifier) | InputRouter (gesture→order) + ActionNode + animation keyed by (kind × action-order) + tokens | ADOPT (action-driven, keyed by order) | Style/Theme (N) + P.D + ActionNode |
| toolbar + tab-switcher (secondary-bar) ordering | `ToolbarPrimitiveRegistry` + model-resolver + placement-policy; tab-switcher = in-scene primitive | RESHAPE → LayoutBuilder ordering | toolbar #7 + LayoutBuilder; LATER |
| islands top/bottom discrimination at sidebar size-class | capability-profile (size-class) + WorkspaceMediator + LayoutBuilder | RESHAPE; **OPEN** large-surface behavior | Surface foundation; OPEN |
| toolbar searchbox stretches on island-open, pushing non-overlay ActionNodes (auto-reveal, expand/collapse) | reactive bar layout + ActionNode `opensOverlay?` flag + LayoutModel resolver | ADOPT (bar reactivity); **ADD** `ActionNode.opensOverlay` | Surface foundation (bars) + ActionNode; LATER |
| proto viewTiles = detailed alt to the flat compact list | Linear engine **new mode `tiles`** (detailed row) vs flat-list | RESHAPE → **ADD Linear `tiles` mode** | V.D engines/modes |
| action/command input-binding shown as a node Cell (cmd+K primitive; cmenu shortcuts) | Cell (source = action binding) on ActionNode; `InputBindingNode` (DEFERRED) = editable map | **ADD** binding-as-Cell on ActionNodes | ActionNode + Cell; InputBinding DEFERRED |

Model refinements surfaced (small, to fold later): Linear gains a `tiles` mode (update [[docs/architecture/explorer-model/02-render-and-data|02-render-and-data]]); ActionNode gains `opensOverlay?` + action-order-keyed animation + an optional binding Cell (refines ADR 0005);
islands top/bottom = capability-profile behavior.

**NEW OPEN**: do islands keep the sidebar top/bottom rule on a large surface (main-leaf desktop/tablet), or does LayoutBuilder / ThemeBuilder / WorkspaceMediator own placement there?

## Approach — enumerate only what NOT to extract

proto is mostly adoptable → default = **RESHAPE each proto piece onto its axis at its roadmap slot**; explicitly list only the short stop-list:

- **DROP** (reject on merits): the 6 theme palettes (Obsidian handles themes).
- **DEFER** (out of this pass's scope, may revisit): StatsPage, nautilus desktop icons, big-picture / multi-column layout; `InputBindingNode` editable map (binding-as-Cell *display* is fine now); Nav3D.
- **FIX** (wanted but half-done): the FnR island (beta's broke via bits-ui) → complete during `logicFnR*`.

Everything else = RESHAPE/ADOPT onto Surface / View / Node / Logic / Style at its slot.
**Foundation-first**: the mega-refactor (logic-extraction → N.R → V.D → P.D + Surface) is the base that absorbs all of it — proto features slot onto the axes, they are not copied wholesale.

## Status

Map + pass-2 captured. Feeds: (1) NOW logic-extraction specs (filters + FnR shapes); (2) the proto-v6 integration grill (islands-as-Scenes); (3) the style matrix (action-driven animation).
Model refinements (Linear `tiles` mode · ActionNode `opensOverlay`/anim-by-order/binding-cell) + the islands-on-large-surface OPEN to fold when those sub-systems are spec'd.
