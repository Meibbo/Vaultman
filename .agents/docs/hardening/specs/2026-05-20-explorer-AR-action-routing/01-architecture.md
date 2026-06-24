---
title: A.R Architecture — A1, servicios, intent seam, topology, estado-actual
type: spec-shard
status: draft
parent: "[[index|A.R Action Routing]]"
created: 2026-05-20T00:00:00
updated: 2026-05-20T00:00:00
---

# Architecture

## Approach A1 (loqueado)

Dos servicios puros nuevos + ediciones quirúrgicas. Sin NodeRow, sin decomposition.

```
serviceKeyboardNav.ts   ← state machine WAI-ARIA tree, topology-aware (extrae lógica de panelExplorer)
serviceRowAction.ts     ← builder Melt-UI; expone resolveActionIntent + prop-bags
        │                  consume: serviceKeyboardNav + serviceSelection + serviceMouse + mouseConfig
        ▼ prop-bags spreadeadas sobre el markup EXISTENTE
viewTree · ViewNodeList · ViewNodeTable · ViewNodeGrid · ViewNodeCards
        ▲
ViewHost (contrato angostado a UNA familia (id, MouseEvent))
        ▲
panelExplorer (deriva projection + orderedIds; borra el bridge sintético de list)
```

Por qué A1 y no centralizar en ViewHost (A2): ViewHost ya es god-seam (278 LoC, 2 contratos);
esconder el contrato dentro de un componente lo empeora, lo deja solo component-testable (no jsdom),
y pelea con la intención Melt-UI (los builders se consumen DESDE el markup). Por qué no NodeRow ya
(A3): viola el non-goal (NodeRow = N.R). Los builders son funciones puras → Tier-1 jsdom de T.G
los testea directo, y la adopción por-view es independiente → red-green limpio y paralelizable.

## Los dos servicios

### serviceKeyboardNav.ts (nuevo)

State machine que implementa el patrón **WAI-ARIA Tree View** + extensiones planar/drill. **No es
greenfield**: extrae y unifica la lógica que hoy vive en `panelExplorer.handleRowKeydown`
(panelExplorer.svelte:632-704) y sus helpers (`handleTreeArrowLeft/Right`, `handleGridNavigationKeydown`,
`handleInlineGridExpansionKeydown`, `handlePageNavigation`, `keyboardTargetId`), y rellena los gaps
(Home/End universal, type-ahead). Opera sobre `orderedIds` + estado de expansión + focus de
`serviceSelection`. Es **topology-aware** (ver abajo).

Hoy `serviceNavigation.svelte.ts` es page/tab routing ONLY — confirmado, no tiene row-keyboard. Por
eso `serviceKeyboardNav` es un servicio nuevo, no una extensión de `serviceNavigation`.

### serviceRowAction.ts (nuevo)

Builder estilo Melt-UI. Bound a una instancia de explorer (`explorerId` + projection). Expone:

- `getRowProps(id)` → prop-bag con `role`, `tabindex`, `aria-*`, `data-row-key`, y handlers
  (`onclick`/`onauxclick`/`oncontextmenu`/`onkeydown`).
- `getCaretProps(id)` → prop-bag del caret (toggle): `role`, `tabindex`, `aria-hidden`, `onclick`
  (con `stopPropagation` + toggle).
- `getKeyboardHandlers(id)` → `{ onkeydown }` que delega a `serviceKeyboardNav`.

Internamente resuelve el intent vía `resolveActionIntent` (seam) y traduce modifiers
(`{ctrl,shift,alt/meta}` → `{additive,range}` de `serviceSelection`). Detalle en [[02-contract-shapes]].

## Intent seam (extensible)

El corazón forward-compat. Un resolver surface-agnóstico:

```ts
interface ActionIntentQuery {
  surface: 'row' | 'caret' | 'button' | 'fab' | 'badge';
  gesture: 'click' | 'aux' | 'dblclick' | 'longpress' | 'swipe-left' | 'swipe-right' | 'drag' | 'hover';
  modifiers: { additive: boolean; range: boolean; alt: boolean };
  pointerType: 'mouse' | 'touch' | 'pen' | 'keyboard';
}
```

**v1.2.0 implementa**: `surface ∈ {row, caret}`, `gesture ∈ {click, aux, keyboard}`,
`pointerType ∈ {mouse, keyboard}`. El resto son uniones declaradas pero **no resueltas** (un default
`'ignored'` + `// reserved: <sub-system>` comment). Esto deja el seam abierto sin construir las
modalidades. Mapeo de homes futuros: hover/icon-swap → K.B + Theme Builder (10); FAB → Control Island
(6/12); touch swipe → Touch/Pointer pass; drag → DnD repair.

El resolver preserva la semántica de mouse existente: rutea por `resolveNodeMouseActions`
(serviceMouse.ts), cuyo default es **primary=`filter`**, secondary=`open`, tertiary=`delete`. A.R
unifica *ruteo*, no *comportamiento*: el click primario sigue filtrando, no se cambia a `select`.

## Modelo topology (keyboard 2D/3D)

`serviceKeyboardNav` recibe un descriptor de topology por view y rutea las teclas según él:

| Topology | Views | Ejes | Teclas |
|---|---|---|---|
| `linear` | tree, list, table | y (filas) + z (expand) | Up/Down, Home/End, Right/Left (expand/collapse en tree), Enter, Space, type-ahead |
| `planar` | grid, cards | x-y (geometría) + z | Up/Down/Left/Right por geometría, Home/End, Enter, Space, type-ahead |
| `planar-drill` | grid (folder/inline mode) | x-y + drill (3D) | planar + descend (Enter/Right en container → push plane) / ascend (Backspace/Left/Up → pop) |

El "3D" = `planar-drill`: reusa el folder-drill existente (`handleGridNavigationKeydown` +
`GridNavigationToolbar` back/fwd/up, panelExplorer.svelte:635/1271-1279) y el inline-expand existente
(`handleInlineGridExpansionKeydown`, panelExplorer.svelte:641/699+, gateado en
`gridHierarchyMode==='inline'` con `gridExpandedIds`). A.R consolida ambos en el servicio; no inventa
render nuevo. El render inline-expand del grid (2D node → row del que salen más nodes 2D) **ya existe**
y se preserva.

## Estado-actual

Mapa exacto de divergencias que A.R resuelve (refs verificadas 2026-05-20):

### Contrato del seam (ViewHost.svelte)

- Props 84-95: **Contract A** `(id, MouseEvent)` family — `onToggle`, `onRowClick`,
  `onPrimaryAction`, `onSecondaryAction`, `onTertiaryAction`, `onBoxSelect`, `onContextMenu`,
  `onRowKeydown`, `onSelectAll`, `onBadgeDoubleClick`, `onHoverBadgeAction`. La usan tree/table/grid/cards.
- Props 96-99: **Contract B** — `onSelect(row, {ctrl,shift,alt})`, `onActivate(row)`, `onFocus(id)`,
  `onListContextMenu(event, row)`. Solo ViewNodeList.
- Grid aliasea `onRowClick`→`onTileClick` (236), Cards `onRowClick`→`onCardClick` (267) — solo binding
  local, sin churn.
- ViewHost ya bridgea el cmenu de list: `handleListContextMenu(event,row)` → `onContextMenu(row.id,e)`
  (139-141, fallback en 184).

### Bridge sintético en el panel (panelExplorer.svelte)

- `handleListSelect(row, modifiers)` → `handleNodeClick(row.id, mouseEventFromListModifiers(modifiers))`
  (598-603). `mouseEventFromListModifiers` **fabrica un `MouseEvent`** (618-630) — el smell que A.R borra.
- `handleListActivate` (605-607), `handleListFocus` (609-612), `handleListContextMenu` (614-616):
  todos bridges de Contract B.
- ViewHost wiring del platform mount: 1281-1295 pasa AMBOS contratos (Contract A + `onSelect`/
  `onActivate`/`onFocus`/`onListContextMenu`). Mount único `mountContext="panel"` (1243). Markmap es
  un mount aparte y deferred (1218-1235).

### Selección (derivación de modifiers)

- `selectNode(id, e)` deriva `additive = e.ctrlKey || e.metaKey`, `range = e.shiftKey`, y llama
  `selectionService.selectPointer(provider.id, visibleNodeIds(), id, {additive, range})`
  (panelExplorer.svelte:511-519). `serviceSelection` ya es multi-select con anchor/focus/hover.
- A.R mueve esta derivación a `serviceRowAction.resolveActionIntent` para que sea idéntica en los 5 views.

### Keyboard (god-object + divergencias)

- `panelExplorer.handleRowKeydown(id,e)` (632-673): tree Arrow Left/Right, grid folder-drill, grid
  inline-expand, Up/Down (`moveFocus`), Page, Space (`toggleFocused`), Enter (secondary). **Falta
  Home/End + type-ahead.**
- `ViewNodeList.handleKeydown` (239-269): inline, Up/Down/Home/End/Page/Enter/Space — redundante y
  divergente con el panel. A.R lo elimina (subsumido por el servicio).
- Table: solo Ctrl+A (`handleTableKeydown`). Grid/Cards delegan a parent (`onTileKeydown`/`onCardKeydown`).

### Caret (viewTree.svelte)

- Rama 985-996: `div.vm-tree-toggle` con `onclick` (`stopPropagation` + `onToggle(id)`),
  `role="button"`, `tabindex="-1"`, `onkeydown={() => {}}` (no-op).
- Hoja 998-1001: `div.vm-tree-toggle.is-placeholder`, `aria-hidden`, sin handler.
- Hit-target 20px (`--vm-tree-toggle-size`, `_tree.scss`) < 24px WCAG 2.5.8.
- El placeholder de hoja YA es inerte y el click de fila YA funciona — verificado por
  `test/component/viewTreeSelection.test.ts:139` ("reserves the leading toggle slot for leaf rows
  without making it interactive") + los casos de row/label click. La queja "traga el click" del
  brainstorm fue diagnóstico impreciso; el defecto verificable es el **hit-target** (20px < 24px).
- Fix A.R: (1) clickable target del caret ≥24×24 CSS px (se padea el área; el icono sigue 16/20px →
  no rompe los asserts de `--vm-tree-icon-size`); (2) expand/collapse por teclado a nivel de
  **treeitem** (row) vía ArrowRight/Left — patrón WAI-ARIA, ya funciona vía
  `panelExplorer.handleRowKeydown`; (3) el caret de rama pasa a `aria-hidden` decorativo (afordancia de
  puntero) al adoptar `getCaretProps` (Task 6a del plan). El placeholder de hoja se deja como está.

### Expand/collapse-all (panelExplorer.svelte)

- `hasExpansionSurface = $derived(viewMode === 'tree' || viewMode === 'grid')` (137) — gate por viewMode.
- `nodeExpansionCommand` → `expandAllParents`/`collapseAllParents` (390-397, 830-836) sobre
  `collectExpandableNodeIds(nodes)`.
- Fix A.R: gate por **datos** (`hasExpandableRows`), propagar a todos los views; en grid `inline`
  rutear a `gridExpandedIds`.

### cmenu (serviceCMenu.ts + providers)

- `ContextMenuService` (serviceCMenu.ts) centraliza: `registerAction(def)` (57-60),
  `openPanelMenu(ctx, event)` (62-111), filtrado por `nodeType` + `surface` + `when`.
- Items registrados **per-provider** (`svc.registerAction({...})` en explorerFiles/Tags/Props/
  Snippets/Plugins/Content). Ej. explorerFiles: `file.rename`, `file.delete`, `file.set`, `file.move`,
  `folder.filter`...
- Panel: `handleContextMenu(id,e)` (588-596) selecciona primero, luego llama
  `provider.handleContextMenu(node, e, selectedNodesForContext(node))` — **segundo path** distinto del
  `openPanelMenu` del registry. A.R unifica el **trigger** (todos los views → `onContextMenu(id,e)`) y
  reconcilia los dos paths; el standard set vive en providers (verificar, no rebuild).
