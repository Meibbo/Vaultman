## 5. Modifier translation

Los views/eventos hablan `ctrl/shift/alt/meta`; `serviceSelection` habla `{additive, range}`.
Traducción única (vive en `serviceRowAction`, idéntica para los 5 views):

```ts
export function selectionModifiersFromEvent(e: MouseEvent | KeyboardEvent): { additive: boolean; range: boolean } {
  return {
    additive: e.ctrlKey || e.metaKey,   // Cmd en mac, Ctrl en el resto
    range:    e.shiftKey,
  };
}
// alt queda reservado para gesto auxiliar (serviceMouse), NO es modifier de selección.
```

Esto reemplaza la derivación duplicada en `panelExplorer.selectNode` (511-519) y el hack
`mouseEventFromListModifiers` (618-630).

## 6. Identidad de fila: `id` vs `callbackId`

`ExplorerRowInput` tiene `id` (semántico) **y** `callbackId` (serviceExplorerRowInput.ts:22-23).
table/cards ya despachan `callbackId`; tree/list despachan `id` (igual a `callbackId` en sources
`snapshot`/`tree-node`). **El contrato unificado estandariza en `callbackId`** como el `id` del
`(id, MouseEvent)`, y emite `data-row-key={callbackId}` en todos los views. T.G asserta presencia +
estabilidad de `data-row-key` (atributo estructural, no CSS class) → ancla anti-drift.

## 7. Consumo de feature flags (0-A)

`serviceRowAction` consume `ExplorerViewFeatureFlags` (serviceExplorerViewContract.ts:7-15;
`SHARED_FEATURES` = todo `true` para los 5 views) para gatear su comportamiento sin condicionales
per-view:

- `features.selection === false` → `getRowProps` omite handlers de selección + `aria-selected`.
- `features.keyboardFocus === false` → `tabindex = -1`, sin `onkeydown`.
- `features.contextMenu === false` → sin `oncontextmenu`.

Hoy todos son `true`, pero el gateado por contrato evita ramas hardcodeadas y deja el seam listo para
mounts con features reducidas (ej. in-editor).

## 8. cmenu trigger contract

- Todos los views → `onContextMenu(id, MouseEvent)`. Se borra `onListContextMenu`/`handleListContextMenu`
  (ViewHost 139-141/184) y los bridges del panel (614-616).
- El panel `handleContextMenu(id,e)` (588-596) se conserva como punto único: selecciona si no estaba
  seleccionado, luego dispara el menú. **Reconciliación de los dos paths** (`provider.handleContextMenu`
  vs `ContextMenuService.openPanelMenu`) se decide en [[03-migration-sequence]] step 8; el set de items
  vive en providers (verificar contra el standard set, no rebuild).
