## Task 4: Caret WCAG hit-target

**Files:**
- Modify: `src/styles/explorer/_tree.scss` (bloque `.vm-tree-toggle`, ~line 113-117)
- Test: `test/component/viewTreeCaret.test.ts`

El placeholder de hoja es inerte by-design (ya probado en `viewTreeSelection.test.ts:139`) y el row-click ya funciona — NO se toca. Defecto verificable = hit-target 20px < 24px (WCAG 2.5.8).

- [x] **Step 1: Write the failing test**

```ts
// test/component/viewTreeCaret.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewTree from '../../src/components/views/viewTree.svelte';
import type { TreeNode } from '../../src/types/typeNode';

describe('ViewTree caret hit-target (WCAG 2.5.8)', () => {
  let target: HTMLDivElement;
  let app: ReturnType<typeof mount> | null = null;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
    vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} });
  });
  afterEach(() => { if (app) { void unmount(app); app = null; } target.remove(); vi.unstubAllGlobals(); });

  it('branch caret clickable target is at least 24x24 CSS px', () => {
    app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
      target,
      props: {
        nodes: [{ id: 'p', label: 'P', depth: 0, meta: {},
          children: [{ id: 'c', label: 'C', depth: 1, meta: {} }] }] as TreeNode[],
        expandedIds: new Set(['p']),
        onToggle: vi.fn(), onRowClick: vi.fn(), onPrimaryAction: vi.fn(),
        onSecondaryAction: vi.fn(), onTertiaryAction: vi.fn(), onBoxSelect: vi.fn(),
        onContextMenu: vi.fn(), icon: vi.fn(() => ({ update: vi.fn() })),
      },
    });
    flushSync();
    const toggle = target.querySelector('.vm-tree-toggle') as HTMLElement;
    const style = getComputedStyle(toggle);
    expect(parseFloat(style.minWidth)).toBeGreaterThanOrEqual(24);
    expect(parseFloat(style.minHeight)).toBeGreaterThanOrEqual(24);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/component/viewTreeCaret.test.ts` Expected: FAIL — minWidth/minHeight `20px` (or unset) < 24.

(Note: jsdom `getComputedStyle` returns authored CSS, not layout. If the SCSS var is not resolved in jsdom, assert against the explicit `min-width`/`min-height` declarations added in Step 3 instead.)

- [x] **Step 3: Add the hit-target padding**

```scss
/* src/styles/explorer/_tree.scss — inside &-toggle { ... } (~line 113) */
&-toggle {
  @include tree-icon-size(var(--vm-tree-toggle-size, 20px));
  min-width: 24px;
  min-height: 24px;
  color: $vm-text-normal;
  opacity: 0.35;
}
&-toggle.is-placeholder { min-width: 24px; min-height: 24px; }
```

The icon stays 20px (`--vm-tree-toggle-size`); only the clickable box grows to 24px. Does not affect `--vm-tree-icon-size` (16px) asserts in `viewTreeSelection.test.ts`.

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run test/component/viewTreeCaret.test.ts` Expected: PASS. Also run `pnpm vitest run test/component/viewTreeSelection.test.ts` → still PASS.

- [x] **Step 5: Commit**

```bash
git add src/styles/explorer/_tree.scss test/component/viewTreeCaret.test.ts
git commit -m "fix(A.R): caret WCAG 2.5.8 hit-target (>=24x24)"
```

---
