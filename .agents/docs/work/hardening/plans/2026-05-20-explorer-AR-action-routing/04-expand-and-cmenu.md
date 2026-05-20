---
title: A.R Plan — Task 7 (expand-all data-gated) + Task 8 (cmenu)
type: plan-shard
status: completed
parent: "[[index|A.R plan]]"
created: 2026-05-20T00:00:00
updated: 2026-05-20T17:15:00-05:00
---

# Task 7 (expand/collapse-all data-gated) + Task 8 (cmenu trigger unify)

---

## Task 7: Expand/collapse-all gateado por datos

**Files:**
- Modify: `src/components/containers/panelExplorer.svelte` (`hasExpansionSurface` 137, 139, 151, 154;
  `expandAllParents`/`collapseAllParents` 830-836)
- Test: `test/component/expandAllParity.test.ts`

Hoy `hasExpansionSurface = viewMode === 'tree' || 'grid'` (137) gatea por viewMode → list/table/cards
nunca expanden aunque los datos tengan hijos. Cambiar a gate por datos.

- [x] **Step 1: Write the failing test**

```ts
// test/component/expandAllParity.test.ts
// Reusa el harness de mount de panelExplorer de test/component/panelExplorerSelection.test.ts
// (mismo setup de plugin/provider). Patrón:
import { describe, it, expect, vi } from 'vitest';
// ... (importar el helper de montaje de panel del test existente)

describe('expand/collapse-all is data-gated, not viewMode-gated', () => {
  it('expand-all expands hierarchical rows in LIST view (not just tree/grid)', () => {
    // montar panelExplorer con provider cuyos nodes tienen children, viewMode='list'
    // disparar nodeExpansionCommand { action: 'expand-all', serial: 1 }
    // assert: los parent ids quedan en expandedIds (visibleNodeIds incluye los children)
  });
  it('expand-all is a no-op on a FLAT provider (no children)', () => {
    // viewMode='list', nodes planos → expand-all no cambia visibleNodeIds
  });
});
```

(Completar el montaje con el helper exacto de `panelExplorerSelection.test.ts`; la aserción central es
`visibleNodeIds`/`expandedIds` tras el comando, independiente de `viewMode`.)

- [x] **Step 2: Run → FAIL** (`pnpm vitest run test/component/expandAllParity.test.ts`) — list no expande.

- [x] **Step 3: Data-gate**

```diff
- const hasExpansionSurface = $derived(viewMode === 'tree' || viewMode === 'grid');
+ const hasExpandableRows = $derived(collectExpandableNodeIds(nodes).length > 0);
```
Reemplazar usos de `hasExpansionSurface` (139, 151, 154) por `hasExpandableRows`. `expandableNodeIds`
se colecta siempre que haya filas expandibles (no solo tree/grid). El effect de `nodeExpansionCommand`
(390-397) ya llama `expandAllParents`/`collapseAllParents`, ahora activo en cualquier view con jerarquía.
En grid `inline`, rutear al set correcto (mirroring `toggleExpand` 810-812):

```ts
function expandAllParents() {
  const inline = viewMode === 'grid' && gridHierarchyMode === 'inline';
  for (const id of expandableNodeIds) { if (inline) { if (!gridExpandedIds.has(id)) toggleExpand(id); } else expandNode(id); }
}
function collapseAllParents() {
  const inline = viewMode === 'grid' && gridHierarchyMode === 'inline';
  for (const id of expandableNodeIds) { if (inline) { if (gridExpandedIds.has(id)) toggleExpand(id); } else collapseNode(id); }
}
```

- [x] **Step 4: Run → PASS.** Luego `pnpm vitest run test/component/viewGridSelection.test.ts` (grid sin regresión).

Actual verification:
- `pnpm vitest run test/component/expandAllParity.test.ts` — RED first:
  list summary returned `canToggle: false`, proving the view-mode gate blocked hierarchical data.
- `pnpm vitest run test/component/expandAllParity.test.ts` — PASS, 1 file / 2 tests.
- `npx @sveltejs/mcp svelte-autofixer src/components/containers/panelExplorer.svelte --svelte-version 5` — no issues; pre-existing suggestions only.
- `pnpm vitest run test/component/expandAllParity.test.ts test/component/panelExplorerSelection.test.ts test/component/viewGridSelection.test.ts` — PASS, 3 files / 67 tests.
- `pnpm run check` — PASS, 0 errors / 0 warnings.
- `pnpm run lint` — PASS, 0 errors / 0 warnings.
- `git diff --check` — PASS, CRLF working-copy warnings only.

Implementation note: `panelExplorer` now derives `expandableNodeIds` from the data tree regardless of
view mode, then gates `autoExpandedIds` and `hasExpandedParents` from `hasExpandableRows`. This keeps
flat providers as no-op while allowing list/table/cards selection/keyboard visibility semantics to see
expanded hierarchical ids.

- [x] **Step 5: Commit** `feat(A.R): data-gate expand/collapse-all across all views`.

Actual commit: `feat(A.R): data-gate expand/collapse-all across views`.

---

## Task 8: cmenu trigger unificado + standard set

**Files:**
- Verify/Modify: `src/services/serviceCMenu.ts`, `src/providers/explorer{Files,Tags,Props,Snippets,Plugins,Content}.ts`
- Modify (si diverge): `src/components/containers/panelExplorer.svelte` (`handleContextMenu` 588-596)
- Test: extend `test/unit/services/serviceCMenu.test.ts` + `test/component/cmenuTriggerParity.test.ts`

El trigger ya quedó unificado tras Task 5/6 (todos los views → `oncontextmenu` del spread →
`onContextMenu(id,e)` → `handleContextMenu`). Aquí: (1) verificar paridad del trigger en los 5 views,
(2) verificar/registrar el standard set por provider, (3) reconciliar los dos paths de apertura.

- [x] **Step 1: Write the failing/parity tests**

```ts
// test/component/cmenuTriggerParity.test.ts — los 5 views disparan onContextMenu(id, e)
// (cubierto en parte por los *ActionAdoption.test.ts; este consolida los 5).
// Para cada view: dispatch contextmenu en una fila → onContextMenu llamado con (id, MouseEvent).
```

```ts
// test/unit/services/serviceCMenu.test.ts (extender) — standard set por nodeType.
// Tras registrar las acciones de los providers, openPanelMenu para un nodo 'file' debe contener
// el set estándar. Reusar el patrón de cmenuSetAction.test.ts / cmenuCreateBindingNote.test.ts.
import { ContextMenuService } from '../../../src/services/serviceCMenu';
// registrar acciones (vía el setup del provider o registerAction directo), construir un Menu fake,
// llamar openPanelMenu con ctx { nodeType:'file', surface:'panel', ... } y assert los titles incluyen:
// Open, Rename, Move, Delete (+ Tag/Prop/Duplicate/Queue donde el provider los registre).
```

- [x] **Step 2: Run → FAIL** donde falte el set o el trigger.

- [x] **Step 3: Verify + register missing + reconcile path**

  - **Standard set**: leer los `registerAction({...})` reales de los 6 providers. Conocidos en
    `explorerFiles.ts`: `file.rename` (Rename), `file.delete` (Delete), `file.set` (Set (append link)),
    `file.move` (Move file), `folder.filter`. El brief nombra 8 (Open/Rename/Move/Tag/Prop/Duplicate/
    Queue/Delete). Registrar los faltantes (ej. `file.open` "Open", `file.duplicate`, `node.queue`,
    `node.tag`, `node.prop`) en el provider correspondiente con su `nodeTypes`/`surfaces`/`run`. NO
    reconstruir el registry.
  - **Reconciliar paths**: `handleContextMenu` (588-596) llama `provider.handleContextMenu(node, e, ...)`
    — confirmar si internamente usa `ContextMenuService.openPanelMenu` (registry) o construye su propio
    menú. Si construye uno propio divergente, redirigirlo a `openPanelMenu` para un único path. Si ya
    delega al registry, no-op (solo documentar).

- [x] **Step 4: Run → PASS.** `pnpm vitest run test/unit/services/serviceCMenu.test.ts test/component/cmenuTriggerParity.test.ts test/component/cmenuSetAction.test.ts`.

Actual verification:
- `pnpm vitest run test/component/cmenuTriggerParity.test.ts test/unit/services/serviceCMenu.test.ts` — RED first in serviceCMenu: `file.open` was missing from the provider standard set and the route-through-open assertion had no action to invoke. Trigger parity across the five views already passed.
- `pnpm vitest run test/component/cmenuTriggerParity.test.ts test/unit/services/serviceCMenu.test.ts` — PASS, 2 files / 11 tests.
- `pnpm vitest run test/unit/services/serviceCMenu.test.ts test/component/cmenuTriggerParity.test.ts test/component/cmenuSetAction.test.ts test/component/cmenuCreateBindingNote.test.ts test/unit/components/explorerFiles.test.ts test/unit/components/explorerTags.test.ts test/unit/components/explorerProps.test.ts` — PASS, 7 files / 79 tests.
- `pnpm run check` — PASS, 0 errors / 0 warnings.
- `pnpm run lint` — PASS, 0 errors / 0 warnings.
- `git diff --check` — PASS, CRLF working-copy warnings only.

Implementation note: The five view triggers now have a consolidated parity test. `explorerFiles`
registers `file.open` for `panel` and `file-menu`, using the same workspace `openLinkText(file.path,
'', false)` path as file secondary activation. Existing provider `handleContextMenu` methods already
route through `ContextMenuService.openPanelMenu`; no registry rebuild was needed.

- [x] **Step 5: Commit** `refactor(A.R): unify context-menu trigger across views + verify standard action set`.

Actual commit: `refactor(A.R): unify context-menu trigger + verify standard set`.
