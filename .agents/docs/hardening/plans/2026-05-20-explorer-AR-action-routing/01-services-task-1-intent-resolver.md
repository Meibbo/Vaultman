## Task 1: Tipos del contrato + intent resolver

**Files:**
- Create: `src/types/typeActionRouting.ts`
- Test: `test/unit/services/actionRouting.intent.test.ts`

Depende de `serviceMouse` exports: `NodeMouseAction` (`'select'|'filter'|'open'|'node-note'|'delete'`),
`NodeMouseActionConfig` (`{primary,secondary,tertiary}`), `DEFAULT_NODE_MOUSE_ACTIONS`
(primary `'filter'`, secondary `'open'`, tertiary `'delete'`) — verificados en serviceMouse.ts.

- [x] **Step 1: Write the failing test**

```ts
// test/unit/services/actionRouting.intent.test.ts
import { describe, it, expect } from 'vitest';
import {
  resolveActionIntent,
  selectionModifiersFromEvent,
} from '../../../src/types/typeActionRouting';
import { DEFAULT_NODE_MOUSE_ACTIONS } from '../../../src/services/serviceMouse';

describe('selectionModifiersFromEvent', () => {
  it('maps ctrl/meta → additive, shift → range', () => {
    expect(selectionModifiersFromEvent({ ctrlKey: true, metaKey: false, shiftKey: false }))
      .toEqual({ additive: true, range: false });
    expect(selectionModifiersFromEvent({ ctrlKey: false, metaKey: true, shiftKey: false }))
      .toEqual({ additive: true, range: false });
    expect(selectionModifiersFromEvent({ ctrlKey: false, metaKey: false, shiftKey: true }))
      .toEqual({ additive: false, range: true });
  });
});

describe('resolveActionIntent', () => {
  const cfg = DEFAULT_NODE_MOUSE_ACTIONS;
  it('row + click + mouse → primary action with selection modifiers', () => {
    const intent = resolveActionIntent(
      { surface: 'row', gesture: 'click', modifiers: { additive: true, range: false, alt: false }, pointerType: 'mouse' },
      cfg,
    );
    expect(intent.kind).toBe('filter');
    expect(intent.selection).toEqual({ additive: true, range: false });
  });
  it('row + aux + mouse → tertiary action', () => {
    expect(resolveActionIntent(
      { surface: 'row', gesture: 'aux', modifiers: { additive: false, range: false, alt: false }, pointerType: 'mouse' },
      cfg,
    ).kind).toBe('delete');
  });
  it('caret + click → toggle', () => {
    expect(resolveActionIntent(
      { surface: 'caret', gesture: 'click', modifiers: { additive: false, range: false, alt: false }, pointerType: 'mouse' },
      cfg,
    ).kind).toBe('toggle');
  });
  it('reserved gestures/surfaces → ignored', () => {
    expect(resolveActionIntent(
      { surface: 'row', gesture: 'hover', modifiers: { additive: false, range: false, alt: false }, pointerType: 'mouse' },
      cfg,
    ).kind).toBe('ignored');
    expect(resolveActionIntent(
      { surface: 'fab', gesture: 'click', modifiers: { additive: false, range: false, alt: false }, pointerType: 'touch' },
      cfg,
    ).kind).toBe('ignored');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/unit/services/actionRouting.intent.test.ts`
Expected: FAIL — `Cannot find module '../../../src/types/typeActionRouting'`.

- [x] **Step 3: Write minimal implementation**

```ts
// src/types/typeActionRouting.ts
import type { BadgeKind } from '../badges/serviceBadge';
import type { NodeMouseAction, NodeMouseActionConfig } from '../services/serviceMouse';

export interface RowInteractionContract {
  onToggle: (id: string, e?: MouseEvent | KeyboardEvent) => void;
  onRowClick: (id: string, e: MouseEvent) => void;
  onPrimaryAction?: (id: string, e: MouseEvent) => void;
  onSecondaryAction?: (id: string, e: MouseEvent) => void;
  onTertiaryAction?: (id: string, e: MouseEvent | KeyboardEvent) => void;
  onBoxSelect?: (ids: string[], e: PointerEvent) => void;
  onContextMenu: (id: string, e: MouseEvent) => void;
  onRowKeydown?: (id: string, e: KeyboardEvent) => void;
  onSelectAll?: (ids: string[], e: Event) => void;
  onBadgeDoubleClick?: (queueIndex: number) => void;
  onHoverBadgeAction?: (id: string, kind: BadgeKind, e: MouseEvent | KeyboardEvent) => void;
}

export type ActionSurface = 'row' | 'caret' | 'button' | 'fab' | 'badge';
export type ActionGesture =
  | 'click' | 'aux' | 'dblclick' | 'longpress'
  | 'swipe-left' | 'swipe-right' | 'drag' | 'hover';
export type ActionPointer = 'mouse' | 'touch' | 'pen' | 'keyboard';

export interface ActionModifiers { additive: boolean; range: boolean; alt: boolean; }

export interface ActionIntentQuery {
  surface: ActionSurface;
  gesture: ActionGesture;
  modifiers: ActionModifiers;
  pointerType: ActionPointer;
}

export type NodeActionKind = NodeMouseAction | 'toggle' | 'context-menu' | 'activate' | 'ignored';

export interface ActionIntent {
  kind: NodeActionKind;
  selection?: { additive: boolean; range: boolean };
}

export function selectionModifiersFromEvent(
  e: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
): { additive: boolean; range: boolean } {
  return { additive: e.ctrlKey || e.metaKey, range: e.shiftKey };
}

export function modifiersFromEvent(e: MouseEvent | KeyboardEvent): ActionModifiers {
  return { additive: e.ctrlKey || e.metaKey, range: e.shiftKey, alt: e.altKey };
}

// v1.2.0 resuelve {row,caret} × {click,aux} × mouse. Lo demás reservado → 'ignored'.
// reserved: hover→K.B/Theme(10); swipe/longpress→Touch pass; drag→DnD repair; button/fab→Control Island(6/12).
export function resolveActionIntent(
  q: ActionIntentQuery,
  mouseConfig: NodeMouseActionConfig,
): ActionIntent {
  const selection = { additive: q.modifiers.additive, range: q.modifiers.range };
  if (q.surface === 'caret') {
    return q.gesture === 'click' ? { kind: 'toggle' } : { kind: 'ignored' };
  }
  if (q.surface === 'row' && q.pointerType === 'mouse') {
    if (q.gesture === 'click') return { kind: mouseConfig.primary, selection };
    if (q.gesture === 'aux') return { kind: mouseConfig.tertiary };
  }
  return { kind: 'ignored' };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/unit/services/actionRouting.intent.test.ts`
Expected: PASS (7 assertions).

- [x] **Step 5: Commit**

```bash
git add src/types/typeActionRouting.ts test/unit/services/actionRouting.intent.test.ts
git commit -m "feat(A.R): add action-routing intent resolver + modifier translation"
```

---
