# Phase 1 - Event Delegation

Parent: [[index|Vaultman Explorer Performance Overhaul Implementation Plan]]

## Files

- Modify: `src/components/views/ViewNodeTable.svelte`
- Modify: `src/components/views/ViewNodeGrid.svelte`
- Create: `test/component/viewNodeDelegation.test.ts`

## Tasks

- [x] **Step 1: Add red component/source tests for table delegation.**

Create tests that mount `ViewNodeTable`, click the first `.vm-node-table-row[data-id]`, dispatch `auxclick`, dispatch `contextmenu`, dispatch `keydown` with `Enter`, and assert existing callbacks receive the row id. Add a source assertion that the row markup no longer contains `onclick={(e) => handleRowClick(id, e)}` after the implementation.

Run: `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewNodeDelegation.test.ts --fileParallelism=false`
Expected before implementation: behavior may pass, source assertion fails.

- [x] **Step 2: Add table delegated handlers.**

In `ViewNodeTable.svelte`, import `PerfMeter` and add a resolver:

```ts
import { PerfMeter } from '../../services/perfMeter';

function nodeIdFromEventTarget(target: EventTarget | null): string | null {
	const el = target instanceof HTMLElement ? target.closest<HTMLElement>('[data-id]') : null;
	if (!el || !outerEl?.contains(el)) return null;
	return el.dataset.id ?? null;
}
```

Add `handleDelegatedTableClick`, `handleDelegatedTableAuxClick`, and `handleDelegatedTableContextMenu` that resolve the id and wrap the existing row functions with `PerfMeter.time('explorer.table.delegate.click' | 'explorer.table.delegate.auxclick' | 'explorer.table.delegate.contextmenu', ...)`.

- [x] **Step 3: Replace table row listeners with root listeners.**

On `.vm-node-table`, use:

```svelte
onclick={handleDelegatedTableClick}
onauxclick={handleDelegatedTableAuxClick}
oncontextmenu={handleDelegatedTableContextMenu}
onkeydown={handleTableKeydown}
```

Remove the row-level `onclick`, `onauxclick`, `oncontextmenu`, and `onkeydown`. Keep row `tabindex`, `role`, `aria-selected`, and `data-id`. Update `handleTableKeydown` so `Ctrl/Cmd+A` stays table-wide, then delegates row keys only when `nodeIdFromEventTarget(e.target)` returns an id:

```ts
if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { ...; return; }
const id = nodeIdFromEventTarget(e.target);
if (id) PerfMeter.time('explorer.table.delegate.keydown', () => onRowKeydown?.(id, e));
```

- [x] **Step 4: Add red component/source tests for grid delegation.**

Mount `ViewNodeGrid`, click `.vm-node-grid-tile[data-id]`, dispatch `auxclick`, `contextmenu`, and `keydown`. Assert toggle buttons and badges still stop propagation and call their own handlers. Add source assertions that tile markup no longer contains `onclick={(e) => handleTileClick(node.id, e)}`.

- [x] **Step 5: Add grid delegated handlers.**

In `ViewNodeGrid.svelte`, import `PerfMeter`, add `tileIdFromEventTarget()`, and attach root listeners to `.vm-node-grid`: `onclick`, `onauxclick`, `oncontextmenu`, `onkeydown`. Remove only the four tile-level handlers. Keep `ondragstart`, `ondragover`, `ondrop`, `ondragend`, toggle, direct badge, and hover-badge handlers local because they depend on `currentTarget`, drag state, or explicit button semantics.

- [x] **Step 6: Verify Phase 1.**

Run:
`pnpm exec vp test run --project component --config vitest.config.ts test/component/viewNodeDelegation.test.ts test/component/viewTableStress.test.ts --fileParallelism=false`
Expected: pass. Ops Log contains `explorer.table.delegate.*` and `explorer.grid.delegate.*` timings under 1 ms for normal clicks.
