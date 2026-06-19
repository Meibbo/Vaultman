---
title: Ledger cluster 05 — Layout, surfaces, workspace/tiles, detached, navegación y frame
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-06-11-function-union-ledger/index|Function-Union Ledger]]"
created: 2026-06-11T00:00:00
updated: 2026-06-11T00:00:00
created_by: claude-fable-5
updated_by: claude-fable-5
produced_by: explore-subagent (opus), integrado por coordinador
tags:
  - agent/research
  - ledger
  - surface/layout
---

# Cluster 05 — Layout, surfaces, workspace/tiles, detached, navegación y frame

Términos destino según notas PSS §9/§13 + glossary: workspace = árbol recursivo de surfaces; splits X|Y = paginación espacial; tab-stacks = paginación Z (layers); UNA gramática, DOS dominios de propiedad (árbol exterior nativo Obsidian / interior de surfaces propios VM). Escalera Leaf · Surface · Scene · Page (ADR 0007). "Tab detached" → "Scene montada en surface propio".

Leyenda: `✓ (forma)` · `~` parcial · `—` ausente · `(inf)` inferido · `(sin evidencia)`.

Verificación de código clave: `tabRegistry.ts` — `TabId` (8 ids: explorer-files/tags/props/values, content, explorer-outline, page-tools, queue), `DETACHABLE`/`ALL_TAB_IDS`, `viewTypeFor` (`vaultman-tab-`), `tabIdFromInner`/`innerFromTabId`; `serviceLayout.ts` — `resolveDashboardEnabled` (main-leaf + no-thin + width>=800).

## Tabla — Frame / open path / product identity

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Open command + ribbon (open path) | ✓ (ribbon → 1 view) | ✓ (`open` reveal+toggle) | ~ (mount root app) | COMPARTIDA | ADOPT-stable (contrato) | Navigation · WorkspaceMediator | native | N3 | delta §006: "open path contract" preservar ribbon/palette/reveal-existing-leaf |
| Reveal existing leaf + focus first row | — (1 frame) | ✓ (`open` enfoca via activePanelApi) | — | SOLO-SANDBOX | ADOPT-sandbox | Navigation · WorkspaceMediator | native | N3 | — |
| ItemView wrapper / view-type identity | ✓ (`vaultman-frame`) | ✓ (main frame + tab view-types) | — (React root) | COMPARTIDA | ADOPT-sandbox | Surface (leaf-tab) | native | N3 | — |
| Frame como controller (estado page-scoped, no god) | ~ (god component) | ✓ (frameVaultman ensambla servicios) | ~ (root state object) | OVERLAP | RESHAPE | Surface · Scene contract | polish | N3 | stable god-frame = weakness |
| Product identity = app shell en Obsidian | ~ (side panel) | ✓ (multi-surface shell) | ~ (standalone scene shell) | OVERLAP | RESHAPE | Surface · WorkspaceMediator | polish | N3 | preservar launch simple + surfaces ricos |
| Plugin-level mutable hooks (mounted-component actions) | — | ✓ (overlay/diff/FnR hooks) | — | SOLO-SANDBOX | ADOPT-sandbox | Navigation · WorkspaceMediator | flag | N3 | lifecycle de hooks pendiente |

## Tabla — Pages y page-order / dock

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Frame pages (ops/statistics/filters) | ✓ | ✓ (framePages.ts) | ✓ (stats/filters/tools) | COMPARTIDA | ADOPT-sandbox | Surface (Page=editor-group) | polish | N3 | ADR 0007; page key interno ≠ label |
| Page-order persistido + reorder long-press | ✓ (setting) | ✓ (FrameNavigationService) | ✓ (reorder mode) | COMPARTIDA | ADOPT-sandbox | LayoutModel · PSS (layout facet) | polish | N3 | reorder afecta dock/tabs/toolbar juntos |
| Dock normalizado a Data+Statistics (Files→Tabs menu) | ✓ (SDF-012) | — (dock filter-tabs) | — | SOLO-STABLE | MAP | LayoutModel · PSS (layout facet) | native | N3 | `pageOrder=['filters','statistics']` |
| Migración legacy page-order `ops` | ✓ (`resolveDockPageOrder()`) | — | — | SOLO-STABLE | ADOPT-stable | LayoutModel · PSS migration | native | N1 | gate de migración |
| Dock defaults OFF (Filters/Queue/Statistics en Tabs menu) | ✓ (SDF-016) | ~ (dock configurable) | — | OVERLAP | MAP | LayoutModel · scenesManagerScene | native | N3 | — |
| Page FAB definitions (multi-click gestures) | ~ (FAB via frame) | ✓ (framePages FAB defs) | ✓ (dualFAB/pill nav) | OVERLAP | ADOPT-sandbox | Overlay (bars) · ActionNode | polish | N3 | — |
| FAB doubleClickAction (clear filters) | ✓ (SDF-012) | ✓ | ✓ | COMPARTIDA | ADOPT-sandbox | Overlay · ActionNode | polish | N3 | — |
| Dock presentation: bar vs drawer (corner/dir) | — | ✓ (serviceLayout dock mode) | ✓ (pill/dualFAB/drawer) | OVERLAP | ADOPT-sandbox | LayoutModel · PSS (layout facet) | polish | N3 | — |

## Tabla — Navegación entre tabs (paginación Z)

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Filter tabs (props/files/tags/content/outline) = paginación Z | ✓ (props/files/tags+content) | ✓ (5 tabs) | ✓ (reorderables) | COMPARTIDA | ADOPT-sandbox | Surface (Z-stack de scenes) | polish | N3 | tabs internos VM = paginación Z (§9) |
| Tab navigation vocabulary (interno vs user-facing) | ✓ (filters→Data, ops→Files) | ~ (labels traducidos) | — | SOLO-STABLE | ADOPT-stable | Navigation · LayoutModel | native | N3 | §06.03: NO renombrar keys internos sin migración |
| Surface items / tab-id taxonomy abstraction | — | ✓ (surface items, dock/top external ids) | — | SOLO-SANDBOX | ADOPT-sandbox | Navigation · WorkspaceMediator | flag | N3 | — |
| Tab-switch perf (sin cold remount, sin offset jump) | ✓ (SDF-014: panes persistentes) | ~ (remount pressure) | — | CONTRADICE | ADOPT-stable | Surface · render-runtime | native | N2 | FPS 20→60; display-toggle + idempotent setters |
| In-flow transition offset fix (sin keyed fade) | ✓ (SDF-014 guard) | ~ (sin guard) | — | SOLO-STABLE | ADOPT-stable | Surface · render-runtime | native | N2 | — |
| Cross-tab search state routing (por-tab) | ✓ (SDF-014: filtersSearchByTab) | ~ | ~ (local) | OVERLAP | ADOPT-stable | Navigation · Scene contract | native | N2 | — |

## Tabla — Islands / overlay routing

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Popup overlay router (1 shell, N popups) | ✓ (PopupOverlay.svelte) | ✓ (overlay + controller) | ~ (popups.jsx legacy) | COMPARTIDA | ADOPT-sandbox | Overlay (popover/cmenu) | polish | N2 | — |
| FrameOverlayController (popup state + command hooks) | ~ (frame callbacks) | ✓ | ~ (event scatter) | OVERLAP | ADOPT-sandbox | Overlay · WorkspaceMediator | polish | N2 | — |
| Queue island + active-filters island | ✓ | ✓ | ✓ (V4 islands) | COMPARTIDA | RESHAPE | Scene (queueScene/filterScene) | polish | N2 | islas = Scenes preset-agnósticas |
| Island = Scene preset-agnóstica (no modal) | — | ~ (islands stateful) | ✓ (StackIsland float/resize/mini) | SOLO-PROTO | RESHAPE | Scene · StackIsland primitive | polish | N2 | — |
| Search island (search/create/replace chips) | ~ (ops-local) | ✓ (FnR island) | ✓ | OVERLAP | RESHAPE | Scene (searchScene) | polish | N2 | — |
| Overlay state service + portals (foul detection) | — | ✓ (+ portal resolver) | — | SOLO-SANDBOX | ADOPT-sandbox | Overlay · Fragility Registry | flag | N2 | portal-misplaced/cross-window/dom-mimicry |
| Surface-action routing (event bridge `{id}`) | — | ✓ (vm-surface-action hooks) | ~ (`{id}` solo) | CONTRADICE | RESHAPE | Navigation · WorkspaceMediator | polish | N3 | icon-pack research pedía `{island,sceneId,surfaceId,anchorRect}` |
| Addons island (stats/markdown pane + quick switcher) | — | ✓ (AddonsIslandService) | — | SOLO-SANDBOX | DEFER | Scene (addons) · ForeignEmbed | flag | N3 | — |

## Tabla — Workspace tiles / splits (paginación X|Y; panel tree de scene)

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| i3-style panel tree (split leaf recursivo) | — | — | ✓ (vmSplitLeaf/vmCloseLeaf) | SOLO-PROTO | RESHAPE | WSA · Scene tile-tree | flag | N3 | scene-level tile-tree = i3 del proto (§9) |
| Split X|Y (paginación espacial) | — | ~ (layout drop → split (inf)) | ✓ (dir h/v) | SOLO-PROTO | RESHAPE | WSA (paginate X\|Y) | flag | N3 | interior surfaces = dominio VM |
| Close focused panel (collapse a sibling, nunca último) | — | — | ✓ | SOLO-PROTO | RESHAPE | WSA · Scene tile-tree | flag | N3 | — |
| Panel config snapshots (inactive: tab/view/sort) | — | — | ✓ (state.panelCfg) | SOLO-PROTO | RESHAPE | PSS (workspace facet) · PanelHandle | flag | N3 | nuevo sibling hereda snapshot del focused |
| Focused panel (tools mutan last-focused) | — | ~ (active panel API) | ✓ (state.focusedPanel) | OVERLAP | RESHAPE | WorkspaceMediator (active-context) | flag | N3 | — |
| Panel split render (.vm-panel/.vm-panelsplit fill) | — | — | ✓ | SOLO-PROTO | RESHAPE | WSA · render-runtime | flag | N3 | regresión CSS documentada: `flex:1 1 0` |
| Workspace split single-tile fill regression | — | — | ✓ (CSS fix doc) | SOLO-PROTO | MAP | WSA · render-runtime | polish | N3 | — |
| Layout drop actions (detach/attach/move/reorder) | — | ✓ (applyLayoutDropAction) | ~ (panel DnD feel) | OVERLAP | ADOPT-sandbox | WSA · InteractionPolicy | flag | N3 | — |
| Tab surface dock/top-tabs/workspace | — | ✓ (serviceLayout) | ~ | SOLO-SANDBOX | ADOPT-sandbox | WSA · LayoutModel | flag | N3 | workspace surface = árbol nativo Obsidian |
| WSA pan/zoom/rotate + Live Redesign | — | ~ (redesign_mode cells) | ~ (canvas viewport) | OVERLAP | DEFER | WSA (Layout Design API) | flag | N3 | xyz/layers del whiteboard |

## Tabla — Scenes en surface propio (ex-detached) + TabId registry

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Canonical TabId registry (8 identidades) | — | ✓ (tabRegistry.ts verificado) | — | SOLO-SANDBOX | ADOPT-sandbox | Surface · Scene contract | flag | N2 | explorer-files/tags/props/values · content · explorer-outline · page-tools · queue |
| Scene montada en surface propio (ex-"tab detached") | — | ✓ (LeafDetachService) | ~ (panel tree richer) | SOLO-SANDBOX | RESHAPE | Surface · WSA | flag | N2-N3 | detach = mover scene de Z-stack a surface nuevo del árbol X\|Y (§9) |
| Deterministic view-type per tab (`vaultman-tab-`) | — | ✓ (viewTypeFor verificado) | — | SOLO-SANDBOX | ADOPT-sandbox | Surface (leaf-tab) | native | N2 | restore-match |
| Inner-id ↔ canonical TabId mapping | — | ✓ (verificado) | — | SOLO-SANDBOX | ADOPT-sandbox | Surface · Navigation | flag | N2 | — |
| Persist detached state (`independentLeaves`) | — | ✓ (save/load, sanitiza ids) | ✓ (panelCfg inactive) | OVERLAP | RESHAPE | PSS (workspace facet) | flag | N2-N3 | — |
| Restore on layout-ready (idempotente) | — | ✓ (restore once + guard) | — | SOLO-SANDBOX | ADOPT-sandbox | WorkspaceMediator · WSA | flag | N2 | restore idempotence + mobile pendiente (§025) |
| DetachedTabHost (render + local state) | — | ✓ | — | SOLO-SANDBOX | RESHAPE | Surface · Scene contract | flag | N2 | — |
| Detach via DnD (detach-tab/attach-tab/move-surface) | — | ✓ | ~ (stack/window DnD) | OVERLAP | ADOPT-sandbox | WSA · InteractionPolicy | flag | N3 | — |
| Mode toggle desktop/sidebar/both | — | — | ✓ | SOLO-PROTO | **DROP** | — (frame único responsive) | n-a | N3 | delta §006/§024 + umbrella v1 lo dropearon; re-mostrado con evidencia |

## Tabla — Dashboard / responsive

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Dashboard mode (main-leaf + width>=800 + no-thin) | — | ✓ (resolveDashboardEnabled verificado) | ~ (desktop mode stale) | OVERLAP | ADOPT-sandbox | LayoutModel · capability-profile | polish | N3 | — |
| FrameDashboardShell (3-column) | — | ✓ | ~ (desktop.jsx stale) | SOLO-SANDBOX | ADOPT-sandbox | Scene (dashboard-panel) | polish | N3 | — |
| Viewport controller (width measure → collapse) | ✓ | ✓ | — | COMPARTIDA | ADOPT-sandbox | LayoutModel · render-runtime | polish | N3 | — |
| Adaptive shell (sidebar vs main-pane) | — | ✓ | ✓ (mode toggle) | OVERLAP | RESHAPE | LayoutModel · capability-profile | polish | N3 | frame único responsive |
| Statistics card → Data tab routing | ✓ (SDF-016) | ~ (openStatsNotes) | ~ (cards estáticos) | OVERLAP | ADOPT-stable | Navigation · WorkspaceMediator | polish | N3 | preserva filtros, cierra islands |

## Tabla — Modos de frame del proto (DROP) + control island

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Frame mode selection (sidebar/desktop/both) | — | — | ✓ | SOLO-PROTO | **DROP** | — | n-a | N3 | DROP confirmado; evidencia proto §09 |
| Both-mode sidebar+companion render | — | — | ✓ | SOLO-PROTO | DROP | — | n-a | N3 | absorbido por dashboard responsive |
| Desktop monitor 16:9 shell | — | — | ~ (desktop.jsx STALE) | SOLO-PROTO | DROP | — | n-a | N3 | stale vs view taxonomy |
| Control island = global personalization center | — | ~ (theme service + settings) | ✓ (5 columns) | OVERLAP | MAP | Scene (config_scene) · PSS | polish | N3 | traducir a settings/surface services |
| ControlWorkspaceSection (split/close panel controls) | — | — | ✓ (panelOps) | SOLO-PROTO | RESHAPE | Scene (config) · WSA | flag | N3 | — |

## Tabla — Mobile / phone navbar

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Bottom nav pill + FAB (visual signature) | ✓ (navbarPillFab) | ✓ (FrameNavbarShell) | ✓ (pill/dualFAB/drawer) | COMPARTIDA | ADOPT-sandbox | Overlay (bars) | polish | N3 | — |
| Phone minimal navbar espeja Core Files geometry | ✓ (session-log 06-09) | ~ (sin paridad doc) | — | SOLO-STABLE | ADOPT-stable | Overlay · render-runtime | native | N3 | `nav-buttons-container` absolute bottom 56px/44px |
| Minimal page icons (`workspace-tab-header-inner`) | ✓ | ~ | — | SOLO-STABLE | ADOPT-stable | Overlay · Style (native preset) | native | N3 | commit d99a493 |
| Mobile/platform gate (`isDesktopOnly:false`) | ~ (manifest, sin gate) | ~ (manifest, desktop-heavy) | ~ (design desktop-heavy) | CONTRADICE | DEFER | capability-profile · PlatformAdapter | flag | N0-N3 | bloquea stable promotion sin gate (§024) |
| NavbarTabs minimal vs tabbar surfaces | ✓ (SDF-012) | ✓ | ✓ (tabs-as-chip) | COMPARTIDA | ADOPT-sandbox | Overlay (bars) · LayoutModel | polish | N3 | — |

## Tabla — Status bar

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Bottom status bar (count ledger) | ✓ (componentStatusBar.ts) | ~ (frame stats) | — | SOLO-STABLE | ADOPT-stable | Overlay (statusbar) · Scene | native | N3 | total/filtered/selected/queued counts; "no regresar" |
| Status-bar anchored pop-up (MySnippets pattern) | — | ~ (overlay state) | ✓ (StackIsland anchor) | SOLO-PROTO | DEFER | Surface (pop-up) | polish | N2 | glossary: pop-up = Surface desde statusbar |
| Frame stats update (selected/queued/filter counts) | ✓ | ✓ | ✓ | COMPARTIDA | ADOPT-sandbox | Overlay · Scene contract | polish | N3 | — |

## Conflictos detectados

1. **Tab-switch performance (CONTRADICE)** — Stable 1.1.1 (SDF-014) resolvió FPS collapse + offset jump con panes persistentes + idempotent setters + sin `{#key}`/fade. Sandbox (paginación Z) tiene remount pressure sin resolver. El render-runtime destino debe heredar el fix de stable. FPS 20-34 → 46-60 documentado.
2. **Surface-action routing metadata (CONTRADICE)** — Proto dispatcha `{id}` pelado; su propia icon-pack-research pedía `{island, sceneId, surfaceId, anchorRect}`. Sandbox tiene hooks pero event scatter. WorkspaceMediator necesita contrato de routing completo.
3. **Mode toggle desktop/sidebar/both (DROP re-mostrado)** — Solo proto lo tiene; delta §024 + umbrella v1 lo droparon → frame único responsive. desktop.jsx además STALE.
4. **Mobile/platform gate (CONTRADICE, no resuelto)** — Tres streams declaran `isDesktopOnly:false` sin gate real. Bloquea promotion (§024). Único avance concreto = phone navbar parity de stable. Restore de Scenes-en-surface-propio en mobile = pendiente (§025).
5. **Detach vs panel-tree (gradiente de madurez)** — Sandbox: detach real (Z→X|Y). Proto: panel-tree i3 scene-level. §025: no saltar de stable a full panel tree. Escalonado: ADOPT-sandbox detach (N2) → RESHAPE panel-tree (N3 flag). Dos dominios de propiedad (§13).
6. **Island ownership (OVERLAP triple)** — Stable imperativo · sandbox stateful+controller · proto StackIsland primitive. Glossary resuelve: islas = Scenes preset-agnósticas; look flotante = preset polish only. RESHAPE hacia *Scene.

## Cobertura

**Leído:** delta matrix §006/§024/§025 (+§003/§004; §026-050 fuera de cluster salvo §029 citado); shard 04 §08/§09/§11/§12/§13 (líneas 1-1484; §16-§31 fuera); shard 02 full; shard 03 §012-§020/§044-§046/§068-§072/§083-§085; SDF-012/014/016 full; glossary full; explorer-model/index full; PSS notes full (§9/§13); pyramid full; shard 06 §06.03; session-log 2026-06-09 mobile.

**Verificado en código (sandbox):** `src/registry/tabRegistry.ts` (TabId 8, DETACHABLE, viewTypeFor, mappings; spec ref `04-independent-leaves.md` wave 2) · `src/services/serviceLayout.ts` (resolveDashboardEnabled, LayoutViewportKind).

**No leído:** shard 04 líneas 1485+ (clusters 02/06); shard 03 §021-067/§073-104 (otros clusters); SDF 001-011/013/015; FrameNavigationService/FrameOverlayController/serviceLeafDetach/frameVaultman.svelte en código (citados vía shard 03).

**Marcas:** `(inf)` en "Frame como controller" y "search local"; sin `(sin evidencia)` necesarias.
