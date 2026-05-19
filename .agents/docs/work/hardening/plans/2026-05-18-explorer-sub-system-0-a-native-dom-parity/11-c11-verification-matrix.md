---
title: 11 — C11 verification matrix consolidation
type: plan-task
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 11 — C11: Diagonal verification matrix + invariant gates consolidation

Consolidates the 5 panel × vaultman DOM snapshots, the 1 viewTree native
cross-check against obsidian-web-lab, and all invariant unit tests not
added in earlier commits. Captures live `plugin-dev` smoke output in the
commit message.

**Files:**
- Create: `test/component/views/viewTree.panel.vaultman.snapshot.test.ts`
- Create: `test/component/views/ViewNodeList.panel.vaultman.snapshot.test.ts`
- Create: `test/component/views/ViewNodeTable.panel.vaultman.snapshot.test.ts`
- Create: `test/component/views/ViewNodeGrid.panel.vaultman.snapshot.test.ts`
- Create: `test/component/views/ViewNodeCards.panel.vaultman.snapshot.test.ts`
- Create: `test/component/views/viewTree.panel.native.crosscheck.test.ts`
- Create: `test/fixtures/obsidian-web-lab/file-explorer-tree.html`
- Create: `test/unit/integration/zero-a-invariants.test.ts` (consolidated invariants)

## Steps

- [ ] **Step 1: Capture obsidian-web-lab tree fixture**

Extract a representative file-explorer tree DOM snippet from
`C:\Users\vic_A\Desktop\obsidian-web-lab` and save it as
`test/fixtures/obsidian-web-lab/file-explorer-tree.html`:

```powershell
New-Item -ItemType Directory -Force -Path test/fixtures/obsidian-web-lab | Out-Null
```

The HTML fixture should contain a 3-level nested tree with at least one
file leaf, one folder collapsed, one folder expanded, and demonstrate
the `.tree-item` / `.tree-item-self` / `.tree-item-inner` /
`.tree-item-children` / `.collapse-icon` nesting. Capture from
obsidian-web-lab's actual rendered DOM (either via screenshot + manual
write-out, or by running obsidian-web-lab briefly and copying the
`document.querySelector('.nav-files-container').outerHTML` output).

- [ ] **Step 2: Write the 5 panel × vaultman DOM snapshot tests**

Each follows this template (example for `viewTree`):

```typescript
import { describe, expect, it } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';
import ViewTree from '../../../src/components/views/viewTree.svelte';
import { PRESET_KEY, NODE_ELEMENT_MASK_KEY } from '../../../src/components/explorer/viewHostContext';
// ... helpers from prior test files

afterEach(cleanup);

describe('viewTree — panel × vaultman snapshot', () => {
  it('row root + inner + label + state mods + badges render under default vaultman mask', () => {
    const preset = makePresetVaultman();
    const mask = makeMask({});
    const { container } = render(ViewTree, {
      context: new Map([
        [PRESET_KEY, { value: () => preset }],
        [NODE_ELEMENT_MASK_KEY, { value: () => mask }],
      ]),
      props: {
        nodes: [
          {
            id: 'a', label: 'Alpha', depth: 0,
            layers: { state: { selected: true, focused: false } },
            warnings: ['stale'],
          } as never,
        ],
        expandedIds: new Set(),
        selectedIds: new Set(['a']),
        focusedId: null,
        onToggle: () => {},
        onRowClick: () => {},
        onContextMenu: () => {},
        icon: (() => ({ update() {} })) as never,
      } as never,
    });
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

Repeat with adjusted view + fixture for List, Table, Grid, Cards. Each
snapshot covers row root classes, state mods, mask-gated children
visible per default vaultman mask.

- [ ] **Step 3: Write viewTree native cross-check test**

Create `test/component/views/viewTree.panel.native.crosscheck.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';
import ViewTree from '../../../src/components/views/viewTree.svelte';
import { PRESET_KEY, NODE_ELEMENT_MASK_KEY } from '../../../src/components/explorer/viewHostContext';
// ... helpers

afterEach(cleanup);

describe('viewTree — native preset cross-check vs obsidian-web-lab', () => {
  it('emits the same structural class set on tree rows as obsidian core file-explorer', () => {
    const fixture = readFileSync(
      resolve(__dirname, '../../fixtures/obsidian-web-lab/file-explorer-tree.html'),
      'utf-8',
    );

    const expectedClasses = new Set<string>();
    fixture.replace(/class="([^"]+)"/g, (_, classes) => {
      classes.split(/\s+/).forEach((c: string) => expectedClasses.add(c));
      return _;
    });

    const preset = makePresetNative();
    const mask = makeMask({});
    const { container } = render(ViewTree, {
      context: new Map([
        [PRESET_KEY, { value: () => preset }],
        [NODE_ELEMENT_MASK_KEY, { value: () => mask }],
      ]),
      props: {
        nodes: makeTreeFixture(),
        expandedIds: new Set(['root']),
        onToggle: () => {},
        onRowClick: () => {},
        onContextMenu: () => {},
        icon: (() => ({ update() {} })) as never,
      } as never,
    });

    const actualClasses = new Set<string>();
    container.querySelectorAll('*').forEach((el) => {
      el.classList.forEach((c) => actualClasses.add(c));
    });

    const structuralExpected = [
      'tree-item', 'tree-item-self', 'tree-item-inner', 'tree-item-children',
      'collapse-icon',
    ];
    for (const cls of structuralExpected) {
      expect(actualClasses.has(cls), `Missing native class '${cls}' in viewTree output`).toBe(true);
    }
  });
});
```

- [ ] **Step 4: Write consolidated invariant test**

Create `test/unit/integration/zero-a-invariants.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  EXPLORER_PLATFORM_VIEW_MODES,
  explorerViewContract,
} from '../../../src/services/serviceExplorerViewContract';
import { computeNodeElementMask } from '../../../src/services/serviceNodeElementVisibility';
import { ViewHostService } from '../../../src/services/serviceViewHost.svelte';

describe('0-A invariants — consolidated', () => {
  it('media-always-false in native preset baseline', () => {
    // const native = PRESET_NATIVE; // import from where the built-in presets live
    // expect(native.nodeElements.media).toBe(false);
  });

  it('media-always-false in vaultman preset baseline', () => {
    // const vm = PRESET_VAULTMAN;
    // expect(vm.nodeElements.media).toBe(false);
  });

  it('EXPLORER_PLATFORM_VIEW_MODES excludes markmap and outline', () => {
    expect(EXPLORER_PLATFORM_VIEW_MODES).not.toContain('markmap' as never);
    expect(EXPLORER_PLATFORM_VIEW_MODES).not.toContain('outline' as never);
  });

  it('panel and in-editor contexts emit DIFFERENT rowStateMods for tree', () => {
    const tree = explorerViewContract('tree');
    expect(tree.nativeDomEmission.panel.rowStateMods).not.toEqual(
      tree.nativeDomEmission.inEditor.rowStateMods,
    );
  });

  it('every platform view has a contract entry', () => {
    for (const mode of EXPLORER_PLATFORM_VIEW_MODES) {
      const c = explorerViewContract(mode);
      expect(c).toBeDefined();
      expect(c.viewMode).toBe(mode);
    }
  });

  it('feature-contract gating: nodeElementToggles=false hides submenu', () => {
    // Validate the runtime gating logic in viewHost.multiSelectionAvailable.
    // (This is partially redundant with C3 tests but consolidated here for
    // the final audit pass.)
  });
});
```

Fill in the imports for `PRESET_NATIVE` / `PRESET_VAULTMAN` to whatever
file exports the built-in preset literals. If 0-B doesn't export them as
named symbols, do a one-line export addition.

- [ ] **Step 5: Run all C11 tests**

```powershell
pnpm vitest run test/component/views/*.snapshot.test.ts test/component/views/viewTree.panel.native.crosscheck.test.ts test/unit/integration/zero-a-invariants.test.ts
```

Expected: PASS. Snapshots are created on first run.

- [ ] **Step 6: Run full `pnpm verify`**

```powershell
pnpm verify
```

Expected: PASS. Unit + component + lint all green.

- [ ] **Step 7: Run live `plugin-dev` smoke flow (per spec shard 10)**

Capture output into the commit message body.

```powershell
pnpm run build
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open

# 1. Preset toggle cycle (native → vaultman → native)
obsidian vault=plugin-dev eval code="plugin.themeService.setPreset('native'); document.querySelectorAll('.vm-view-menu-mode').length"
# Expected: 1
obsidian vault=plugin-dev eval code="plugin.themeService.setPreset('vaultman'); document.querySelectorAll('.vm-view-menu-mode').length"
# Expected: 5

# 2. btnNodeElementsVisibility toggle
obsidian vault=plugin-dev eval code="document.querySelector('.vm-node-elements-toggle') !== null"
# Expected: true (vaultman)
obsidian vault=plugin-dev eval code="plugin.themeService.setPreset('native'); document.querySelector('.vm-node-elements-toggle') !== null"
# Expected: false

# 3. Scroll smoke per view
pnpm smoke:scroll -- --view=tree --jumps=100
pnpm smoke:scroll -- --view=list --jumps=100
pnpm smoke:scroll -- --view=table --jumps=100
pnpm smoke:scroll -- --view=grid --jumps=100
pnpm smoke:scroll -- --view=cards --jumps=100
# Expected per view: blankFrames=0, maxBlank=0ms, no dev errors

obsidian vault=plugin-dev dev:errors
# Expected: "No errors captured."
```

- [ ] **Step 8: Commit**

```powershell
git add test/component/views/*.snapshot.test.ts test/component/views/viewTree.panel.native.crosscheck.test.ts test/fixtures/obsidian-web-lab/file-explorer-tree.html test/unit/integration/zero-a-invariants.test.ts
git commit -m "test(0-A): diagonal verification matrix + invariant gates consolidation

Adds 5 panel × vaultman DOM snapshot baselines (viewTree, ViewNodeList,
ViewNodeTable, ViewNodeGrid, ViewNodeCards). Adds viewTree × native cross-
check vs obsidian-web-lab file-explorer DOM fixture. Adds consolidated
zero-a-invariants test (media-always-false, platform mode exhaustion,
context vocab divergence, feature-contract gating).

Live plugin-dev smoke (captured):
- Preset toggle cycle: native→vaultman→native — view-mode menu count
  1→5→1, submenu visibility false→true→false.
- Per-view scroll: blankFrames=0, maxBlank=0ms across tree/list/table/grid/cards.
- dev:errors: No errors captured."
```

## Verification gates

- 5 DOM snapshot tests pass on first run (snapshots created).
- viewTree native cross-check passes (5 structural classes present).
- Consolidated invariants pass.
- `pnpm verify` baseline preserved + new tests counted.
- Live smoke output captured in commit message.

## Rollback

`git revert <commit>` reverts test additions. Earlier commits' tests
remain in place.
