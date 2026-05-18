---
title: 09 — C9 standardize DnD state mod emission
type: plan-task
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 09 — C9: Standardize DnD state mod emission via `UNIVERSAL_DND_VOCAB`

View components emit native DnD class strings when `preset.useNativeDom=true`, vm-style strings when false. **Services (`serviceDnd`, `serviceManualDnd`, dnd-kit) are NOT modified.** drop-indicator element renders universal classes.

**Files:**
- Modify: `src/components/views/viewTree.svelte`
- Modify: `src/components/views/ViewNodeTable.svelte`
- Modify: `src/components/views/ViewNodeGrid.svelte`
- Modify: `src/components/views/ViewNodeCards.svelte`
- (ViewNodeList: no DnD today; no change. Confirmed by test.)
- Test: `test/component/views/*.DndStateMods.test.ts` (4 files + 1 negative for list)

## Steps

- [ ] **Step 1: Write failing tests for ViewNodeGrid drag state class emission**

Create `test/component/views/ViewNodeGrid.DndStateMods.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';
import ViewNodeGrid from '../../../src/components/views/ViewNodeGrid.svelte';
import { PRESET_KEY } from '../../../src/components/explorer/viewHostContext';
import type { ThemePreset } from '../../../src/types/typeThemePreset';

afterEach(cleanup);

function makePresetWith(useNativeDom: boolean): ThemePreset {
  return {
    source: 'built-in', id: 'test', displayName: 'test',
    useNativeDom,
    chrome: { popupBgOpacity: 1, popupBackdropBlur: '0px', popupBgTint: 0 },
    density: { rowHeight: '26px', rowPaddingY: '2px', iconSize: '16px' },
    dock: { visible: true, presentation: 'bar' },
    tabs: { visible: true, presentation: 'top-tabs', kind: 'workspace' },
    toolbar: { buttons: 'core' },
    viewModes: ['grid'] as never,
    nodeElements: {
      icon: true, label: true, detail: true, media: false,
      badges: { ops: true, filters: true, warnings: true, inherited: true, counts: true },
      actions: true,
    },
    lockNodeElementVisibility: false,
  } as ThemePreset;
}

describe('ViewNodeGrid — DnD state mod emission (C9)', () => {
  it('emits vm-drag-source when isDragSource=true AND useNativeDom=false', () => {
    const preset = makePresetWith(false);
    const { container } = render(ViewNodeGrid, {
      context: new Map([[PRESET_KEY, { value: () => preset }]]),
      props: {
        nodes: [{ id: 'a', label: 'A', isDragSource: true } as never],
        onTileClick: () => {}, onContextMenu: () => {},
        icon: (() => ({ update() {} })) as never,
      } as never,
    });
    // Grid has rowStateMods=[] in contract; native classes NEVER emit on grid.
    // So when useNativeDom=true OR false, no .is-being-dragged should appear.
    expect(container.querySelector('.vm-drag-source')).not.toBeNull();
    expect(container.querySelector('.is-being-dragged')).toBeNull();
  });

  it('does NOT emit is-being-dragged when useNativeDom=true (grid rowStateMods is empty)', () => {
    const preset = makePresetWith(true);
    const { container } = render(ViewNodeGrid, {
      context: new Map([[PRESET_KEY, { value: () => preset }]]),
      props: {
        nodes: [{ id: 'a', label: 'A', isDragSource: true } as never],
        onTileClick: () => {}, onContextMenu: () => {},
        icon: (() => ({ update() {} })) as never,
      } as never,
    });
    expect(container.querySelector('.vm-drag-source')).not.toBeNull();
    expect(container.querySelector('.is-being-dragged')).toBeNull();
  });
});
```

(Grid is intentionally `vm-only` per honest-hybrid; even when
`useNativeDom=true`, grid's `rowStateMods=[]` means no native classes
emit. Test asserts this explicitly.)

- [ ] **Step 2: Run test to verify it fails**

```powershell
pnpm vitest run test/component/views/ViewNodeGrid.DndStateMods.test.ts
```

Expected: FAIL — current grid emission uses `is-dnd-dragging` or no class
at all (per inventory).

- [ ] **Step 3: Update `ViewNodeGrid.svelte` DnD emission to use vm-drag-source / vm-drop-target**

The grid component today (per inventory) reads `isDragSource` and applies
`is-dnd-dragging` or similar. Replace with `vm-drag-source` / `vm-drop-target`.
Because grid's `rowStateMods` in the contract is `[]`, native classes are
never emitted regardless of `useNativeDom`. The `stateModEmissions` helper
already handles this correctly — just thread `isDragSource` / `isDropTarget`
booleans through to the helper.

- [ ] **Step 4: Run grid test to verify PASS**

```powershell
pnpm vitest run test/component/views/ViewNodeGrid.DndStateMods.test.ts
```

Expected: PASS.

- [ ] **Step 5: Repeat for viewTree (native classes emit when useNativeDom=true)**

Create `test/component/views/viewTree.DndStateMods.test.ts`:
- `vm-drag-source` always when `isDragSource=true`
- `is-being-dragged` ALSO when `isDragSource=true AND useNativeDom=true`
- `is-being-dragged-over` when `isDropTarget=true AND useNativeDom=true`
- No native classes when `useNativeDom=false`

Update `viewTree.svelte` DnD emission to thread booleans through
`stateModEmissions`. Tree's contract has the drag mods in `rowStateMods`,
so they emit correctly when native.

Run test, expect PASS.

- [ ] **Step 6: Repeat for ViewNodeTable**

Create `test/component/views/ViewNodeTable.DndStateMods.test.ts` with the
same pattern (native drag mods present when `useNativeDom=true`, vm-style
always).

Update `ViewNodeTable.svelte` accordingly.

Run test, expect PASS.

- [ ] **Step 7: Repeat for ViewNodeCards**

Create `test/component/views/ViewNodeCards.DndStateMods.test.ts`.

Update `ViewNodeCards.svelte`.

Run test, expect PASS.

- [ ] **Step 8: Negative test for ViewNodeList (no DnD)**

Create `test/component/views/ViewNodeList.DndStateMods.test.ts`:

```typescript
it('does NOT emit DnD state classes (list does not participate in DnD)', () => {
  const preset = makePresetWith(true);
  const { container } = render(ViewNodeList, {
    context: new Map([[PRESET_KEY, { value: () => preset }]]),
    props: {
      rowInputs: [{ id: 'a', label: 'A' } as never],
      icon: (() => ({ update() {} })) as never,
    } as never,
  });
  expect(container.querySelector('.is-being-dragged')).toBeNull();
  expect(container.querySelector('.is-being-dragged-over')).toBeNull();
  expect(container.querySelector('.vm-drag-source')).toBeNull();
  expect(container.querySelector('.vm-drop-target')).toBeNull();
});
```

Expected: PASS without code change (list does not consume DnD booleans).

- [ ] **Step 9: drop-indicator element emission**

Audit existing code for the drop-indicator render (where the visual line
appears between rows during DnD). Likely lives in viewTree / ViewNodeGrid
container scope (not per-row).

Update its class string:

```svelte
{#if dropIndicatorY != null}
  <div
    class="vm-drop-indicator { useNativeDom ? 'drop-indicator is-active' : '' }"
    style="top: {dropIndicatorY}px"
  ></div>
{/if}
```

Add a test asserting `drop-indicator is-active` appears when
`useNativeDom=true` and a dropIndicator position is set; vm-only when
false.

- [ ] **Step 10: Verify NO modification to serviceDnd / serviceManualDnd / dnd-kit files**

Run:

```powershell
git diff --stat src/services/serviceDnd.ts src/services/serviceManualDnd.ts 2>&1
git diff --stat node_modules/.. -- "**/dnd-kit*" 2>&1
```

Expected: zero changes to these files. If any diff appears, revert
those changes — the services must stay preset-agnostic.

- [ ] **Step 11: Run all C9 tests + `pnpm verify`**

```powershell
pnpm vitest run test/component/views/*.DndStateMods.test.ts
pnpm verify
```

Expected: PASS.

- [ ] **Step 12: Live `plugin-dev` DnD smoke**

```powershell
pnpm run build
obsidian plugin:reload id=vaultman vault=plugin-dev
obsidian command id=vaultman:open vault=plugin-dev
# Manual: drag a tree row in vaultman preset, verify .vm-drag-source applied
# Manual: switch to native preset, drag again, verify .is-being-dragged + .vm-drag-source both applied
obsidian dev:errors vault=plugin-dev
```

Expected: `No errors captured.` Drag visuals consistent with preset.

- [ ] **Step 13: Commit**

```powershell
git add src/components/views/viewTree.svelte src/components/views/ViewNodeTable.svelte src/components/views/ViewNodeGrid.svelte src/components/views/ViewNodeCards.svelte test/component/views/*.DndStateMods.test.ts
git commit -m "refactor(0-A): standardize DnD state mod emission via UNIVERSAL_DND_VOCAB

View components emit vm-drag-source / vm-drop-target always when their
isDragSource / isDropTarget booleans are true. Native classes
(is-being-dragged, is-being-dragged-over) emit additively when
preset.useNativeDom=true AND view contract's rowStateMods allow-lists
the mod. drop-indicator element emits universal drop-indicator + is-active
classes when native, vm-drop-indicator when not.

serviceDnd, serviceManualDnd, dnd-kit unchanged. ViewNodeList confirmed
to not participate in DnD."
```

## Verification gates

- 4 view tests + 1 negative list test pass.
- `serviceDnd`, `serviceManualDnd`, dnd-kit unchanged (git diff empty for
  those paths).
- `pnpm verify` baseline preserved.
- Live smoke: drag visuals work in both presets.

## Rollback

`git revert <commit>` reverts DnD class emission. Services + helper +
vocab const remain.
