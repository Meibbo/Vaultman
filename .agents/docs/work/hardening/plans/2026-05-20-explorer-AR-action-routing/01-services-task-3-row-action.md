## Task 3: serviceRowAction (builder)

**Files:**
- Create: `src/services/serviceRowAction.ts`
- Test: `test/unit/services/rowAction.test.ts`

Builder adaptador: produce prop-bags que llaman a los callbacks del `contract` (el panel los implementa) y lee estado vía getters. `id` recibido = el dispatch id que el view ya usa (== callbackId;
== node id en tree/list). `data-row-key = id`.

**Importante** (corrección de diseño): los views tree/table/grid YA tienen handlers de gesto de puntero ricos (doble-click → secondary, box-select, middle → tertiary, pointer-capture vía `MouseGestureService`) que YA emiten Contract A y están testeados (`viewTreeSelection.test.ts`). El builder por tanto **NO** provee `onclick`/`onauxclick` — el view conserva sus handlers de puntero. El builder estandariza solo: attrs estructurales (`role`/`tabindex`/`aria-*`/`data-row-key`) + `onkeydown` (delegación de teclado) + `oncontextmenu` + el caret (`getCaretProps`).

- [x] **Step 1: Write the failing test**

```ts
// test/unit/services/rowAction.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createRowAction, type RowActionContext } from '../../../src/services/serviceRowAction';

const allFeatures = {
  selection: true, keyboardFocus: true, contextMenu: true, scrollReveal: true,
  badges: true, nodeElementToggles: true, acceptsMediaDescriptors: true,
};
function makeCtx(over: Partial<RowActionContext> = {}): RowActionContext {
  return {
    explorerId: 'files',
    role: 'treeitem',
    features: allFeatures,
    contract: {
      onContextMenu: vi.fn(), onToggle: vi.fn(), onRowKeydown: vi.fn(),
    },
    ...over,
  };
}

describe('createRowAction.getRowProps', () => {
  it('emits structural attrs + data-row-key + contextmenu/keyboard handlers (no onclick)', () => {
    const ctx = makeCtx(); const b = createRowAction(ctx);
    const p = b.getRowProps('sel', { selected: true, expandable: false, expanded: false });
    expect(p.role).toBe('treeitem');
    expect(p.tabindex).toBe(0);
    expect(p['aria-selected']).toBe(true);
    expect(p['data-row-key']).toBe('sel');
    expect('onclick' in p).toBe(false);
    const ce = new MouseEvent('contextmenu'); p.oncontextmenu(ce);
    expect(ctx.contract.onContextMenu).toHaveBeenCalledWith('sel', ce);
    const ke = new KeyboardEvent('keydown'); p.onkeydown?.(ke);
    expect(ctx.contract.onRowKeydown).toHaveBeenCalledWith('sel', ke);
  });
  it('aria-expanded only for expandable rows', () => {
    const b = createRowAction(makeCtx());
    expect(b.getRowProps('branch', { selected: false, expandable: true, expanded: false })['aria-expanded']).toBe(false);
    expect(b.getRowProps('leaf', { selected: false, expandable: false, expanded: false })['aria-expanded']).toBeUndefined();
  });
  it('gates by feature flags', () => {
    const b = createRowAction(makeCtx({ features: { ...allFeatures, selection: false, keyboardFocus: false } }));
    const p = b.getRowProps('x', { selected: false, expandable: false, expanded: false });
    expect(p['aria-selected']).toBeUndefined();
    expect(p.tabindex).toBe(-1);
    expect(p.onkeydown).toBeUndefined();
  });
});

describe('createRowAction.getCaretProps', () => {
  it('stops propagation and toggles', () => {
    const ctx = makeCtx(); const b = createRowAction(ctx);
    const p = b.getCaretProps('branch');
    expect(p['aria-hidden']).toBe(true);
    const e = new MouseEvent('click'); const stop = vi.spyOn(e, 'stopPropagation');
    p.onclick(e);
    expect(stop).toHaveBeenCalled();
    expect(ctx.contract.onToggle).toHaveBeenCalledWith('branch', e);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/unit/services/rowAction.test.ts` Expected: FAIL — `Cannot find module '../../../src/services/serviceRowAction'`.

- [x] **Step 3: Write minimal implementation**

```ts
// src/services/serviceRowAction.ts
import type { ExplorerViewFeatureFlags } from './serviceExplorerViewContract';
import type { RowInteractionContract } from '../types/typeActionRouting';

export type RowRole = 'treeitem' | 'row' | 'gridcell' | 'option';

export interface RowActionContext {
  explorerId: string;
  role: RowRole;
  features: ExplorerViewFeatureFlags;
  contract: Pick<RowInteractionContract, 'onContextMenu' | 'onToggle' | 'onRowKeydown'>;
}

export interface RowState {
  selected: boolean;
  focused?: boolean;
  expandable: boolean;
  expanded: boolean;
}

export interface RowProps {
  role: RowRole;
  tabindex: 0 | -1;
  'aria-selected': boolean | undefined;
  'aria-expanded': boolean | undefined;
  'data-row-key': string;
  oncontextmenu: (e: MouseEvent) => void;
  onkeydown: ((e: KeyboardEvent) => void) | undefined;
}

export interface CaretProps {
  role: 'button';
  tabindex: -1;
  'aria-hidden': true;
  onclick: (e: MouseEvent) => void;
}

export interface RowActionBuilder {
  getRowProps(id: string, state: RowState): RowProps;
  getCaretProps(id: string): CaretProps;
  getKeyboardHandlers(id: string): { onkeydown: (e: KeyboardEvent) => void };
}

export function createRowAction(ctx: RowActionContext): RowActionBuilder {
  function getRowProps(id: string, state: RowState): RowProps {
    const kbd = ctx.features.keyboardFocus;
    return {
      role: ctx.role,
      tabindex: kbd ? 0 : -1,
      'aria-selected': ctx.features.selection ? state.selected : undefined,
      'aria-expanded': state.expandable ? state.expanded : undefined,
      'data-row-key': id,
      oncontextmenu: ctx.features.contextMenu
        ? (e) => { e.preventDefault(); ctx.contract.onContextMenu(id, e); }
        : () => {},
      onkeydown: kbd ? (e) => ctx.contract.onRowKeydown?.(id, e) : undefined,
    };
  }
  function getCaretProps(id: string): CaretProps {
    return {
      role: 'button',
      tabindex: -1,
      'aria-hidden': true,
      onclick: (e) => { e.stopPropagation(); ctx.contract.onToggle(id, e); },
    };
  }
  function getKeyboardHandlers(id: string) {
    return { onkeydown: (e: KeyboardEvent) => ctx.contract.onRowKeydown?.(id, e) };
  }
  return { getRowProps, getCaretProps, getKeyboardHandlers };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/unit/services/rowAction.test.ts` Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/services/serviceRowAction.ts test/unit/services/rowAction.test.ts
git commit -m "feat(A.R): add serviceRowAction builder (Melt-UI prop-bags)"
```
