- [x] **Step 3: Write minimal implementation**

```ts
// src/services/serviceKeyboardNav.ts
export type NavTopology = 'linear' | 'planar' | 'planar-drill';

export interface KeyboardNavContext {
  topology: NavTopology;
  orderedIds: () => readonly string[];
  columnsAt?: (id: string) => number;
  pageStep?: number;
  isExpandable: (id: string) => boolean;
  isExpanded: (id: string) => boolean;
  parentOf: (id: string) => string | null;
  firstChildOf: (id: string) => string | null;
  labelOf: (id: string) => string;
  moveFocus: (dir: 1 | -1, opts: { additive: boolean; range: boolean }) => void;
  focusEdge: (edge: 'home' | 'end', opts: { range: boolean }) => void;
  focusId: (id: string) => void;
  movePage: (dir: 1 | -1, opts: { range: boolean }) => void;
  toggleSelect: (opts: { additive: boolean; range: boolean }) => void;
  selectAll: () => void;
  expand: (id: string) => void;
  collapse: (id: string) => void;
  activate: (id: string, e: KeyboardEvent) => void;
  drill?: { descend: (id: string) => boolean; ascend: () => boolean };
}

export interface KeyboardNavResult { handled: boolean; }
export interface KeyboardNavController {
  handleKeydown(focusedId: string, e: KeyboardEvent): KeyboardNavResult;
  resetTypeAhead(): void;
}

const TYPE_AHEAD_TIMEOUT_MS = 500;

export function createKeyboardNav(ctx: KeyboardNavContext): KeyboardNavController {
  let buffer = '';
  let timer: ReturnType<typeof setTimeout> | null = null;

  function resetTypeAhead(): void {
    buffer = '';
    if (timer !== null) { clearTimeout(timer); timer = null; }
  }

  function planar(): boolean { return ctx.topology === 'planar' || ctx.topology === 'planar-drill'; }
  function cols(id: string): number {
    return planar() && ctx.columnsAt ? Math.max(1, ctx.columnsAt(id)) : 1;
  }

  function typeAhead(focusedId: string, ch: string): boolean {
    const ids = ctx.orderedIds();
    if (!ids.length) return true;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(resetTypeAhead, TYPE_AHEAD_TIMEOUT_MS);
    buffer += ch.toLowerCase();
    const start = Math.max(0, ids.indexOf(focusedId));
    for (let off = 1; off <= ids.length; off++) {
      const id = ids[(start + off) % ids.length];
      if (ctx.labelOf(id).toLowerCase().startsWith(buffer)) { ctx.focusId(id); return true; }
    }
    return true;
  }

  function handleKeydown(focusedId: string, e: KeyboardEvent): KeyboardNavResult {
    const additive = e.ctrlKey || e.metaKey;
    const range = e.shiftKey;
    const mods = { additive, range };

    if (additive && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault(); ctx.selectAll(); return { handled: true };
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        for (let i = 0; i < cols(focusedId); i++) ctx.moveFocus(1, mods);
        return { handled: true };
      }
      case 'ArrowUp': {
        e.preventDefault();
        for (let i = 0; i < cols(focusedId); i++) ctx.moveFocus(-1, mods);
        return { handled: true };
      }
      case 'ArrowRight': {
        e.preventDefault();
        if (planar()) {
          if (ctx.topology === 'planar-drill' && ctx.isExpandable(focusedId) && ctx.drill?.descend(focusedId)) {
            return { handled: true };
          }
          ctx.moveFocus(1, mods); return { handled: true };
        }
        if (ctx.isExpandable(focusedId) && !ctx.isExpanded(focusedId)) { ctx.expand(focusedId); return { handled: true }; }
        const child = ctx.firstChildOf(focusedId);
        if (child) ctx.focusId(child);
        return { handled: true };
      }
      case 'ArrowLeft': {
        e.preventDefault();
        if (planar()) {
          if (ctx.topology === 'planar-drill' && ctx.drill?.ascend()) return { handled: true };
          ctx.moveFocus(-1, mods); return { handled: true };
        }
        if (ctx.isExpandable(focusedId) && ctx.isExpanded(focusedId)) { ctx.collapse(focusedId); return { handled: true }; }
        const parent = ctx.parentOf(focusedId);
        if (parent) ctx.focusId(parent);
        return { handled: true };
      }
      case 'Home': { e.preventDefault(); ctx.focusEdge('home', { range }); return { handled: true }; }
      case 'End':  { e.preventDefault(); ctx.focusEdge('end', { range }); return { handled: true }; }
      case 'PageDown': { e.preventDefault(); ctx.movePage(1, { range }); return { handled: true }; }
      case 'PageUp':   { e.preventDefault(); ctx.movePage(-1, { range }); return { handled: true }; }
      case 'Backspace': {
        if (ctx.topology === 'planar-drill' && ctx.drill?.ascend()) { e.preventDefault(); return { handled: true }; }
        return { handled: false };
      }
      case 'Enter': {
        e.preventDefault();
        if (ctx.topology === 'planar-drill' && ctx.isExpandable(focusedId) && ctx.drill?.descend(focusedId)) {
          return { handled: true };
        }
        ctx.activate(focusedId, e); return { handled: true };
      }
      case ' ':
      case 'Spacebar': { e.preventDefault(); ctx.toggleSelect(mods); return { handled: true }; }
    }

    if (e.key.length === 1 && !additive && !e.altKey && /\S/.test(e.key)) {
      e.preventDefault();
      return { handled: typeAhead(focusedId, e.key) };
    }
    return { handled: false };
  }

  return { handleKeydown, resetTypeAhead };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/unit/services/keyboardNav.test.ts`
Expected: PASS (all describes).

- [x] **Step 5: Commit**

```bash
git add src/services/serviceKeyboardNav.ts test/unit/services/keyboardNav.test.ts
git commit -m "feat(A.R): add topology-aware serviceKeyboardNav (linear/planar/drill + Home/End + type-ahead)"
```

---
