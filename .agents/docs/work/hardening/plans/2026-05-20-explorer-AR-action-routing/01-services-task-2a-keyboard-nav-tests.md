## Task 2: serviceKeyboardNav (topology-aware)

**Files:**
- Create: `src/services/serviceKeyboardNav.ts`
- Test: `test/unit/services/keyboardNav.test.ts`

Servicio puro: `handleKeydown(focusedId, e)` despacha a callbacks de `ctx`. Paridad con
`panelExplorer.handleRowKeydown` (632-704) + gaps nuevos (Home/End, type-ahead). Planar vertical mueve
±`columns` repitiendo `moveFocus(±1)` (mismo call que el panel hoy → paridad exacta).

- [x] **Step 1: Write the failing test**

```ts
// test/unit/services/keyboardNav.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createKeyboardNav, type KeyboardNavContext } from '../../../src/services/serviceKeyboardNav';

function makeCtx(over: Partial<KeyboardNavContext> = {}): KeyboardNavContext {
  return {
    topology: 'linear',
    orderedIds: () => ['a', 'b', 'c', 'd'],
    isExpandable: () => false,
    isExpanded: () => false,
    parentOf: () => null,
    firstChildOf: () => null,
    labelOf: (id) => id,
    moveFocus: vi.fn(),
    focusEdge: vi.fn(),
    focusId: vi.fn(),
    movePage: vi.fn(),
    toggleSelect: vi.fn(),
    selectAll: vi.fn(),
    expand: vi.fn(),
    collapse: vi.fn(),
    activate: vi.fn(),
    ...over,
  };
}
function key(k: string, mods: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return { key: k, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false,
    preventDefault: vi.fn(), ...mods } as unknown as KeyboardEvent;
}

describe('serviceKeyboardNav (linear)', () => {
  it('ArrowDown/Up → moveFocus ±1 roving', () => {
    const ctx = makeCtx(); const nav = createKeyboardNav(ctx);
    nav.handleKeydown('b', key('ArrowDown'));
    expect(ctx.moveFocus).toHaveBeenCalledWith(1, { additive: false, range: false });
    nav.handleKeydown('b', key('ArrowUp', { shiftKey: true }));
    expect(ctx.moveFocus).toHaveBeenCalledWith(-1, { additive: false, range: true });
  });
  it('Home/End → focusEdge', () => {
    const ctx = makeCtx(); const nav = createKeyboardNav(ctx);
    nav.handleKeydown('b', key('Home'));
    expect(ctx.focusEdge).toHaveBeenCalledWith('home', { range: false });
    nav.handleKeydown('b', key('End', { shiftKey: true }));
    expect(ctx.focusEdge).toHaveBeenCalledWith('end', { range: true });
  });
  it('Enter → activate, Space → toggleSelect', () => {
    const ctx = makeCtx(); const nav = createKeyboardNav(ctx);
    nav.handleKeydown('b', key('Enter'));
    expect(ctx.activate).toHaveBeenCalledWith('b', expect.anything());
    nav.handleKeydown('b', key(' ', { ctrlKey: true }));
    expect(ctx.toggleSelect).toHaveBeenCalledWith({ additive: true, range: false });
  });
  it('Ctrl/Cmd+A → selectAll', () => {
    const ctx = makeCtx(); const nav = createKeyboardNav(ctx);
    nav.handleKeydown('b', key('a', { metaKey: true }));
    expect(ctx.selectAll).toHaveBeenCalled();
  });
  it('tree ArrowRight expands collapsed expandable; ArrowLeft collapses', () => {
    const ctx = makeCtx({ isExpandable: () => true, isExpanded: (id) => id === 'open' });
    const nav = createKeyboardNav(ctx);
    nav.handleKeydown('closed', key('ArrowRight'));
    expect(ctx.expand).toHaveBeenCalledWith('closed');
    nav.handleKeydown('open', key('ArrowLeft'));
    expect(ctx.collapse).toHaveBeenCalledWith('open');
  });
  it('type-ahead focuses next label-prefix match', () => {
    const ctx = makeCtx({ orderedIds: () => ['apple', 'banana', 'cherry'], labelOf: (id) => id });
    const nav = createKeyboardNav(ctx);
    nav.handleKeydown('apple', key('b'));
    expect(ctx.focusId).toHaveBeenCalledWith('banana');
  });
});

describe('serviceKeyboardNav (planar)', () => {
  it('ArrowDown moves by columns', () => {
    const ctx = makeCtx({ topology: 'planar', columnsAt: () => 3,
      orderedIds: () => ['0','1','2','3','4','5'] });
    const nav = createKeyboardNav(ctx);
    nav.handleKeydown('0', key('ArrowDown'));
    expect((ctx.moveFocus as ReturnType<typeof vi.fn>).mock.calls.length).toBe(3); // 3 × ±1
  });
});

describe('serviceKeyboardNav (planar-drill)', () => {
  it('Enter on expandable container descends; Backspace ascends', () => {
    const descend = vi.fn(() => true); const ascend = vi.fn(() => true);
    const ctx = makeCtx({ topology: 'planar-drill', columnsAt: () => 2,
      isExpandable: () => true, drill: { descend, ascend } });
    const nav = createKeyboardNav(ctx);
    nav.handleKeydown('folder', key('Enter'));
    expect(descend).toHaveBeenCalledWith('folder');
    nav.handleKeydown('x', key('Backspace'));
    expect(ascend).toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/unit/services/keyboardNav.test.ts`
Expected: FAIL — `Cannot find module '../../../src/services/serviceKeyboardNav'`.
