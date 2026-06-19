---
title: Glossary
type: architecture
status: active
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-17T11:49:10
tags:
  - agent/architecture
---

# Glossary

- Active agent doc: current operational Markdown under `docs` that agents
  may route through today.
- Active node: node currently targeted for primary action, context, or focus
  semantics; distinct from selected, hovered, or filter-matched nodes.
- Archive: non-current records kept for history, attempts, superseded work, or
  discarded drafts.
- Archive source: frontmatter field or explicit link from a compact replacement
  back to the preserved source record.
- Bootloader: root file that only points agents to the real router.
- Bases import choose mode: constrained filters-page state where Vaultman shows
  only compatible `.base`, Bases view, or markdown fenced `bases` import
  targets and applies selected compatible filters immediately.
- Bases interop report: structured import/export report that records applied
  rules, preserved-but-unapplied expressions, rejected candidates, and lossiness
  between Obsidian Bases and Vaultman.
- CMenu queue repair: hardening slice that restores context-menu actions so
  tag and file operations stage queue-visible work through Vaultman's queue.
- Chameleon architecture: Elastic UI architecture where Vaultman can render the
  same service-backed surface through native-like Thin mode, balanced utility
  mode, or richer Thick mode while preserving stable node semantics.
- Continuation shard: a follow-on shard that preserves the rest of the same
  topic when the topic itself exceeds the active page size.
- Controlled row selection: table selection mode where Vaultman owns the row
  selection state and passes it through TanStack APIs as controlled UI state.
- Current handoff: concise next-agent continuity file under `current/`.
- Current status: concise state snapshot under `current/`.
- Durable norm: repeated or approved behavior recorded in a policy, router, or
  skill so future agents can rely on it.
- Elastic UI: Vaultman's planned Thin/Balanced/Thick UI spectrum for adapting
  density, DOM shape, and styling identity to Obsidian Core, Bases, Outline, or
  richer management surfaces.
- External/test term: a term intentionally not promoted into the project
  glossary, usually because it belongs to another chat, source, or validation
  probe.
- Faint Mode: root-scoped visual state where Vaultman remaps accent CSS
  variables to Obsidian faint or muted tokens when the owning window or
  workspace focus context is inactive.
- File delete queue operation: queue representation for deleting a file that
  keeps destructive file work inside Vaultman's staged operation flow.
- FnR rename state: find-and-replace or navbar state that carries a pending
  rename handoff until the user confirms or cancels it.
- Glossary gate: required lookup before explaining unfamiliar domain terms.
- Hybrid view mode: view strategy that keeps an existing explorer mode
  available while adding a comparable alternative, such as measured cards.
- Initiative: a named workstream under `docs/work/`.
- Lossy summary: compressed rewrite that replaces detailed source material
  without preserving a path back to the source. This is a regression.
- Long-term agent memory: compact specs, policies, plans, archive records, and
  skills that survive across sessions.
- Main: release branch/path that must contain zero AI files.
- Measured card layout: card layout whose rendered height or text budget comes
  from explicit text measurement and stable layout buckets.
- Micro command: read-only short command such as `status:` or `next:`.
- Metric event: JSONL record under `metrics/` used as evidence that a
  workflow action or verification actually happened.
- Node selection service: shared service that owns per-explorer node selection,
  focus, anchor, and active-node state for tree, grid, table, and card views.
- Operational observation: environment or workflow fact noticed during a session;
  starts as a hypothesis until repeated or approved.
- Parent link: one Obsidian wikilink in frontmatter `parent`.
- Perf loop: repeatable performance diagnosis loop that gathers measurements
  before architecture rewrites or optimization claims.
- Policy: prescriptive architecture rule file.
- PretextJS: `@chenglou/pretext`, the text layout engine evaluated for
  measuring Vaultman card content.
- Primitive placement policy: declarative toolbar or layout settings that
  control primitive visibility, slot, and order without embedding DOM edits or
  runtime command handlers.
- Primary node action: default activation command for a node when the user uses
  the main click or keyboard activation path.
- Queue builder: pure helper that converts a UI or domain intent into the
  operation payload expected by `OperationQueueService`.
- Quick-action badge: compact node, row, or card badge that shows queue/filter
  state and can expose a small direct action.
- Rename handoff: transfer of rename intent from an explorer/provider action to
  a shared confirmation surface before queue construction.
- Render hot path: rendering code path exercised frequently during scroll,
  search, filter selection, or badge updates.
- Route summary: compact active note that helps agents find the right detailed
  source, shard, policy, item, or archive record.
- Route: smallest set of docs needed for a mode or intent.
- Selected node: node included in the current selection set; distinct from the
  active, focused, hovered, or filter-matched node.
- Shard: folder manifest plus numbered slices for large docs.
- Source record: full-detail raw or canonical material preserved for inspection,
  reconstruction, audit, or future distillation.
- SVAR filemanager: `@svar-ui/svelte-filemanager`, the reference or
  command-opened filemanager surface tracked separately from core explorer work.
- TanStack Table Core: `@tanstack/table-core`, the framework-agnostic table
  engine wrapped by Vaultman's local table adapter.
- Toolbar adapter: module that maps one concrete Vaultman surface's state,
  capabilities, and command handlers into the common toolbar context.
- Toolbar model resolver: module that combines toolbar context, primitive
  registry, preset aliases, and placement policy into an ordered toolbar model
  without executing commands.
- Toolbar primitive registry: source of stable toolbar primitive ids, labels,
  icons, default order, slot metadata, and availability rules.
- User-facing recovery wave: hardening wave that restores visible broken
  workflows before deeper architecture, interop, or polish work.
- View adapter: component or module that translates a service model into a
  concrete tree, grid, table, card, or overlay render surface.
- Viewgrid: explorer grid or tile surface that should share node semantics with
  the tree instead of owning a separate file-only model.
- Working memory: short-term agent memory in current status, handoff, and active
  work notes; it guides the next moves without replacing source records.

## Architecture model terms (2026-05-26)

Concise lookup. Full detail + how they fit:
[[docs/architecture/explorer-model/index|explorer-model]]. Per-decision status:
[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-ledger|decision-ledger]].
Supersedes the older "View adapter" / "Viewgrid" entries (a View no longer does
projection/translation).

- View: pure renderer over a finished render-projection; owns DOM/markup + shared runtime only. No fixed "5 views".
- Render engine: reusable layout family — **Linear · Geometry · Canvas · Charts** (Table = Geometry mode; Charts = 4th). Canon: [[docs/architecture/explorer-model/05-view-canon|05 View Canon]] / ADR 0012. (Superseded the old `Linear/Geometry/Table/Canvas`.)
- Mode: engine variant — Linear `flat·indent·cascade·detail`; Geometry `grid·cards·masonry·table`; Canvas `mindmap·graph`; Charts `chart`. group-box removed (= composition). See 05.
- Orientation: **arrangement semantics, engine-specific** (Linear `list·collapsible·accordion·drill`; Geometry `list·section·drill·container`) — NOT h/v; h/v moved to the `direction` axis. Plus `direction` / `child_global_direction` / `viewScope` (per_panel/level/parent/node) / `regime` (slot|coordinates): see 05.
- Cell: universal element = source ({in|cross}-provider field, incl. note-preview) + semantic role; position owned by view-config.
- view-config (specific_view): user-editable role→slot/order map per engine+mode; superset of the Bases view-def; the Bases IN/OUT bridge.
- Node: data atom = kind + source + cells + children; produced by a provider.
- Panel: {engine + provider(s) + config}; kinds = explorer-panel, dashboard-panel.
- Explorer: a panel-kind = {provider + engine + view-config} that renders nodes.
- Scene: orchestrates panels + primitives (NOT bars) in a surface; movable; shipped sets = presets → explorer-builder.
- Page (PROPOSED): editor-group on native leaves/splits + layout-config; not a leaf, not the whole layout.
- Surface: mount host owning a layout region + lifecycle, containing primary content (tab/modal/pop-up/cmenu/codeblock).
- Overlay: layer that assists (nav/info/action) and does not contain primary content (bars/popover/cmenu/selection-box/sticky).
- pop-up: a Surface popping from a status-bar anchor (MySnippets Menu pattern). subbar: a bar nested in a bar (persistent).
- Render-projection: DOM-free data-plane output (order/indices/grouping/cell-placement/decoration descriptors/size-marks).
- Render-runtime: shared View-side DOM layer (virtualizer/scroll/measure/resizer/table/dnd); fed by the projection.
- ActionNode: NodeKind whose activation invokes a command/macro. ActionProvider aggregates them for cmenus/bars/fabs.
- menu-curator: rendering Obsidian's menu surfaces from the ActionProvider (add via API, replace via PlatformAdapter).
- ContainerNode: synthetic parent wrapping children (manual / group-by groups, grid group-box). Produced by serviceGroup.
- OperationNode: a queued operation (rename/move/set/delete); the queue is an explorer of these.
- InputBindingNode (DEFERRED): maps input (shortcut/modifier/mouse/swipe) → command, per device.
- IconNode: icon-source selector node (emoji/lucide/distro/iconic); backs cross-surface icon override (iconize-absorb).
- metadata: node supertype over tag/prop/nestedprop(TBD)/value/inline-prop (`key:: value`).
- PlatformAdapter: one module per fragile integration (monkey-patch/private API) with probe + fallback + serviceUnload revert.
- Fragility Registry: registry of PlatformAdapters; failed probes auto-disable gracefully; T.G shape-tests gate version bumps.
- LayoutBuilder: spatial-arrangement builder (surfaces/bars/primitives); distinct from ThemeBuilder (tokens/color).
- capability-profile: a Surface's capacity (size-class/can-host-overlays/mobile-ok) vs a Scene's requirements (full/reduced/deny).
- sync-boundary: which settings sync via Obsidian Sync vs stay device-local (cache blobs/stats).
- PanelHandle: uniform contract a Panel exposes (id/kind/providerId, selection read+commands, projection, expansion, produceDragPayload, acceptsDrop, revealNode, focus); lets a Scene/Mediator drive a panel without touching its internals.
- WorkspaceMediator: workspace-level singleton; registers Scenes + foreign surfaces; resolves active-context + scope; routes all cross-panel/scene/editor interaction via InteractionPolicy; bridges Obsidian workspace events (auto-reveal, live outline) + new-leaf/hometab. Holds no panel state.
- InteractionPolicy: stateless `(sourcePayload, target) → Operation | reject`; drop-compat matrix by NodeKind × target (PanelHandle | editor-drop | leaf-drop). One scene-agnostic mechanism.
- Scene tile-tree: a Scene's recursive h/v split layout; leaf tiles host a Panel or a ForeignEmbed. Distinct from native split (page = editor-group of Obsidian leaves).
- ForeignEmbed: a tile hosting non-Vaultman content (Obsidian graph/editor/other-plugin leaf) via a PlatformAdapter (hover-editor pattern); fallback = own window-manager.
- active-context / scope: WorkspaceMediator's resolution of the focused Scene/Panel (active-context) and the overlay/toolbar action span (scope = focused | selected-scenes | all).
- EditorScene (PROPOSED): active-editor content modeled as Content/paragraph adopted-nodes per edit-mode; visual columns codeblock compiled to markdown; draggable paragraphs.
- Hometab (PROPOSED): a configured page mounted on Obsidian new-tab/new-window (HometabAdapter).
- panel-kind: a Panel's type — panelExplorer (nodes/engines) · panelData (stat/widget) · panelContent (live-preview embed) · custom-panel; host concerns are owned per kind, not by a single Panel host.
- InputRouter: per-panel input-agnostic dispatch (mouse/key/future InputBinding) → nav-intent to Selection/Expansion, action-intent to ActionProvider; keyboard-nav wiring lives here.
- diffview: a View engine rendering an OperationNode's chunks for preview.
- chunk-acceptance: per-chunk accept/reject of a pending OperationNode (agentic-IDE accept/reject UX) before execute.
- Workspace-profile (RESOLVED 2026-06-11, PSS grill Q8): = a PSS **Profile bound at workspace scope** whose composition includes the load facet (LUPA) — the on/off bundle of {plugins, layout, snippets, theme, slots} is exactly a Profile composing {load, layout, style, workspace} facets. Term folds into Profile; keep "Workspace-profile" only as the workspace-scoped usage of Profile.

## Filter / Scene / parity terms (2026-05-27)

- FilterGroup: recursive boolean predicate tree (and/or/not + nested groups + root-level orphans) that composes filter CRITERIA. Bases-shaped (data model in `typeFilter.ts` is already unbounded). Rendered as a ContainerNode tree; the predicate leaf is a generic Cell (no new NodeKind). Distinct from serviceGroup (which partitions displayed nodes); both merely materialize as ContainerNode trees from different producers.
- FilterProvider: synthetic provider that projects the active panel's filter-config into a predicate ContainerNode tree and writes edits back to that config; the filter-state is savable as a preset/template. Not a serviceMark (marks = durable per-node annotations, wrong fit for a query).
- filterScene / queueScene / sortScene / viewScene: the proto islands modeled as Scenes on overlay surfaces (filter builder / operation-queue / sort + group-by / view-config editor). A Scene is preset-agnostic logic; the floating-island look (curved corners + optional backdrop) is the polish/presentation preset only — native renders the same Scene as a menu/submenu, barebones as minimal.
- Predicate/queue rendering: NOT new engine-modes. Both use the existing Linear tree-indent mode over a synthetic provider; the AND/OR/NONE chip, composer, and apply are Scene rule-primitives (the operator chip = a primitive bound to the container, cycling via an ActionNode). Keeps View pure (ADR 0002).
- 1:1 native parity: the chameleon "native" preset target — Vaultman surfaces/style/functions are indistinguishable from Obsidian; user-loaded features feel integral; retrocompat with snippets/themes. Efficiency lever: native = core CSS classes reused as a pseudo-snippet on all surfaces (not reimplemented styles = no bloat).
- 2:1 superset: Vaultman matches all replaced-core-plugin capabilities + our extra functions + the full builder to modify every style/layout/function detail. Our builder is the 2:1 upgrade over what the core plugin offered.
- barebones preset: everything off except surface-settings + commands + the minimal Scene that gives the user a load/unload service UI — which is the same add-on-explorer, with function categories (one category = bridges to other plugins). Fuses install-selector + serviceUnload-granularity + plugin-provider.

## Modularity / scenesManager terms (2026-06-03, ADR 0011)

- module-contract: the plugin-parity interface every detachable module implements — manifest `{id, vmApiVersion, capabilities, onLoad/onUnload}`; `onUnload` is serviceUnload-revertible; cross-module comms ONLY via the internal registry (SASI / provider-index / ActionNode / WorkspaceMediator); no deep cross-module imports (eslint-enforced).
- detachable-module: an in-plugin feature (ThemeBuilder, LayoutBuilder, input-remap, online-fetch, git, devtools, scene-packs) toggled via preset + serviceUnload, enumerated by LUPA as a virtual plugin, extractable to a separate plugin later without rework. Distinct from CORE (workbench moat + systems + scenesManager).
- scenesManagerScene: CORE SceneProvider whose nodes are the available scenes (with identity) + the modules composing them. Under native preset it lists chameleon-wrapped Obsidian surfaces as scenes (editorScene / fileScene / ribbon / statusbar). The visibility lever (show/hide) — distinct from LUPA (unload) and LayoutBuilder (spatial arrange).
- editorScene: Obsidian's live-preview markdown editor (main-leaf), modeled as one of Vaultman's pages under the chameleon abstraction.
- fileScene: the native File Explorer surface rendered as a Vaultman scene under the chameleon preset (sidebar page).
- action-cell: a Cell whose semantic role is "action", bound to an ActionNode (e.g. visibility toggle on/off, quick-action badge, operator chip). Presentation variants: badge | toggle | chip. Unifies the "primitive bound via ActionNode" usages.
- redesign_mode: Live Redesign — real-time spatial editing of the workspace (reorder/resize/pan/zoom/rotate) via LayoutBuilder; edits propagate to scenesManager thumbnails on-demand (perf invariant, operational-watch-list §7).

## Presets / PSS terms (2026-06-10)

- PSS (Presets Saving System): official name (dev, 2026-06-10) for the presets persistence system. **DEFINED 2026-06-11** (grill closed — D-PSS-1..10 in [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/01-locked-decisions-grill|umbrella shard 01]]): typed facet presets (style/layout/load/view/workspace/input) + Profile composition + cascade resolution per scope (most-specific-wins, facet-by-facet); 4 storage classes (Presets/Profiles · Library items · Marks · Session) over one write-batcher infra; presets reference assets/library by id; `.scene` payload = multi-doc layered YAML (CR-2 unlocked); the operation queue protects the VAULT while config is protected by undo/ephemeral-snapshot. Persists non-rigid placement (xyz/layers/z-order). Acceptance tests: `legacy-1.1` profile exercising ALL subsystems · native preset = core-Bases behavior parity · barebones = {config_scene, snippet_scene, plugin_scene}.
- SPS: superseded alias of PSS — the megadump 2026-06-03 acronym ("Saving Presets System"). Read historical SPS mentions (megadump, ADR 0011 context, anchor checkpoint 2026-06-04) as PSS.
