---
title: Ledger cluster 07 — Bindings nativos, node-notes/marks, cmenu, DnD y NIB
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
  - operations/dnd
---

# Cluster 07 — Bindings nativos, node-notes/marks, context menus, DnD y NIB

**Nota del coordinador (importante):** el subagente reportó como "ausentes" varios docs (`session-log.md`, shard 06, SDF-016, backlog scorecard) que SÍ existen en este árbol — su entorno de globs falló o apuntó distinto. Sus filas basadas en **código del tag `1.1.1`** (verificación `git show`) son la evidencia más fuerte del ledger y SUPERAN al delta-matrix (escrito contra 1.0.1). Una discrepancia real queda flagueada abajo (adapter Core Bases).

**Hallazgo central:** el oráculo stable 1.1.1 real es MUCHO más rico en DnD/cmenu de lo que los shards de research documentaban: `dragPayload.ts` / `dragFrontmatter.ts` / `dragEditorDrop.ts` (payloads tipados, inject a frontmatter con dedupe, append de tags a markdown), folder context menu (`_folderFromCtx`/`_queueFolderDelete`), multi-select vía active-filter selection, drag action guide overlay, delegación al menú nativo `file-menu` con supresión de reentrada — todo por `queueService.addOrRun`.

## Tabla — NIB / Input Bindings

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Evento→regla a scope ≥ panel/scene (no por-nodo) | — (click hardcoded) | ~ (node mouse actions setting) | ~ (window events `vm-*`) | OVERLAP | RESHAPE | Logic·NIB | flag | N1 | §15/§19: regla vive en scope; input×Node = — |
| Cuarteto evento→binding→ActionNode→Operation | — | — | — | SOLO-PROTO (inf) | DEFER | Logic·NIB→ActionProvider | flag | N1 | diseño nuevo del grill; ningún stream lo tiene |
| Mouse gesture binding (primary/secondary/tertiary, defer/immediate) | — | ✓ (serviceMouse) | ~ (long-press, dbl/right en reorder) | SOLO-SANDBOX | ADOPT-sandbox | Logic·InputRouter | polish | N1 | — |
| Node mouse actions (select/filter/open/node-note/delete) | — | ✓ (config + default + legacy) | ~ | SOLO-SANDBOX | ADOPT-sandbox | Logic·InputRouter | polish | N1 | — |
| Mouse gestures en toolbar (reset/cycle) | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | Logic·InputRouter | polish | N1 | — |
| Keyboard nav topology (linear/planar/planar-drill, type-ahead) | — | ✓ (serviceKeyboardNav) | — | SOLO-SANDBOX | ADOPT-sandbox | Navigation·InputRouter | polish | N1 | view-mode aware |
| Keymap configurable / remap UI | — | ~ (controller sin remap UI) | — | SOLO-SANDBOX | RESHAPE | Logic·InputRouter | flag | N2 | remap UI = detachable-module input-remap (ADR 0011) |
| Input×Panel (focus model) | — | — | — | — | DEFER | Logic·InputRouter | n-a | n-a | celda diferida a P.D (D-PSS-1) |
| Input×Scene (binding contexts por scene focada) | — | ~ (hooks panel-scoped) | ~ (focusedPanel/Island) | OVERLAP | RESHAPE | Logic·NIB | flag | N2 | — |
| NIB conduciendo ops del árbol nativo (resize/move grupos) | — | ~ (layout drop ops) | ~ (i3 panelOps mock) | OVERLAP | DEFER | Navigation·NIB | flag | N3 | §13: donde la API nativa lo permita |

## Tabla — ActionNodes / command registration

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Command palette registration | ~ (open + apply-queue) | ✓ (8 comandos: open/filters/queue/process/view/sort/diff/FnR) | — | OVERLAP | ADOPT-sandbox | Logic·ActionProvider | native | N1 | — |
| Commands PerfMeter-wrapped | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | Logic·ActionProvider | polish | N1 | — |
| `checkCallback` availability | ~ | ✓ (via active leaf) | — | OVERLAP | ADOPT-sandbox | Logic·ActionProvider | native | N1 | — |
| Plugin-level mutable hooks → Svelte montado | — | ✓ (activeFnRIslandService, activePanelExplorerApi, openX) | — (event scatter) | SOLO-SANDBOX | RESHAPE | Logic·ActionProvider | flag | N2 | lifecycle gate |
| Open: reveal existing leaf + focus first row | ✓ | ✓ | — | COMPARTIDA | ADOPT-sandbox | Navigation·ActionProvider | native | N0 | open-path contract |
| ActionNode como verbo unificado (ADR 0005) | — (ActionDef imperativo) | ~ (rowAction/provider actions) | ~ (cmenu onAction ids) | OVERLAP | RESHAPE | Logic·ActionProvider | flag | N2 | "Actions produce Operations" |
| Surface action dispatch (`vm-surface-action`) | — | ~ (Addons/command bridge) | ✓ (`{id}` solo) | OVERLAP | MAP | Logic·ActionProvider | polish | N3 | routing incompleto del proto |

## Tabla — Context menus

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| ContextMenuService (Obsidian Menu) | ✓ (registry ActionDef) | ✓ (serviceCMenu) | ~ (div clamp) | COMPARTIDA | ADOPT-sandbox | Navigation·ContextMenuService | native | N1 | — |
| Panel menu vía `file-menu` nativo (delegación + supresión reentry) | ✓ (`openPanelMenu`) | ~ (provider context) | — | OVERLAP | ADOPT-stable | Navigation·ContextMenuService | native | N1 | menú nativo REAL en 1.1.1 |
| `_removeNativeFileMoveActions` (curar items nativos) | ✓ | — (inf) | — | SOLO-STABLE | ADOPT-stable | Navigation·menu-curator | native | N1 | evita doble "move to" |
| Menu curator (hide/curate rules) | ✓ (MenuHideRule substring) | ✓ (MenuCuratorPanel) | — | COMPARTIDA | ADOPT-sandbox | Navigation·menu-curator | native | N1 | — |
| Folder context menu (delete/filter folder) | ✓ (`_folderFromCtx`, `_queueFolderDelete`, `_filesInsideFolder`) | ~ (folder filter action) | ~ (Move to folder) | OVERLAP | ADOPT-stable | Navigation·ContextMenuService | native | N1 | 1.1.1 real; research 1.0.1 no lo tenía |
| `clean_selection` cmenu action | ✓ (when children>0) | ~ (clear en island) | — | OVERLAP | ADOPT-stable | Navigation·ActionProvider | native | N1 | — |
| Standard node action set (10 acciones) | ~ (vía modals) | ~ (context + hover badges) | ✓ (ContextMenuV2 completo) | OVERLAP | RESHAPE | Navigation·ActionProvider | polish | N2 | canon polish del set |
| Multi-select cmenu (batch sobre selección) | ~ (drag-selection sí; cmenu batch inf) | ~ (selection + scope) | ~ (selmode) | OVERLAP | RESHAPE | Navigation·ContextMenuService | polish | N2 | multi-select = Axon scope |
| Iconic bridge | ✓ | ✓ | ~ (packs) | COMPARTIDA | ADOPT-sandbox | Logic·Fragility Registry | native | N1 | bridge frágil → PlatformAdapter |
| Linter bridge (executeCommandById externo) | ✓ (modalLinter) | — (inf) | — | SOLO-STABLE | RESHAPE | Logic·Fragility Registry | flag | N2 | toca settings de otro plugin |

## Tabla — Adapter Core Bases multi-select (⚠️ discrepancia)

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Adapter defensivo Core Bases multi-select (batch ops) | — (no hallado en src del tag) | — (BasesImport solo filtros) | — | ⚠️ DISCREPANCIA | DEFER | Logic·Fragility Registry | flag | N2 | SDF-016 (existe en ESTE árbol) lo describe como landed; el agente NO lo encontró en `1.1.1:` src. Verificar: nombre/archivo distinto, o post-tag, o doc sobre-declaró. NO resolver sin code-check dirigido |
| DnD payloads Vaultman en filas nativas Core | ~ (en explorers VM) | ~ (NativeSurfaceBinding) | — | OVERLAP | DEFER | DndService·Fragility Registry | flag | N2 | — |

## Tabla — DnD subjects / operaciones

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Subjects: node/row/group/column/tab/filter/card | — (solo file/folder/tag/prop) | ✓ (7 subjects) | ~ (cell/stack/window/panel) | OVERLAP | ADOPT-sandbox | DndService·Axons | flag | N2 | gate de reconciliación |
| Op reorder | — | ✓ | ✓ (StackRow, ManualMasonry) | OVERLAP | ADOPT-sandbox | DndService·Axons | polish | N2 | — |
| Op move (file→folder) | ✓ (`_moveDraggedNodesIntoFolder`→renameFile) | ✓ | ~ (cmenu) | COMPARTIDA | ADOPT-stable | Operations·DndService | native | N2 | verificado: drop real mueve archivo |
| Op apply-template | — | ✓ | — | SOLO-SANDBOX | DEFER | Operations·DndService | flag | N2 | — |
| Op detach-tab / attach-tab / move-tab-surface | — | ✓ | ~ (window feel) | OVERLAP | ADOPT-sandbox | Navigation·DndService | flag | N2 | liga independent leaves |
| Op move-block (block a chains inmutables) | — | ✓ (buildMoveBlockOps) | — | SOLO-SANDBOX | RESHAPE | Operations·DndService | flag | N2 | — |
| Tag drag→editor (append markdown) | ✓ (dragEditorDrop, línea-vacía aware) | ✓ (alias-aware) | — | COMPARTIDA | ADOPT-stable | Operations·DndService | native | N2 | — |
| Prop/value drag→frontmatter inject | ✓ (array-merge + scalar dedupe) | ✓ | — | COMPARTIDA | ADOPT-stable | Operations·DndService | native | N2 | — |
| File drag→wikilink/embed | ~ (wikilink en text/plain) | ✓ (distingue embed/link) | — | OVERLAP | ADOPT-sandbox | Operations·DndService | native | N2 | — |
| Drag action guide overlay | ✓ (showDragActionGuide) | ~ (inf) | ~ | OVERLAP | ADOPT-stable | Navigation·DndService | polish | N2 | UX feedback 1.1.1 |

## Tabla — DnD payloads

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Custom MIME payload | ✓ (`application/x-vaultman-node`) | ✓ (`application/vnd.vaultman.node+json`) | — | CONTRADICE | RESHAPE | DndService·Axons | flag | N2 | MIME difiere — unificar contrato (mostrar) |
| text/plain fallback | ✓ (wikilink/`#tag`/folder) | ✓ | — | COMPARTIDA | ADOPT-sandbox | DndService·Axons | native | N2 | — |
| text/markdown payload | — | ✓ | — | OVERLAP | ADOPT-sandbox | DndService·Axons | native | N2 | — |
| Payload kinds (file/folder/tag/property/property-value) | ✓ (union tipada) | ✓ (+snippet/plugin/adopted) | ~ (kind suelto) | OVERLAP | ADOPT-sandbox | DndService·Axons | flag | N2 | sandbox superset |
| Multi-select selection en payload | ✓ (activeFilterDragSelection) | ~ (manual ids) | ~ (Set) | OVERLAP | ADOPT-stable | DndService·Axons | native | N2 | selección desde filtros activos por surface (SDF-016) |
| Native file drag payload (Obsidian-compat) | ✓ (`_setNativeFileDragPayload`) | ~ | — | OVERLAP | ADOPT-stable | DndService·Fragility Registry | native | N2 | dual VM+nativo en mismo dragstart |
| Payload read/validate (typeguard) | ✓ | ~ (convert dnd-kit) | — | OVERLAP | ADOPT-stable | DndService·Axons | native | N2 | — |

## Tabla — DnD caminos duplicados (N2 gate)

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| DnD core (serviceDnd) | — | ✓ (phases/positions/ops/reject) | — | SOLO-SANDBOX | ADOPT-sandbox | DndService·Axons | flag | N2 | base de reconciliación |
| Alias-aware DnD | ~ (equivalente inline) | ✓ (drop effects semánticos) | — | OVERLAP | RESHAPE | DndService·Axons | flag | N2 | — |
| dnd-kit adapter (`@dnd-kit/svelte`) | — | ✓ | — | SOLO-SANDBOX | RESHAPE | DndService·Axons | flag | N2 | — |
| Manual DnD service | ✓ (el DnD de stable ES manual/imperativo) | ✓ (toggle que envuelve DndService) | — | CONTRADICE | RESHAPE | DndService·Axons | flag | N2 | "manual" significa cosas distintas por stream |
| Reconciliación core↔alias↔dnd-kit↔manual | — | ~ (4 paths conviven) | — | OVERLAP | RESHAPE | DndService·Axons | flag | N2 | DO_NOT_PROMOTE_AS_IS (§030); stable logra equivalente con UN camino + utils puros |
| Block move en dnd-kit + manual (doble staging) | — | ~ | — | OVERLAP | RESHAPE | Operations·DndService | flag | N2 | — |

## Tabla — Node-notes / binding notes

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| NodeBindingService (alias-match) | — | ✓ (tag/prop/value/folder/snippet/template/plugin) | — | SOLO-SANDBOX | ADOPT-sandbox | Logic·NodeBindingService | flag | N1 | diferenciador de producto |
| Alias tokens por kind (`[prop]` `#tag` `$snippet` `%plugin`) | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | Logic·NodeBindingService | flag | N1 | — |
| Abrir/crear binding note (0→crear, 1→abrir, N→filtro) | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | Logic·NodeBindingService | flag | N1 | notas existentes no se mutan |
| Binding note folder setting | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | Logic·NodeBindingService | flag | N1 | — |
| Multi-alias → filter routing | — | ✓ (`aliases has <token>`) | — | SOLO-SANDBOX | ADOPT-sandbox | Logic·NodeBindingService | flag | N1 | riesgo: alias duplicados |
| Hover link source (`vaultman-native-surface`) | — | ✓ (solo si 1 match) | — | SOLO-SANDBOX | ADOPT-sandbox | Logic·NodeBindingService | flag | N1 | — |
| Binding note action en providers | — | ✓ (props/tags/plugins/snippets) | — | SOLO-SANDBOX | ADOPT-sandbox | Navigation·ActionProvider | flag | N1 | — |

## Tabla — Native surface binding vs click interceptor (dual N2 gate)

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| NativeSurfaceBindingService (capture listeners) | — | ✓ (click/auxclick/mouseover) | — | SOLO-SANDBOX | RESHAPE | Logic·Fragility Registry | flag | N2 | selectores DOM nativos = drift |
| Selectores tag (pane/links/pills/CodeMirror hashtags) | — | ✓ | — | SOLO-SANDBOX | RESHAPE | Logic·Fragility Registry | flag | N2 | PlatformAdapter + probe |
| Selectores folder (nav-folder-title/data-path/breadcrumbs) | — | ✓ | — | SOLO-SANDBOX | RESHAPE | Logic·Fragility Registry | flag | N2 | — |
| Binding click modifiers (meta/ctrl/alt/middle) | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | Logic·InputRouter | flag | N2 | — |
| Native click interceptor (camino VIEJO) | — | ✓ (`vm:open-node-note`) | — | SOLO-SANDBOX | DROP | Logic·Fragility Registry | flag | N2 | reconciliar con NativeSurfaceBinding (§028 DO_NOT_PROMOTE_AS_IS) |
| Reconciliación surface-binding ↔ interceptor | — | ~ (dos paths conviven) | — | OVERLAP | RESHAPE | Logic·Fragility Registry | flag | N2 | registry de selectores nativo |

## Tabla — Marks / bookmarks

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| serviceMark (capa durable por nodo) | — | ~ (contrato ViewMarkLayer en typeViews; SIN servicio — ver cluster 06) | — | SOLO-SANDBOX (inf) | RESHAPE | Logic·serviceMark/MarksProvider | flag | N2 | storage sin verificar |
| position-mark (cursor/selección exacta) | — | — | — | SOLO-PROTO (sin evidencia) | DEFER | Logic·serviceMark | flag | N2 | "real bookmarks" (D-PSS-10); spec propio |
| style-mark (carpeta amarilla) | — | ~ (node backgrounds/borders settings) | ~ (folderAccent) | OVERLAP | RESHAPE | Logic·serviceMark | flag | N2 | — |
| pin-mark / size-mark | — | ~ (size-marks en render-projection) | ~ (`--node-scale`) | OVERLAP | DEFER | Logic·serviceMark | flag | N2 | taxonomía pendiente (Q-PSS-9) |
| marks_scene (Scene sobre MarksProvider) | — | — | — | (sin evidencia) | DEFER | Navigation·MarksProvider | flag | N2 | reinterpreta Bookmarks core |
| Captura posición editor (offset) / canvas (coords) | — | — | ~ (CanvasViewport xyz) | OVERLAP (inf) | DEFER | Logic·serviceMark | flag | N2 | liga xyz whiteboard |
| serviceMark ↔ PSS boundary (marks.json) | — | ~ (inf) | — | (sin evidencia) | DEFER | Logic·serviceMark | flag | N1 | D-PSS-6 |

## Tabla — Gestures avanzados (platform-gated)

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Long-press | ~ (page reorder) | ~ (defer timing) | ✓ (reorder mode, apply filters) | OVERLAP | RESHAPE | Logic·InputRouter | flag | N4 | touch-gated |
| Swipe / slide | — | — | — | (sin evidencia) | DEFER | Logic·InputRouter | flag | N4 | gesture intake 2026-05-28 |
| Shake / accelerometer | — | — | — | (sin evidencia) | DEFER | Logic·InputRouter | flag | N4 | mobile-only |
| InputBindingNode (gesture→command) | — | ~ (serviceMouse base) | ~ (vocab) | OVERLAP | DEFER | Logic·NIB | flag | N4 | glossary DEFERRED |
| Platform gate para gestures | — | ~ | ~ | CONTRADICE | RESHAPE | InteractionPolicy·PlatformAdapter | flag | N0 | gate requerido |

## Conflictos detectados

- **MIME de payload DnD (CONTRADICE):** `application/x-vaultman-node` (stable) vs `application/vnd.vaultman.node+json` (sandbox). Unificar contrato DataTransfer al reconciliar.
- **"Manual DnD" = cosas distintas (CONTRADICE):** en stable ES el camino imperativo único; en sandbox es un toggle que envuelve DndService y coexiste con dnd-kit.
- **Cuatro caminos DnD en sandbox (N2 gate):** core · alias-aware · dnd-kit · manual — DO_NOT_PROMOTE_AS_IS. Dato clave: stable 1.1.1 logra equivalencia funcional con UN camino + utils puros (dragPayload/dragFrontmatter/dragEditorDrop) — candidato a simplificar la reconciliación.
- **Dos caminos de native binding (N2 gate):** NativeSurfaceBindingService vs click interceptor viejo.
- **El delta-matrix subestima a stable 1.1.1:** folder cmenu, multi-select drag, bridges — el ledger corrige celdas que el matrix marcaba SOLO-SANDBOX y en realidad son COMPARTIDA/ADOPT-stable (el matrix se escribió contra 1.0.1).
- **`getAbstractFileByPath` unsafe-argument confirmado** en `1.1.1:explorerFiles.ts:784` (`_moveDraggedNodesIntoFolder`) y `:856` — coincide con el backlog scorecard 2026-06-09.
- **⚠️ Adapter Core Bases multi-select — DISCREPANCIA doc↔código:** SDF-016 (que SÍ existe en este árbol) lo describe como landed; el agente no lo halló en `1.1.1:` src ni en sandbox. Verificación dirigida pendiente (nombre/archivo distinto, post-tag, o doc sobre-declaró).

## Cobertura

- **Código verificado (tag `1.1.1`):** `dragPayload.ts`, `dragFrontmatter.ts`, `dragEditorDrop.ts`, `serviceContextMenu.ts`, `typeCMenu.ts`, `explorerFiles.ts` (DnD source/drop/move/folder-cmenu), `explorerProps.ts`, `explorerTags.ts`. Sandbox: planes §069-080 del shard 03 (NodeBinding, NativeSurface, NativeClick, DnD core/block/alias/adapter/manual, keyboard, mouse, cmenu, rowAction) + §096 risks.
- **Shards leídos:** delta-matrix §028-§030 (+continuación post-1651) · shard 02 (1.0.1 cmenu/curator/bridges) · proto §09/§18/§24 · glossary (Axon/ActionNode/action-cell/gestures/NIB) · umbrella 01 (D-PSS-1/10) y 05 (§13/§15/§19/§21).
- **Caveat de entorno del subagente:** reportó ausentes docs que existen en este árbol (session-log, shard 06, SDF-016-dnd, backlog) — sus filas doc-only se marcaron `(sin evidencia)` y el coordinador las re-ancló donde este árbol tiene la fuente (p.ej. multi-select selection payload ← SDF-016 + código `activeFilterDragSelection` que el propio agente verificó).
- **Filas:** 64.
