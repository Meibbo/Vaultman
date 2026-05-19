---
title: 08 — C8 standardize native-class emission per view
type: plan-task
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 08 — C8: Standardize native-class emission per view per preset

Each view component reads `explorerViewContract(viewMode).nativeDomEmission[mountContext]` from context and emits classes per the data-driven rule. **Behavior-relevant**: table/cards switch from `.nav-file` to `.bases-tr` / `.bases-cards-item`; grid drops native classes; tree literals come from the contract (no string value change for tree).

**Files:**
- Create: `src/services/serviceNodeClassEmission.ts` (shared helper)
- Modify: `src/components/views/viewTree.svelte`
- Modify: `src/components/views/ViewNodeList.svelte` (no-op for rowRoot but uniform pattern)
- Modify: `src/components/views/ViewNodeTable.svelte`
- Modify: `src/components/views/ViewNodeGrid.svelte`
- Modify: `src/components/views/ViewNodeCards.svelte`
- Test: `test/component/views/*.NativeClassEmission.test.ts` (5 files)
- Test: `test/unit/services/serviceNodeClassEmission.test.ts`

## Steps

- [ ] **Step 1: Write failing unit test for class emission helper**

Create `test/unit/services/serviceNodeClassEmission.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { stateModEmissions } from '../../../src/services/serviceNodeClassEmission';
import type { NativeClassVocabulary } from '../../../src/services/serviceExplorerViewContract';

const TREE_VOCAB: NativeClassVocabulary = {
  rowRoot: 'tree-item',
  primaryLabel: 'tree-item-inner',
  innerWrapper: 'tree-item-self',
  childrenContainer: 'tree-item-children',
  collapseIcon: 'collapse-icon',
  cellWrapper: null,
  coverImage: null,
  headerCell: null,
  rowStateMods: ['is-active', 'is-selected', 'is-focused', 'is-being-dragged'],
};

const NULL_VOCAB: NativeClassVocabulary = {
  rowRoot: null, primaryLabel: null, innerWrapper: null,
  childrenContainer: null, collapseIcon: null,
  cellWrapper: null, coverImage: null, headerCell: null,
  rowStateMods: [],
};

describe('stateModEmissions', () => {
  it('emits vm-* always when row state booleans are true', () => {
    const out = stateModEmissions(TREE_VOCAB, {
      isSelected: true, isFocused: true, isActive: false,
      isDragSource: false, isDropTarget: false, hasActiveMenu: false,
    });
    expect(out).toContain('vm-is-selected');
    expect(out).toContain('vm-is-focused');
  });

  it('emits native is-* when useNativeDom (vocab present) AND state true AND mod allow-listed', () => {
    const out = stateModEmissions(TREE_VOCAB, {
      isSelected: true, isFocused: false, isActive: false,
      isDragSource: false, isDropTarget: false, hasActiveMenu: false,
    });
    expect(out).toContain('is-selected');
  });

  it('does NOT emit native is-* when vocab is null (useNativeDom=false path)', () => {
    const out = stateModEmissions(null, {
      isSelected: true, isFocused: true, isActive: false,
      isDragSource: false, isDropTarget: false, hasActiveMenu: false,
    });
    expect(out).toContain('vm-is-selected');
    expect(out).not.toContain('is-selected');
  });

  it('does NOT emit native is-* when state mod not in rowStateMods allowlist', () => {
    const out = stateModEmissions(NULL_VOCAB, {
      isSelected: true, isFocused: true, isActive: false,
      isDragSource: false, isDropTarget: false, hasActiveMenu: false,
    });
    expect(out).not.toContain('is-selected');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
pnpm vitest run test/unit/services/serviceNodeClassEmission.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/services/serviceNodeClassEmission.ts`**

```typescript
import type { NativeClassVocabulary } from './serviceExplorerViewContract';

export interface RowStateBooleans {
  isSelected: boolean;
  isFocused: boolean;
  isActive: boolean;
  isDragSource: boolean;
  isDropTarget: boolean;
  hasActiveMenu: boolean;
}

export function stateModEmissions(
  vocab: NativeClassVocabulary | null,
  state: RowStateBooleans,
): string[] {
  const out: string[] = [];

  if (state.isSelected) out.push('vm-is-selected');
  if (state.isFocused) out.push('vm-is-focused');
  if (state.isActive) out.push('vm-is-active');
  if (state.isDragSource) out.push('vm-drag-source');
  if (state.isDropTarget) out.push('vm-drop-target');
  if (state.hasActiveMenu) out.push('vm-has-active-menu');

  if (vocab) {
    if (state.isSelected && vocab.rowStateMods.includes('is-selected')) out.push('is-selected');
    if (state.isFocused && vocab.rowStateMods.includes('is-focused')) out.push('is-focused');
    if (state.isActive && vocab.rowStateMods.includes('is-active')) out.push('is-active');
    if (state.isDragSource && vocab.rowStateMods.includes('is-being-dragged')) out.push('is-being-dragged');
    if (state.isDropTarget && vocab.rowStateMods.includes('is-being-dragged-over')) out.push('is-being-dragged-over');
    if (state.hasActiveMenu && vocab.rowStateMods.includes('has-active-menu')) out.push('has-active-menu');
  }

  return out;
}
```

- [ ] **Step 4: Verify helper test passes**

```powershell
pnpm vitest run test/unit/services/serviceNodeClassEmission.test.ts
```

Expected: PASS — 4 cases green.

- [ ] **Step 5: Write failing test for ViewNodeTable native emission**

Create `test/component/views/ViewNodeTable.NativeClassEmission.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';
import ViewNodeTable from '../../../src/components/views/ViewNodeTable.svelte';
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
    viewModes: ['table'] as never,
    nodeElements: {
      icon: true, label: true, detail: true, media: false,
      badges: { ops: true, filters: true, warnings: true, inherited: true, counts: true },
      actions: true,
    },
    lockNodeElementVisibility: false,
  } as ThemePreset;
}

describe('ViewNodeTable — native class emission (C8)', () => {
  it('emits bases-tr on row root when preset.useNativeDom=true', () => {
    const preset = makePresetWith(true);
    const { container } = render(ViewNodeTable, {
      context: new Map([[PRESET_KEY, { value: () => preset }]]),
      props: {
        rows: [{ id: 'a', label: 'A', node: { id: 'a', label: 'A' } } as never],
        columns: [{ key: 'label', label: 'Label' } as never],
        onRowClick: () => {},
        onContextMenu: () => {},
        icon: (() => ({ update() {} })) as never,
      } as never,
    });
    expect(container.querySelector('.bases-tr')).not.toBeNull();
    expect(container.querySelector('.nav-file')).toBeNull();
  });

  it('does NOT emit bases-tr or nav-file when preset.useNativeDom=false', () => {
    const preset = makePresetWith(false);
    const { container } = render(ViewNodeTable, {
      context: new Map([[PRESET_KEY, { value: () => preset }]]),
      props: {
        rows: [{ id: 'a', label: 'A', node: { id: 'a', label: 'A' } } as never],
        columns: [{ key: 'label', label: 'Label' } as never],
        onRowClick: () => {},
        onContextMenu: () => {},
        icon: (() => ({ update() {} })) as never,
      } as never,
    });
    expect(container.querySelector('.bases-tr')).toBeNull();
    expect(container.querySelector('.nav-file')).toBeNull();
    expect(container.querySelector('.vm-node-table-row')).not.toBeNull();
  });

  it('emits bases-td on cell wrappers when useNativeDom=true', () => {
    const preset = makePresetWith(true);
    const { container } = render(ViewNodeTable, {
      context: new Map([[PRESET_KEY, { value: () => preset }]]),
      props: {
        rows: [{ id: 'a', label: 'A', node: { id: 'a', label: 'A' }, cells: [{ key: 'label' }, { key: 'date' }] } as never],
        columns: [{ key: 'label' }, { key: 'date' }] as never,
        onRowClick: () => {},
        onContextMenu: () => {},
        icon: (() => ({ update() {} })) as never,
      } as never,
    });
    expect(container.querySelectorAll('.bases-td').length).toBeGreaterThan(0);
  });

  it('emits bases-table-cell on primary label cell', () => {
    const preset = makePresetWith(true);
    const { container } = render(ViewNodeTable, {
      context: new Map([[PRESET_KEY, { value: () => preset }]]),
      props: {
        rows: [{ id: 'a', label: 'A', node: { id: 'a', label: 'A' } } as never],
        columns: [{ key: 'label' }] as never,
        onRowClick: () => {},
        onContextMenu: () => {},
        icon: (() => ({ update() {} })) as never,
      } as never,
    });
    expect(container.querySelector('.bases-table-cell')).not.toBeNull();
  });
});
```

- [ ] **Step 6: Update `ViewNodeTable.svelte` to consume vocab from contract**

In `<script>`:

```typescript
import { getContext } from 'svelte';
import { PRESET_KEY } from '../explorer/viewHostContext';
import { explorerViewContract, type NativeClassVocabulary } from '../../services/serviceExplorerViewContract';
import { stateModEmissions } from '../../services/serviceNodeClassEmission';

const presetCtx = getContext(PRESET_KEY);
const preset = $derived(presetCtx ? presetCtx.value() : null);
const useNativeDom = $derived(preset?.useNativeDom ?? false);
const vocab = $derived<NativeClassVocabulary | null>(
  useNativeDom ? explorerViewContract('table').nativeDomEmission.panel : null
);
```

In markup, replace the existing `class:nav-file={useNativeDom}` patterns with:

```svelte
<div
  class="vm-node-table-row {vocab?.rowRoot ?? ''}"
  {...stateClassesFor(row)}
>
  <div class="vm-node-table-cell is-label-cell {vocab?.cellWrapper ?? ''}">
    <span class="vm-node-table-primary {vocab?.primaryLabel ?? ''}">{row.label}</span>
  </div>
  ...
</div>
```

(`stateClassesFor` is a helper inside the component that invokes
`stateModEmissions(vocab, rowStateBooleans)` and turns the returned array
into `class:foo={true}` directives or a single space-joined class attr.)

- [ ] **Step 7: Run table test**

```powershell
pnpm vitest run test/component/views/ViewNodeTable.NativeClassEmission.test.ts
```

Expected: PASS — 4 cases green.

- [ ] **Step 8: Repeat for ViewNodeCards (Bases cards vocab + cover slot)**

Create `test/component/views/ViewNodeCards.NativeClassEmission.test.ts` with
assertions:
- `bases-cards-item` on card root when `useNativeDom=true`
- `bases-cards-property mod-title` on primary label
- `bases-cards-property` on every field wrapper
- `bases-cards-cover` rendered when `mask.media=true AND row.mediaDescriptor AND useNativeDom=true`
- No native classes when `useNativeDom=false`

Update `ViewNodeCards.svelte` to consume vocab + use `stateModEmissions`.
Cover image element receives `{vocab?.coverImage ?? ''}`. The existing
`{#if mask.media && row.mediaDescriptor}` guard from C6 stays in place;
the inner element gets the class added.

Run test, expect PASS.

- [ ] **Step 9: Repeat for ViewNodeGrid (vm-only — assert NO native classes)**

Create `test/component/views/ViewNodeGrid.NativeClassEmission.test.ts`:
- No `.bases-*` or `.nav-file` regardless of `useNativeDom` value
- `.vm-node-grid-tile` always present

Update `ViewNodeGrid.svelte`: remove the existing `class:nav-file={useNativeDom}`
and `class:nav-file-title={useNativeDom}` (they are no longer correct per
the honest-hybrid rule for grid). Keep `vm-node-grid-tile` and
`vm-node-grid-label`. State mods still emitted via `stateModEmissions`
with `vocab=null`.

Run test, expect PASS.

- [ ] **Step 10: Repeat for ViewNodeList (vm-only)**

Create `test/component/views/ViewNodeList.NativeClassEmission.test.ts`:
- No native classes regardless of `useNativeDom`
- `.vm-view-list-row` always present

Update `ViewNodeList.svelte`: confirm it does not emit native classes (per
inventory, it already doesn't). Add the vocab/state-mod helper call for
uniformity (returns no native classes for list).

Run test, expect PASS.

- [ ] **Step 11: Repeat for viewTree (tree-item* family from contract)**

Create `test/component/views/viewTree.NativeClassEmission.test.ts`:
- `tree-item` on row root when `useNativeDom=true`
- `tree-item-inner` on label wrapper
- `tree-item-self` on inner wrapper
- `collapse-icon` on toggle when row is collapsible
- No native classes when `useNativeDom=false`

Update `viewTree.svelte`: replace hardcoded `class:tree-item={useNativeDom}`
literals with the contract-driven lookup. String values stay the same.

Run test, expect PASS.

- [ ] **Step 12: Run all C8 tests + `pnpm verify`**

```powershell
pnpm vitest run test/component/views/*.NativeClassEmission.test.ts test/unit/services/serviceNodeClassEmission.test.ts
pnpm verify
```

Expected: PASS.

- [ ] **Step 13: Visual smoke on `plugin-dev`**

```powershell
pnpm run build
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
# Switch to native preset
obsidian vault=plugin-dev eval code="plugin.themeService.setPreset('native')"
# Inspect: tree rows have tree-item-self
obsidian vault=plugin-dev eval code="document.querySelector('.tree-item-self') !== null"
# Switch to vaultman preset + table view
obsidian vault=plugin-dev eval code="plugin.themeService.setPreset('vaultman')"
obsidian vault=plugin-dev eval code="/* set viewMode=table */"
obsidian vault=plugin-dev eval code="document.querySelector('.bases-tr') !== null"
# Cards view + native preset
obsidian vault=plugin-dev eval code="/* set viewMode=cards, then setPreset('native') */"
obsidian vault=plugin-dev eval code="document.querySelector('.bases-cards-item') !== null"
obsidian vault=plugin-dev dev:errors
```

Expected: `bases-tr`, `bases-cards-item`, `tree-item-self` all present
under native preset for their respective views. `No errors captured.`

- [ ] **Step 14: Commit**

```powershell
git add src/services/serviceNodeClassEmission.ts src/components/views/*.svelte test/component/views/*.NativeClassEmission.test.ts test/unit/services/serviceNodeClassEmission.test.ts
git commit -m "refactor(0-A): standardize native-class emission per view per preset.useNativeDom

Adds serviceNodeClassEmission helper for state-mod emission. Each of the
5 view components reads explorerViewContract(viewMode).nativeDomEmission
from the PRESET context and emits classes data-driven. Behavior-relevant:
- viewTree: tree-item* family (no string change, sourced from contract)
- ViewNodeTable: switches from nav-file/nav-file-title to bases-tr +
  bases-table-cell + bases-td + bases-table-header
- ViewNodeCards: switches from nav-file/nav-file-title to bases-cards-item +
  bases-cards-property{,mod-title} + bases-cards-cover
- ViewNodeGrid: drops nav-file/nav-file-title (no Bases analog, vm-only)
- ViewNodeList: vm-only (unchanged)

vm-* classes always emit; native classes additive when useNativeDom=true."
```

## Verification gates

- 4 helper unit tests + 5 view component tests pass.
- `pnpm verify` baseline preserved.
- Live smoke: native vocab present under native preset for tree/table/cards,
  absent for list/grid.

## Risk R2 monitoring

After the swap, theme CSS that previously targeted `.nav-file` on
table/cards rows no longer applies. Visual smoke confirms vm-* fallback
styling fills the gap. If a previously-relied-on Obsidian theme rule
left a visible hole (e.g., padding, hover state), add an equivalent
`vm-*` rule in `src/styles/_views.scss` (or wherever per-view styles
live) and document in the commit message.

## Rollback

`git revert <commit>` reverts emission changes. View components fall back
to their pre-C8 hardcoded class emission.
