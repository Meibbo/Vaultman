## Task 6a: viewTree adopta builder + caret

**Files:**
- Modify: `src/components/views/viewTree.svelte` (row root 949-957; caret 985-1001)
- Test: `test/component/viewTreeActionAdoption.test.ts`

- [x] **Step 1: Write the failing test**

```ts
// test/component/viewTreeActionAdoption.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewTree from '../../src/components/views/viewTree.svelte';
import type { TreeNode } from '../../src/types/typeNode';

describe('ViewTree action-routing adoption', () => {
  let target: HTMLDivElement; let app: ReturnType<typeof mount> | null = null;
  beforeEach(() => { target = document.createElement('div'); document.body.appendChild(target);
    vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} }); });
  afterEach(() => { if (app) { void unmount(app); app = null; } target.remove(); vi.unstubAllGlobals(); });

  function render(props: Record<string, unknown>) {
    app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
      target,
      props: {
        nodes: [{ id: 'p', label: 'P', depth: 0, meta: {},
          children: [{ id: 'c', label: 'C', depth: 1, meta: {} }] }] as TreeNode[],
        expandedIds: new Set(['p']),
        onToggle: vi.fn(), onRowClick: vi.fn(), onSecondaryAction: vi.fn(),
        onTertiaryAction: vi.fn(), onBoxSelect: vi.fn(), onContextMenu: vi.fn(),
        onRowKeydown: vi.fn(), icon: vi.fn(() => ({ update: vi.fn() })), ...props,
      },
    });
    flushSync();
  }

  it('row exposes data-row-key and treeitem role', () => {
    render({});
    const row = target.querySelector('[data-id="p"]') as HTMLElement;
    expect(row.getAttribute('data-row-key')).toBe('p');
    expect(row.getAttribute('role')).toBe('treeitem');
    expect(row.getAttribute('aria-expanded')).toBe('true');
  });

  it('keydown on a row delegates to onRowKeydown(id, e)', () => {
    const onRowKeydown = vi.fn();
    render({ onRowKeydown });
    const row = target.querySelector('[data-id="p"]') as HTMLElement;
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(onRowKeydown).toHaveBeenCalledWith('p', expect.any(KeyboardEvent));
  });

  it('chevron still only toggles (gesture handler preserved)', () => {
    const onToggle = vi.fn(); const onRowClick = vi.fn();
    render({ onToggle, onRowClick });
    (target.querySelector('.vm-tree-toggle') as HTMLElement).click();
    expect(onToggle).toHaveBeenCalledWith('p', expect.anything());
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run test/component/viewTreeActionAdoption.test.ts`
Expected: FAIL — no `data-row-key` attribute yet.

- [x] **Step 3: Adopt the builder**

In `viewTree.svelte` `<script>` add the common builder block (role `'treeitem'`).
Row root (949-957) — replace inline `role`/`tabindex`/`aria-selected`/`aria-expanded`/`oncontextmenu`/
`onkeydown` with the spread, keep `onclick`/`onauxclick`/`data-id`/`style`/`class:*`:

```svelte
<div
  class="vm-tree-virtual-row ..."
  ...class:* directives kept...
  style="--vm-tree-y: {y}px; --depth: {flat.depth}"
  data-id={id}
  data-sticky={sticky ? 'true' : undefined}
  onclick={(e) => handleRowClick(e, id)}
  onauxclick={(e) => handleRowAuxClick(e, id)}
  {...rowAction.getRowProps(id, {
    selected: isSelected, focused: isFocused,
    expandable: flat.hasChildren, expanded: flat.isExpanded,
  })}
>
```

Branch caret (985-996) — replace inline `onclick`/`role`/`tabindex`/`onkeydown` with the caret spread
(it stays a pointer affordance; `aria-hidden` makes the row own `aria-expanded`):

```svelte
{#if flat.hasChildren}
  <div class="vm-tree-toggle {nativeVocab?.collapseIcon ?? ''}" {...rowAction.getCaretProps(id)}>
    <span use:icon={flat.isExpanded ? 'lucide-chevron-down' : 'lucide-chevron-right'}></span>
  </div>
{:else}
  <div class="vm-tree-toggle is-placeholder {nativeVocab?.collapseIcon ?? ''}" aria-hidden="true"></div>
{/if}
```

Note: `data-row-key` (spread) coexists with `data-id` (kept). Existing `viewTreeSelection.test.ts`
queries `[data-id]` → still pass.

- [x] **Step 4: Run tests**

Run: `pnpm vitest run test/component/viewTreeActionAdoption.test.ts test/component/viewTreeSelection.test.ts test/component/viewTreeCaret.test.ts`
Expected: all PASS.

Actual verification:
- `pnpm vitest run test/component/viewTreeActionAdoption.test.ts` — RED first, missing `data-row-key` and caret event.
- `pnpm vitest run test/component/viewTreeActionAdoption.test.ts test/component/viewTreeSelection.test.ts test/component/viewTreeCaret.test.ts` — PASS, 3 files / 24 tests.
- `npx @sveltejs/mcp svelte-autofixer src/components/views/viewTree.svelte --svelte-version 5` — no issues; pre-existing suggestions only.
- `pnpm run check` — PASS, 0 errors / 0 warnings.
- `pnpm run lint` — PASS, 0 errors / 0 warnings.

- [x] **Step 5: Commit**

```bash
git add src/components/views/viewTree.svelte test/component/viewTreeActionAdoption.test.ts
git commit -m "refactor(A.R): viewTree adopts row-action builder + decorative caret"
```

Actual commit: `refactor(A.R): viewTree adopts row-action builder`.

---
