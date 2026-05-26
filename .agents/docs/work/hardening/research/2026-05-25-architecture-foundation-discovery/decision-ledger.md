---
title: Decision Ledger — V.D Foundation Brainstorm
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/index|Architecture Foundation Discovery]]"
created: 2026-05-26T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/research
  - initiative/hardening
  - explorer/view-decomposition
  - agent/decision-ledger
---

# Decision Ledger — V.D Foundation Brainstorm

Faithful capture of decisions from the V.D → architecture-foundation brainstorm
(Claude Opus 4.7 session, 2026-05-25 / 2026-05-26). Status tags: **LOCKED**
(user-confirmed), **PROPOSED** (recommended, awaiting confirm), **DEFERRED**.
No lossy compression. Parenthetical ids reference the brainstorm question
inventory; links point to source records.

## Model spine
- **LOCKED** 8-dimension model: core axes **Surface · View · Node · Logic** +
  cross-cutting **Navigation** (Logic sub-axis) **· Style/Theme · Process ·
  Operations**. (Y4)
- **LOCKED** Operations = a domain crossing all axes: queue + diff/**VFS** +
  agent-action layer (public API `read→plan→enqueue→preview→execute` + AI skill).
  NodeKind `OperationNode`. Sources:
  [[docs/work/pkm-ai/plans/2026-05-10-service-api-read-plan-enqueue/index|service-api-read-plan-enqueue]],
  [[docs/work/pkm-ai/plans/2026-05-10-queue-contract-repair/index|queue-contract-repair]].

## Surface / composition
- **PROPOSED** `page = editor-group` on native Obsidian leaves/splits + a thin
  `layout-config`; not a leaf (too atomic) nor the whole layout (too broad).
  Tradeoff: ride-native (cheap, monkey-patch) vs reimplement tiling. Awaiting confirm.
- **PROPOSED** render ownership in 2 layers (see View section). Awaiting confirm; ADR candidate.
- **LOCKED** `Scene` = orchestrates panels + primitives (NOT bars) in a surface;
  movable between surfaces from config; shipped sets = presets → explorer-builder.
- **LOCKED** Surface family = tab (side/main leaf) · modal · pop-up · cmenu · codeblock.
- **LOCKED** capability profiles = adopt MINIMAL (size-class · can-host-overlays ·
  mobile-ok); grow when the 2nd+ non-leaf surface ships. (N1)
- **LOCKED** Bars = page/surface OVERLAY layer (not in Scene). Scene *declares*
  wanted bars; page-level LayoutModel resolver renders per active scene.
  `island` = overlay-in-surface; `pop-up` = status-bar surface (MySnippets Menu pattern).
- **LOCKED** Settings = a Scene on a SettingsSurface adapter. (N2)
- **LOCKED** ThemeBuilder (tokens/color) ≠ LayoutBuilder (spatial arrangement, homescreen-style).

## View / engines
- **LOCKED** View = pure renderer (data-pure). No fixed "5 views".
- **PROPOSED** Render ownership = 2 layers: **data-plane** (DOM-free render-projection:
  order, indices `idToIndex`, grouping, cell-placement, decoration descriptors,
  applied size-marks) vs **render-runtime** (View-side, SHARED: tanstack-virtual,
  scroll, pretext measure, node-resizer→size-marks, tanstack-table, dnd-kit). Awaiting confirm; ADR candidate.
- **LOCKED** Engines = Linear (tree/list) · Geometry (grid/cards) · Table · **Canvas**
  (mindmap/graph). Each: modes × **orientation** (horizontal/vertical). (c3)
- **LOCKED** cards = grid cards-mode under the "native" preset (chameleon emits
  `bases-cards-*` via Style/Theme + UnoCSS/SCSS + bits-ui); not a separate engine. (c1)
- **LOCKED** `viewTree` → rename `viewList`. (c2)
- **LOCKED** per-level view = default per-explorer; per-level heterogeneous = opt-in
  (viewmenu / assignable action). (X1)
- **LOCKED** new modes: miller/ranger (Linear), group-box (Geometry = ContainerNode),
  transpose (Table), horizontal-strip (bars). Release placement TBD.

## Node / data
- **LOCKED** Node = data atom: `kind + source + cells + children` (+ layers state).
- **LOCKED** Panel = `{engine + provider(s) + config}`. Kinds: explorer-panel +
  dashboard-panel (counters/heatmaps/d3/plot). Explorer = a panel-kind; node ≠ explorer.
- **LOCKED** `Cell` = universal element: `source ({in|cross}-provider field incl.
  note-preview) + semantic role`. Position owned by `view-config`, not cell/view. (D3/N6)
- **LOCKED** `view-config` (specific_view) = bridge layout/theme ↔ view; ⊇ Bases
  view-def; Bases-grounded (OUT emits `bases-*`; IN translates the view-def).
- **LOCKED** NodeKinds: File · Prop · Tag · Content · Plugin · Snippet · **Adopted** ·
  Action · Icon · InputBinding · **Container** · **Operation** · Theme · Layout.
  `metadata` = supertype (tag/prop/nestedprop/value/inline-prop). `status-cell` is NOT a node.
- **LOCKED** adopted-nodes = Node-axis cross-provider child composition (own service,
  extends `serviceAdoption`); chain `container→metadata→files→outline→content`;
  opt-in nav mode (vs scope-filter). Outline adopted = headers + content blocks/paragraphs.
- **LOCKED** `serviceGroup` = group-by-cell + manual-group → ContainerNodes; toggle
  on/off; convert-to-folder. Supersedes parts of
  [[docs/work/hardening/specs/2026-05-04-explorer-view-service/09-groups-sorting-templates|view-service/09]]
  (ViewGroup-as-object → ContainerNode; serviceViews-monolith → serviceGroup). (Y2)
- **LOCKED** cross-provider cells/elements = C.D generalized: `source:{provider,field}` on any element.

## Logic / interaction
- **LOCKED** ActionNode unification: actions = a NodeKind from an `ActionProvider`;
  cmenu / bars / fabs / dock-items = ActionNodes in placements. Native `Menu` =
  default renderer; explorer-as-menu = opt-in (ARIA-gated by T.G). (N3)
- **LOCKED** badge = a PLACEMENT (hosts a status-cell OR an action-node), not a
  blanket kind. (Q18 resolved)
- **LOCKED** ActionProvider source order: Obsidian-first (find dupes) → ours (dedupe)
  → other-plugins (via the public menu APIs they use). Intercepting native cmenu = adapter.
  menu-curator = ActionProvider over Obsidian menu surfaces. (f3/g3)
- **LOCKED** live-preview = `serviceDecorate` pending-op layer (rename-op value shown
  pre-commit); marks (`serviceMark`) = durable, separate.
- **LOCKED** decoration / dnd / selection = Logic-axis contracts ("axons", granular).
- **DEFERRED** Navigation axis incl. Nav3D (x/y/z) + Controls/Input module +
  `InputBindingNode` (videogame-controls scene). Advanced; roadmap-late. (X2/X3)

## Interop / platform / robustness
- **LOCKED** Bases OUT = `registerBasesView` + emit `bases-*` DOM (confirmed in
  web-lab app.css). IN = translator (Bases view-def/results → our engines); only
  Bases-registered third-party views are reachable. Order TBD; residual API-shape
  gaps (BasesView method names, `entry.getValue`, `note./file./formula.` namespacing)
  → B.P translator spec. (Q8/Q9/e1/e2)
- **LOCKED** Excalidraw = export-only: drawing→SVG thumbnail (media source) +
  SVG-symbol-library provider (add-on); both `serviceUnload`-gated. (Q10)
- **LOCKED** iconize-absorb: cross-surface icon override + icon-selector-explorer
  (`IconNode`); drop the iconize dependency entirely. (f4)
- **LOCKED** `PlatformAdapter` + Fragility Registry + capability probes + `serviceUnload`
  revert = monkey-patch containment (floating-tile/hover-editor, Excalidraw,
  menu-intercept, native-ribbon-relocate). T.G shape-tests gate Obsidian-version bumps. (f1)
- **LOCKED** platform-gating via `Platform.isMobile/isIosApp/isAndroidApp` +
  `isDesktopOnly` + `serviceUnload`. Debug-mode plugin (Ssentiago) emulates mobile. (Q7)
- **LOCKED** sync-boundary: synced settings (provider-enablement / property-names /
  display-size) vs device-local (cache blobs / stats / per-device toggles). (f2)
- **DEFERRED** minisearch (H1): own index vs Omnisearch-bridge — undecided.

## Process / roadmap / docs
- **LOCKED** roadmap = change-type (patch/minor/major) + dependency-driven dynamic
  order + beta (`sandbox`) / stable (`main`) channels. (Q11)
- **LOCKED** `publish` initiative created:
  [[docs/work/publish/index|publish]] (main/stable reconcile + beta + CI sandbox +
  mobile-break + license/changelog/OpenSSF). (P0/N10)
- **LOCKED** norms → policies/ADR/glossary; specs = per-plan, archived when done. (Q14)
- **LOCKED** T.G anchors the contract (writes invariants when a term/contract locks). (Q15)
- **LOCKED** doc process = agent-control-plane route profiles + orchestration-refresh-v2
  decision-ledger/source-preservation + `agent-room` handoff + pkm-ai tooling.

## Still open (full list in the open-inventory shard, pending)
Page confirm · 2-layer render-ownership confirm · engine/mode release placement ·
Bases interop order · minisearch fork (H1) · Q16 remaining grill branches
(orchestration ownership = panelExplorer god-object split, …).
