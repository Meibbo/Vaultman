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

Faithful capture of decisions from the V.D → architecture-foundation brainstorm (Claude Opus 4.7 session, 2026-05-25 / 2026-05-26). Status tags: **LOCKED** (user-confirmed), **PROPOSED** (recommended, awaiting confirm), **DEFERRED**.
No lossy compression. Parenthetical ids reference the brainstorm question inventory; links point to source records.

**Changed / superseded decisions (audit trail):**
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-changelog|decision-changelog]].

## Model spine
- **LOCKED** 8-dimension model: core axes **Surface · View · Node · Logic** + cross-cutting **Navigation** (Logic sub-axis) **· Style/Theme · Process · Operations**. (Y4)
- **LOCKED** Operations = a domain crossing all axes: queue + diff/**VFS** + agent-action layer (public API `read→plan→enqueue→preview→execute` + AI skill).
  NodeKind `OperationNode`. Sources:
  [[docs/work/pkm-ai/plans/2026-05-10-service-api-read-plan-enqueue/index|service-api-read-plan-enqueue]], [[docs/work/pkm-ai/plans/2026-05-10-queue-contract-repair/index|queue-contract-repair]].

## Surface / composition
- **LOCKED** (ADR 0007, Accepted 2026-05-26) `page = editor-group` on native Obsidian leaves/splits + a thin `layout-config`; not a leaf nor the whole layout. Complemented by the Scene tile-tree for sub-surface splits (shard 03).
- **LOCKED** (ADR 0008, Accepted 2026-05-26) render ownership in 2 layers (see View section).
- **LOCKED** queue + filter-lists (half-hardcoded today) → become Scenes (queue = an explorer of `OperationNode`s; filter-lists = a Scene), mountable on any surface like everything else.
- **LOCKED** `Scene` = orchestrates panels + primitives (NOT bars) in a surface;
  movable between surfaces from config; shipped sets = presets → explorer-builder.
- **LOCKED** Surface family = tab (side/main leaf) · modal · pop-up · cmenu · codeblock.
- **LOCKED** capability profiles = adopt MINIMAL (size-class · can-host-overlays · mobile-ok); grow when the 2nd+ non-leaf surface ships. (N1)
- **LOCKED** Bars = page/surface OVERLAY layer (not in Scene). Scene *declares* wanted bars; page-level LayoutModel resolver renders per active scene.
  `island` = overlay-in-surface; `pop-up` = status-bar surface (MySnippets Menu pattern).
- **LOCKED** Settings = a Scene on a SettingsSurface adapter. (N2)
- **LOCKED** ThemeBuilder (tokens/color) ≠ LayoutBuilder (spatial arrangement, homescreen-style).

## View / engines
- **LOCKED** View = pure renderer (data-pure). No fixed "5 views".
- **LOCKED** (ADR 0008, Accepted 2026-05-26) Render ownership = 2 layers: **data-plane** (DOM-free render-projection: order, indices `idToIndex`, grouping, cell-placement, decoration descriptors, applied size-marks) vs **render-runtime** (View-side, SHARED:
  tanstack-virtual, scroll, pretext measure, node-resizer→size-marks, tanstack-table, dnd-kit).
- **LOCKED** Engines = Linear (tree/list) · Geometry (grid/cards) · Table · **Canvas** (mindmap/graph). Each: modes × **orientation** (horizontal/vertical). (c3)
- **LOCKED** cards = grid cards-mode under the "native" preset (chameleon emits `bases-cards-*` via Style/Theme + UnoCSS/SCSS + bits-ui); not a separate engine. (c1)
- **LOCKED** `viewTree` → rename `viewList`. (c2)
- **LOCKED** per-level view = default per-explorer; per-level heterogeneous = opt-in (viewmenu / assignable action). (X1)
- **LOCKED** new modes: miller/ranger (Linear), group-box (Geometry = ContainerNode), transpose (Table), horizontal-strip (bars). Release placement TBD.

## Node / data
- **LOCKED** Node = data atom: `kind + source + cells + children` (+ layers state).
- **LOCKED** Panel = `{engine + provider(s) + config}`. Kinds: explorer-panel + dashboard-panel (counters/heatmaps/d3/plot). Explorer = a panel-kind; node ≠ explorer.
- **LOCKED** `Cell` = universal element: `source ({in|cross}-provider field incl. note-preview) + semantic role`. Position owned by `view-config`, not cell/view. (D3/N6)
- **LOCKED** `view-config` (specific_view) = bridge layout/theme ↔ view; ⊇ Bases view-def; Bases-grounded (OUT emits `bases-*`; IN translates the view-def).
- **LOCKED** NodeKinds: File · Prop · Tag · Content · Plugin · Snippet · **Adopted** · Action · Icon · InputBinding · **Container** · **Operation** · Theme · Layout.
  `metadata` = supertype (tag/prop/nestedprop/value/inline-prop). `status-cell` is NOT a node.
- **LOCKED** adopted-nodes = Node-axis cross-provider child composition (own service, extends `serviceAdoption`); chain `container→metadata→files→outline→content`;
  opt-in nav mode (vs scope-filter). Outline adopted = headers + content blocks/paragraphs.
- **LOCKED** `serviceGroup` = group-by-cell + manual-group → ContainerNodes; toggle on/off; convert-to-folder. Supersedes parts of [[docs/work/hardening/specs/2026-05-04-explorer-view-service/09-groups-sorting-templates|view-service/09]] (ViewGroup-as-object → ContainerNode; serviceViews-monolith → serviceGroup). (Y2)
- **LOCKED** cross-provider cells/elements = C.D generalized: `source:{provider,field}` on any element.

## Logic / interaction
- **LOCKED** ActionNode unification: actions = a NodeKind from an `ActionProvider`;
  cmenu / bars / fabs / dock-items = ActionNodes in placements. Native `Menu` = default renderer; explorer-as-menu = opt-in (ARIA-gated by T.G). (N3)
- **LOCKED** badge = a PLACEMENT (hosts a status-cell OR an action-node), not a blanket kind. (Q18 resolved)
- **LOCKED** ActionProvider source order: Obsidian-first (find dupes) → ours (dedupe) → other-plugins (via the public menu APIs they use). Intercepting native cmenu = adapter.
  menu-curator = ActionProvider over Obsidian menu surfaces. (f3/g3)
- **LOCKED** live-preview = `serviceDecorate` pending-op layer (rename-op value shown pre-commit); marks (`serviceMark`) = durable, separate.
- **LOCKED** decoration / dnd / selection = Logic-axis contracts ("axons", granular).
- **DEFERRED** Navigation axis incl. Nav3D (x/y/z) + Controls/Input module + `InputBindingNode` (videogame-controls scene). Advanced; roadmap-late. (X2/X3)

## Interop / platform / robustness
- **LOCKED** Bases OUT = `registerBasesView` + emit `bases-*` DOM (confirmed in web-lab app.css). IN = translator (Bases view-def/results → our engines); only Bases-registered third-party views are reachable. Order TBD; residual API-shape gaps (BasesView method names, `entry.getValue`, `note./file./formula.` namespacing) → B.P translator spec. (Q8/Q9/e1/e2)
- **LOCKED** Excalidraw = export-only: drawing→SVG thumbnail (media source) + SVG-symbol-library provider (add-on); both `serviceUnload`-gated. (Q10)
- **LOCKED** iconize-absorb: cross-surface icon override + icon-selector-explorer (`IconNode`); drop the iconize dependency entirely. (f4)
- **LOCKED** `PlatformAdapter` + Fragility Registry + capability probes + `serviceUnload` revert = monkey-patch containment (floating-tile/hover-editor, Excalidraw, menu-intercept, native-ribbon-relocate). T.G shape-tests gate Obsidian-version bumps. (f1)
- **LOCKED** platform-gating via `Platform.isMobile/isIosApp/isAndroidApp` + `isDesktopOnly` + `serviceUnload`. Debug-mode plugin (Ssentiago) emulates mobile. (Q7)
- **LOCKED** sync-boundary: synced settings (provider-enablement / property-names / display-size) vs device-local (cache blobs / stats / per-device toggles). (f2)
- **DEFERRED** minisearch (H1): own index vs Omnisearch-bridge — undecided.

## Process / roadmap / docs
- **LOCKED** roadmap = change-type (patch/minor/major) + dependency-driven dynamic order + beta (`sandbox`) / stable (`main`) channels (Q11); hardened 2026-05-26 into a dispatch-ready DAG + Now/Next/Later + cost-of-unblock priority + per-slice task contracts:
  [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/roadmap-dispatch|roadmap-dispatch]].
- **LOCKED** `publish` initiative created:
  [[docs/work/publish/index|publish]] (main/stable reconcile + beta + CI sandbox + mobile-break + license/changelog/OpenSSF). (P0/N10)
- **LOCKED** norms → policies/ADR/glossary; specs = per-plan, archived when done. (Q14)
- **LOCKED** T.G anchors the contract (writes invariants when a term/contract locks). (Q15)
- **LOCKED** doc process = agent-control-plane route profiles + orchestration-refresh-v2 decision-ledger/source-preservation + `agent-room` handoff + pkm-ai tooling.

## Orchestration (Q16)
- **LOCKED** (2026-05-26, user-confirmed) Orchestrators = **Panel-scoped controllers** (one set per explorer-panel), NOT Scene-scoped singletons. State is keyed by `provider.id` in code today (`panelExplorer` L133-141). A Panel is self-contained and exposes a uniform `PanelHandle`; the Scene composes panels and never reaches into their internals. Scene = composition + cross-panel coordination (tier model in grill).
- **PROPOSED** Fold `BadgeBubblingOrchestrator` → ProjectionAssembler: bubbling is a projection/topology pass over `expandedIds` (`utilBadgeBubbling.bubbleHiddenTreeBadges`), not badge semantics. Badge semantics stay in `serviceBadge` (kind / contradictions / queue-op→badge map). Not its own orchestrator.
- **LOCKED** (2026-05-26, user-confirmed, Q9) Cross-panel interaction = **ONE scene-agnostic mechanism**: singleton `WorkspaceMediator` + stateless `InteractionPolicy`;
  intra-scene = the special case (not a separate path). The per-Scene coordinator is **thin** (layout + primitive/bar declaration only — no interaction logic, no panel state).
  The Mediator holds **no panel state** (routes only — else it becomes the next god-object).
  Multi-panel-per-scene CONFIRMED real (ThemeBuilder layouts+snippets+themes; files+props+tags 3-column). Full tier model + diagrams:
  [[docs/architecture/explorer-model/03-surfaces-and-interaction|03 surfaces + interaction]].
- **LOCKED** `InteractionPolicy` (stateless): `(sourcePayload, target) → Operation | reject`.
  target ∈ {`PanelHandle` · editor-drop (caret) · leaf-drop} — the Obsidian **editor + foreign leaves are first-class drop targets**. NodeKind × target → `OperationNode`: tag→inline at caret · prop/value→frontmatter · file(s)→open tabs · style-node→`cssclasses`. Generalizes [[docs/work/polish/specs/2026-05-11-detachable-layout-workspace-tabs/index|detachable-layout-workspace-tabs]]. Detail: shard 03.
- **LOCKED** Two tiling levels (no hardcoded shells; `Dashboard3Column` deprecated → layout is data): (1) **native split** = `page` = editor-group of Obsidian leaves (each leaf = a surface = one Scene); (2) **Scene tile-tree** = recursive h/v splits inside ONE surface → tiles host a `Panel` OR a `ForeignEmbed` (graph / md-editor / other-plugin leaf via a PlatformAdapter — hover-editor pattern; fallback = own window-manager). The "3 sub-tabs stacked inside one tab" case = a Scene tile-tree. Detail: shard 03.
- **LOCKED** grid drill-nav: **no special deferral** — decompose the god-object as-is; grid folder-drill folds into ExpansionController. Only Nav3D / `InputBindingNode` stay DEFERRED.
- **PROPOSED** Editor-as-Scene (late): editor content = Content/paragraph adopted-nodes per edit-mode; a visual `columns` codeblock compiled to markdown (research the `columns` plugin first); draggable paragraphs (drag beside → new column). Driver:
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/index|ui-modernization-vertical-threads]].
- **PROPOSED** `Hometab` = override Obsidian "new tab / new window" → mount a configured `page` (`HometabAdapter` = PlatformAdapter; ref the "Home tab" plugin).
- **OPEN** Overlay/toolbar action-**scope** (search/view/sort): default = focused-scene (via Mediator active-context); override `{focused · selected-scenes · all}`; `selected-scenes` ⇒ Scenes become selectable entities (later capability).
- **LOCKED** Panel has **kinds** (host concerns per kind — no single host): `panelExplorer` (sort / view-engines / tree-sync; uses Projection+Expansion), `panelData` (stat/widget), `panelContent` (live-preview embed), `custom-panel`. Projection/Expansion = explorer-kind controllers, not generic.
- **LOCKED** Selection + Dnd = **scope-generic axons** (axons lock), at panel scope (nodes) AND workspace scope (scenes + layout elements: move/resize in live-layout-edit = free-canvas
  + optional-grid).
- **LOCKED** **input→action** routing is input-agnostic (mouse · key · future InputBinding):
  one `InputRouter` per panel → nav to Selection/Expansion, actions to ActionProvider.
  Keyboard-nav lives HERE — resolves the prior NavController-vs-Selection fork.
- **LOCKED** imperative API → Panel host; reveal/`scrollTarget` → shared render-runtime (ADR 0008); SearchSort forward → `panelExplorer` host.
- **LOCKED** Unified **mutation pipeline**: mutation (drag-drop incl. editor-drop · agent · FnR · rename · manual) → `OperationNode` → preview (`serviceDecorate` + `diffview`) → **chunk acceptance** (agentic-IDE accept/reject) → execute (VFS / queue). Detail: shard 04.
- **LOCKED** `panelContent` ≠ `ContentNode` (data atom vs editor-runtime panel-kind);
  `PanelHandle` = minimal core + optional capability members gated by kind (shards 03/04).
- **DEFERRED** **LayoutBuilder + Workspace-profiles** (own brainstorm, per user): granular split sizing (main/side/whole) + overlay order + cross-builder presets + whole on/off profiles over the same root. Research Obsidian **Workspaces** + **Notion**. Not in explorer-decomposition.

## Still open

Consolidated LOCKED + pending review (this iteration + carried + new):
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/open-inventory|open-inventory]].
(0007 + 0008 now Accepted.) Deferred: minisearch fork (H1) + Bases interop order (branch 3);
engine/mode release placement = assigned at roadmap cut-time.
