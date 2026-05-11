---
title: T2 Engine & High-Performance Views
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/index|ui-modernization-vertical-threads]]"
created: 2026-05-11T23:55:00
updated: 2026-05-11T05:01:54
tags:
  - agent/plan
  - thread/engine-views
  - pretextjs
  - virtualization
  - adopted-nodes
  - tanstack
  - svelte5
created_by: opus
updated_by: codex
---

# T2 Engine & High-Performance Views

> **For agentic workers:** Implement tasks 2.0 → 2.7 in order. TDD per task.
> Do not commit unless the user authorizes a commit. T2 starts only after
> T1 ships task 1.5 (`.vm-root` arbitration on the frame).

## Scope

T2 owns every high-performance node surface: virtualized tables, grids,
card lists, and tree explorers. It integrates PretextJS for dynamic row
measurement, migrates the existing TanStack Table + Virtual stack to
PretextJS-derived heights, ships the new `explorerOutline` provider that
introduces **Adopted Nodes** (Markdown headers / tasks / blocks treated
as virtual children of file nodes), and wires the `tabOutlines` explorer
into the workspace.

## Files

- Modify: `src/services/serviceTextMeasure.ts`
- Modify: `src/services/serviceVirtualizer.svelte.ts`
- Modify: `src/services/serviceViews.svelte.ts`
- Modify: `src/services/serviceViewTableAdapter.ts`
- Modify: `src/services/serviceExplorer.svelte.ts`
- Modify: `src/providers/explorerFiles.ts`
- Modify: `src/providers/explorerSnippets.ts`
- Modify: `src/providers/explorerPlugins.ts`
- Modify: `src/components/views/ViewNodeTable.svelte`
- Modify: `src/components/views/ViewNodeGrid.svelte`
- Modify: `src/components/views/ViewNodeCards.svelte`
- Modify: `src/components/views/viewTree.svelte`
- Create: `src/providers/explorerOutline.ts`
- Create: `src/types/typeAdoptedNode.ts`
- Create: `src/services/serviceAdoption.svelte.ts`
- Create: `test/unit/services/serviceTextMeasurePretext.test.ts`
- Create: `test/unit/services/serviceAdoption.test.ts`
- Create: `test/unit/providers/explorerOutline.test.ts`
- Create: `test/component/viewNodeTableHeightmap.test.ts`
- Create: `test/component/viewTreeAdoptedNodes.test.ts`
- Create: `test/component/viewNodeMirrorClasses.test.ts`

Read-only (T2 must not edit): `src/services/serviceDiff.ts`,
`src/services/serviceQueue.svelte.ts`, all overlay/portal surfaces,
DnD services, settings UI, theme service.

## Source Specs Consumed

- 02 BETA Data Virtualization (PretextJS, TanStack patterns).
- 08 New Explorers & Adopted Nodes (outline as virtual tree, snippets,
  plugins, folder fix).
- 10 Visual Polish (gadget property editors are out of T2 — listed in T4
  for Bits UI integration).
- 11 Bits UI Main View (Adopted Nodes & cross-pollination — outline side).

## Dependencies

- **Before T2 starts:** T1 task 1.5 (`.vm-root` arbitration) must be live
  so view components can read `themeService.useNativeDom` to switch DOM
  shape.
- **Coordination with T1:** If task 1.7 (snippet mimicry smoke) failed
  because a view did not emit the mirror class, T2 task 2.3 fixes the
  emission per-view.
- **Coordination with T3:** Snapshot timeline view in T3 reuses T2's
  PretextJS-measured `ViewNodeCards`. Keep `ViewNodeCards`'s public
  props stable; flag any breaking change to T3 in the handoff.

---

## Task 2.0 — Gate: confirm T1 contracts available

- [ ] **Step 1 — Confirm `serviceTheme.svelte.ts` exports**

```bash
node -e "const m=require('./src/services/serviceTheme.svelte.ts'.replace(/.ts$/,''));console.log(typeof require)" 2>&1 | head -n 1
```

The actual probe is to read `src/services/serviceTheme.svelte.ts` and
confirm the `ThemeService` class plus `useNativeDom` / `useUtilities`
getters. If missing, halt T2 and notify T1.

- [ ] **Step 2 — Confirm `@chenglou/pretext` is installed**

```bash
node -e "const p=require('./package.json'); console.log(p.dependencies['@chenglou/pretext'])"
```

Expected: `^0.0.6`. If `undefined`, the install regressed; add it back
to `dependencies` and re-run `pnpm install`.

---

## Task 2.1 — PretextJS heightmap in `serviceTextMeasure`

**Files:**

- Modify: `src/services/serviceTextMeasure.ts`
- Modify: `src/services/serviceVirtualizer.svelte.ts`
- Create: `test/unit/services/serviceTextMeasurePretext.test.ts`

- [ ] **Step 1 — Failing test for height measurement**

`test/unit/services/serviceTextMeasurePretext.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { TextMeasureService } from '../../../src/services/serviceTextMeasure';

describe('TextMeasureService — Pretext heightmap', () => {
    let svc: TextMeasureService;

    beforeEach(() => {
        svc = new TextMeasureService({
            font: 'var(--font-interface)',
            fontSize: '14px',
        });
    });

    it('returns a number for measureRowHeight', () => {
        const h = svc.measureRowHeight('Short label', { width: 240 });
        expect(typeof h).toBe('number');
        expect(h).toBeGreaterThan(8);
    });

    it('returns greater height for wrapped multi-line labels at narrow widths', () => {
        const long = 'A label '.repeat(40);
        const wide = svc.measureRowHeight(long, { width: 1000 });
        const narrow = svc.measureRowHeight(long, { width: 120 });
        expect(narrow).toBeGreaterThan(wide);
    });

    it('caches by (label, width) so repeated calls do not re-measure', () => {
        const before = svc.cacheMisses;
        svc.measureRowHeight('Cached label', { width: 240 });
        svc.measureRowHeight('Cached label', { width: 240 });
        expect(svc.cacheMisses - before).toBe(1);
    });

    it('clears cache on invalidate(label)', () => {
        svc.measureRowHeight('K', { width: 240 });
        const before = svc.cacheMisses;
        svc.invalidate('K');
        svc.measureRowHeight('K', { width: 240 });
        expect(svc.cacheMisses - before).toBe(1);
    });
});
```

- [ ] **Step 2 — Run to verify failure**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTextMeasurePretext.test.ts --fileParallelism=false
```

Expected: FAIL — class shape mismatch or missing cache.

- [ ] **Step 3 — Extend `serviceTextMeasure.ts`**

```ts
import { Pretext } from '@chenglou/pretext';

export interface MeasureOptions {
    width: number;
    lineHeight?: number;
}

export class TextMeasureService {
    private pretext: Pretext;
    private cache = new Map<string, number>();
    cacheMisses = 0;

    constructor(opts: { font: string; fontSize: string }) {
        this.pretext = new Pretext({ font: opts.font, fontSize: opts.fontSize });
    }

    measureRowHeight(label: string, opts: MeasureOptions): number {
        const key = `${opts.width}|${label}`;
        const hit = this.cache.get(key);
        if (hit !== undefined) return hit;
        this.cacheMisses += 1;
        const measured = this.pretext.measure(label, { width: opts.width });
        const padded = Math.max(measured.height + 4, opts.lineHeight ?? 22);
        this.cache.set(key, padded);
        return padded;
    }

    invalidate(label: string): void {
        for (const key of [...this.cache.keys()]) {
            if (key.endsWith(`|${label}`)) this.cache.delete(key);
        }
    }

    invalidateAll(): void {
        this.cache.clear();
    }
}
```

If a `TextMeasureService` already exists with a different shape, **rename
the legacy methods to** `legacyMeasureRowHeight` etc. **and route them to
the new pretext-backed implementations.** Do not introduce a parallel
service.

- [ ] **Step 4 — Wire `serviceVirtualizer.svelte.ts` to consult the heightmap**

Find the `estimateSize` function in the virtualizer (currently returns
`TABLE_ROW_HEIGHT` constant). Replace with:

```ts
estimateSize: (index: number): number => {
    const node = this.nodes[index];
    return this.textMeasure.measureRowHeight(node.label, {
        width: this.columnWidth,
    });
},
```

Inject `textMeasure` and `columnWidth` via constructor. The virtualizer
already accepts `count` and `getScrollElement`; add the two new
dependencies.

- [ ] **Step 5 — Re-run unit tests**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTextMeasurePretext.test.ts --fileParallelism=false
```

Expected: PASS, 4/4.

---

## Task 2.2 — ViewNodeTable migration to PretextJS heights + mode-aware DOM

**Files:**

- Modify: `src/components/views/ViewNodeTable.svelte`
- Create: `test/component/viewNodeTableHeightmap.test.ts`

- [ ] **Step 1 — Failing component test**

`test/component/viewNodeTableHeightmap.test.ts`:

```ts
import { mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ViewNodeTable from '../../src/components/views/ViewNodeTable.svelte';
import { ThemeService } from '../../src/services/serviceTheme.svelte';

let host: HTMLDivElement;
let app: ReturnType<typeof mount> | null = null;

beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
});
afterEach(() => {
    if (app) unmount(app);
    host.remove();
});

const NODES = Array.from({ length: 50 }, (_, i) => ({
    id: `n-${i}`,
    label: i % 7 === 0 ? `Wrap me ${('lorem '.repeat(20))}` : `Short ${i}`,
    kind: 'file' as const,
}));

describe('ViewNodeTable PretextJS heightmap', () => {
    it('renders rows at differing absolute tops when labels wrap', () => {
        const theme = new ThemeService();
        theme.mode = 'thick';
        app = mount(ViewNodeTable, {
            target: host,
            props: { nodes: NODES, themeService: theme, columnWidth: 200 },
        });
        const rows = Array.from(
            host.querySelectorAll('[data-vm-row]') as NodeListOf<HTMLElement>,
        );
        expect(rows.length).toBeGreaterThan(0);
        const tops = rows.map((r) => Number(r.style.top.replace('px', '')));
        const deltas = tops.slice(1).map((t, i) => t - tops[i]);
        const uniques = new Set(deltas).size;
        expect(uniques).toBeGreaterThan(1);
    });

    it('emits nav-file class on rows when Thin + native', () => {
        const theme = new ThemeService();
        theme.mode = 'thin';
        theme.identity = 'native';
        app = mount(ViewNodeTable, {
            target: host,
            props: { nodes: NODES, themeService: theme, columnWidth: 200 },
        });
        expect(host.querySelector('.nav-file')).toBeTruthy();
    });
});
```

- [ ] **Step 2 — Run to verify failure**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewNodeTableHeightmap.test.ts --fileParallelism=false
```

Expected: FAIL.

- [ ] **Step 3 — Migrate `ViewNodeTable.svelte`**

The current implementation uses `TABLE_ROW_HEIGHT = 32`. Replace the
estimation with the virtualizer-resolved heights, and add mode-aware
class arbitration:

```svelte
<script lang="ts">
    import { onMount } from 'svelte';
    import { TextMeasureService } from '../../services/serviceTextMeasure';
    import type { ThemeService } from '../../services/serviceTheme.svelte';
    import type { NodeRow } from '../../types/typeNode';
    import { VirtualizerService } from '../../services/serviceVirtualizer.svelte';

    interface Props {
        nodes: NodeRow[];
        themeService: ThemeService;
        textMeasure?: TextMeasureService;
        columnWidth: number;
    }
    let { nodes, themeService, textMeasure, columnWidth }: Props = $props();

    const measure = textMeasure ?? new TextMeasureService({
        font: 'var(--font-interface)',
        fontSize: '14px',
    });

    let scrollEl: HTMLDivElement;
    const virtualizer = new VirtualizerService({
        count: () => nodes.length,
        getScrollElement: () => scrollEl,
        estimate: (i) => measure.measureRowHeight(nodes[i].label, { width: columnWidth }),
        overscan: 8,
    });

    const totalHeight = $derived(virtualizer.totalSize);
    const items = $derived(virtualizer.items);
    const rowClass = $derived(themeService.useNativeDom ? 'nav-file' : 'vm-node-row');
</script>

<div bind:this={scrollEl} class="vm-node-table-scroll">
    <div class="vm-node-table-body" style="height: {totalHeight}px; position: relative;">
        {#each items as item (item.key)}
            {@const node = nodes[item.index]}
            <div
                data-vm-row
                class="{rowClass} vm-node-table-row"
                style="position: absolute; top: {item.start}px; width: 100%; height: {item.size}px;"
            >
                <div class="nav-file-title vm-node-table-cell">{node.label}</div>
            </div>
        {/each}
    </div>
</div>
```

If the project's `serviceVirtualizer.svelte.ts` does not yet expose
`totalSize` / `items` / `key` like this, extend it. Keep TanStack
Virtual under the hood; the wrapper class adapts to Vaultman naming.

- [ ] **Step 4 — Run + iterate**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewNodeTableHeightmap.test.ts --fileParallelism=false
```

Expected: PASS, 2/2. If the wrap test fails because labels produced
identical heights, increase the wrap label length or narrow
`columnWidth` further.

---

## Task 2.3 — Mirror class arbitration across grid, cards, tree

**Files:**

- Modify: `src/components/views/ViewNodeGrid.svelte`
- Modify: `src/components/views/ViewNodeCards.svelte`
- Modify: `src/components/views/viewTree.svelte`
- Create: `test/component/viewNodeMirrorClasses.test.ts`

- [x] **Step 1 — Failing test**

`test/component/viewNodeMirrorClasses.test.ts`:

```ts
import { mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ViewNodeGrid from '../../src/components/views/ViewNodeGrid.svelte';
import ViewNodeCards from '../../src/components/views/ViewNodeCards.svelte';
import viewTree from '../../src/components/views/viewTree.svelte';
import { ThemeService } from '../../src/services/serviceTheme.svelte';

const NODES = [
    { id: 'a', label: 'A', kind: 'file' as const },
    { id: 'b', label: 'B', kind: 'file' as const },
];
const TREE = [
    { id: 't1', label: 't1', kind: 'folder' as const, children: [
        { id: 'c1', label: 'c1', kind: 'file' as const },
    ] },
];

const cases = [
    { name: 'grid', comp: ViewNodeGrid, native: 'nav-file', props: { nodes: NODES } },
    { name: 'cards', comp: ViewNodeCards, native: 'nav-file', props: { nodes: NODES } },
    { name: 'tree', comp: viewTree, native: 'tree-item', props: { tree: TREE } },
];

let host: HTMLDivElement;
const apps: ReturnType<typeof mount>[] = [];
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
afterEach(() => { while (apps.length) unmount(apps.pop()!); host.remove(); });

describe('mirror class arbitration', () => {
    for (const c of cases) {
        it(`${c.name} emits ${c.native} in Thin + native`, () => {
            const theme = new ThemeService();
            theme.mode = 'thin';
            theme.identity = 'native';
            apps.push(mount(c.comp as any, {
                target: host,
                props: { ...c.props, themeService: theme },
            }));
            expect(host.querySelector(`.${c.native}`)).toBeTruthy();
        });

        it(`${c.name} drops ${c.native} in Thick + bases`, () => {
            const theme = new ThemeService();
            theme.mode = 'thick';
            theme.identity = 'bases';
            apps.push(mount(c.comp as any, {
                target: host,
                props: { ...c.props, themeService: theme },
            }));
            expect(host.querySelector(`.${c.native}`)).toBeFalsy();
        });
    }
});
```

- [x] **Step 2 — Run to confirm failure**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewNodeMirrorClasses.test.ts --fileParallelism=false
```

Expected: FAIL on at least three cases.

- [x] **Step 3 — Implement polymorphic class application**

In each of `ViewNodeGrid.svelte`, `ViewNodeCards.svelte`, and
`viewTree.svelte`, add a `themeService` prop and apply class arbitration
on the row root via `class:`:

```svelte
<script lang="ts">
    import type { ThemeService } from '../../services/serviceTheme.svelte';
    interface Props {
        nodes /* or tree */: /* ... */;
        themeService: ThemeService;
    }
    let { nodes, themeService /*, …existing props*/ }: Props = $props();
    const useNative = $derived(themeService.useNativeDom);
</script>

<!-- For grid / cards / list rows: -->
<div
    class="{useNative ? 'nav-file' : 'vm-node'} vm-node-grid-tile"
    class:nav-file-title={useNative}
>...</div>

<!-- For tree rows: -->
<div class:tree-item={useNative} class:vm-tree-item={!useNative}>
    <div class:tree-item-self={useNative} class:vm-tree-item-self={!useNative}>
        <span class:tree-item-inner={useNative}>{label}</span>
    </div>
</div>
```

- [x] **Step 4 — Re-run test**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewNodeMirrorClasses.test.ts test/component/snippetMimicry.test.ts --fileParallelism=false
```

Expected: PASS, 6/6 + (T1) 3/3.

Execution note, 2026-05-11T03:34:26:

- Created `test/component/viewNodeMirrorClasses.test.ts` and confirmed RED:
  3/3 failures on missing `nav-file`, `nav-file-title`, `tree-item`,
  `tree-item-self`, and `tree-item-inner` mirror classes.
- Implemented optional `themeService` props in `ViewNodeGrid.svelte`,
  `ViewNodeCards.svelte`, and `viewTree.svelte`; the views now emit native
  mirror classes only when `themeService.useNativeDom` is true.
- GREEN:
  `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewNodeMirrorClasses.test.ts --fileParallelism=false`
  passed 3/3.
- Focused regression gate:
  `pnpm exec vp test run --project component --config vitest.config.ts test/component/viewNodeMirrorClasses.test.ts test/component/viewGridHoverBadges.test.ts test/component/viewGridSelection.test.ts test/component/viewNodeCards.test.ts test/component/viewTreeDecorations.test.ts test/component/viewTreeHoverBadges.test.ts test/component/viewTreeSelection.test.ts --fileParallelism=false`
  passed 7 files / 61 tests.
- Svelte autofixer returned `issues: []` for `ViewNodeGrid.svelte`,
  `ViewNodeCards.svelte`, and `viewTree.svelte`.
- T1 caveat: `test/component/snippetMimicry.test.ts` is still absent, so the
  T1.7 smoke remains open; this T2.3 slice supplied the view-level mirror
  class emissions that T1.7 will consume.

Integration note, 2026-05-11T03:53:32:

- `PanelExplorer` now passes `plugin.themeService` into `ViewTree`,
  `ViewNodeGrid`, `ViewNodeCards`, and `ViewNodeTable`, so mirror classes are
  live through the production adapter rather than only direct component mounts.
- `ViewNodeTable` now accepts optional `themeService` and emits
  `nav-file`, `nav-file-title`, `metadata-property`, and
  `metadata-property-key` when native DOM mode is active.
- `test/component/snippetMimicry.test.ts` now covers the panel-level route
  for `nav-file-title`, `tree-item-self`, and `metadata-property`; T1.7 is
  closed in the T1 shard.

---

## Task 2.4 — `explorerOutline` provider (Adopted Nodes)

**Files:**

- Create: `src/types/typeAdoptedNode.ts`
- Create: `src/providers/explorerOutline.ts`
- Create: `test/unit/providers/explorerOutline.test.ts`

- [x] **Step 1 — Author the adopted-node type**

`src/types/typeAdoptedNode.ts`:

```ts
import type { TFile } from 'obsidian';

export type AdoptedNodeKind = 'header' | 'task' | 'block';

export interface AdoptedNode {
    id: string;
    parentPath: string;
    file: TFile;
    kind: AdoptedNodeKind;
    label: string;
    depth: number;
    line: number;
    blockId?: string;
    taskState?: ' ' | 'x' | '/' | '-';
    children: AdoptedNode[];
}
```

- [x] **Step 2 — Failing provider test**

`test/unit/providers/explorerOutline.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { buildOutlineForFile } from '../../../src/providers/explorerOutline';

const SAMPLE = `# Top
Some text

## Sub one
- [ ] Task A
- [x] Task B

## Sub two
^block-id-here

# Top two
`;

describe('explorerOutline buildOutlineForFile', () => {
    it('flattens H1/H2 into a nested tree', () => {
        const tree = buildOutlineForFile({
            path: 'note.md',
            content: SAMPLE,
            file: { path: 'note.md', basename: 'note' } as any,
        });
        expect(tree.length).toBe(2);
        expect(tree[0].kind).toBe('header');
        expect(tree[0].label).toBe('Top');
        expect(tree[0].children.length).toBe(2);
        expect(tree[0].children[0].label).toBe('Sub one');
    });

    it('captures tasks as children of nearest header', () => {
        const tree = buildOutlineForFile({
            path: 'note.md',
            content: SAMPLE,
            file: { path: 'note.md', basename: 'note' } as any,
        });
        const subOne = tree[0].children[0];
        const tasks = subOne.children.filter((c) => c.kind === 'task');
        expect(tasks.length).toBe(2);
        expect(tasks[0].taskState).toBe(' ');
        expect(tasks[1].taskState).toBe('x');
    });

    it('captures block references', () => {
        const tree = buildOutlineForFile({
            path: 'note.md',
            content: SAMPLE,
            file: { path: 'note.md', basename: 'note' } as any,
        });
        const subTwo = tree[0].children[1];
        const block = subTwo.children.find((c) => c.kind === 'block');
        expect(block).toBeTruthy();
        expect(block?.blockId).toBe('block-id-here');
    });
});
```

- [x] **Step 3 — Run to confirm failure**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/providers/explorerOutline.test.ts --fileParallelism=false
```

Expected: FAIL.

- [x] **Step 4 — Implement `explorerOutline.ts`**

```ts
import type { TFile } from 'obsidian';
import type { AdoptedNode, AdoptedNodeKind } from '../types/typeAdoptedNode';

interface BuildInput {
    path: string;
    content: string;
    file: TFile;
}

const HEADER_RE = /^(#{1,6})\s+(.*)$/;
const TASK_RE = /^[\t ]*-\s+\[([ xX\/\-])\]\s+(.*)$/;
const BLOCK_RE = /\^([A-Za-z0-9_-]+)\s*$/;

export function buildOutlineForFile(input: BuildInput): AdoptedNode[] {
    const lines = input.content.split('\n');
    const roots: AdoptedNode[] = [];
    const stack: AdoptedNode[] = [];

    function pushChild(node: AdoptedNode) {
        if (stack.length === 0) {
            roots.push(node);
        } else {
            stack[stack.length - 1].children.push(node);
        }
    }

    function attachLeaf(kind: AdoptedNodeKind, label: string, line: number, extras: Partial<AdoptedNode>): void {
        const parent = stack[stack.length - 1];
        if (!parent) return;
        parent.children.push({
            id: `${input.path}::L${line}::${kind}`,
            parentPath: input.path,
            file: input.file,
            kind,
            label,
            depth: parent.depth + 1,
            line,
            children: [],
            ...extras,
        });
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const header = line.match(HEADER_RE);
        if (header) {
            const depth = header[1].length;
            while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
            const node: AdoptedNode = {
                id: `${input.path}::L${i}::header`,
                parentPath: input.path,
                file: input.file,
                kind: 'header',
                label: header[2].trim(),
                depth,
                line: i,
                children: [],
            };
            pushChild(node);
            stack.push(node);
            continue;
        }
        const task = line.match(TASK_RE);
        if (task) {
            const state = task[1] as ' ' | 'x' | '/' | '-';
            attachLeaf('task', task[2].trim(), i, { taskState: state });
            continue;
        }
        const block = line.match(BLOCK_RE);
        if (block) {
            attachLeaf('block', `^${block[1]}`, i, { blockId: block[1] });
            continue;
        }
    }

    return roots;
}
```

- [x] **Step 5 — Re-run + assert green**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/providers/explorerOutline.test.ts --fileParallelism=false
```

Expected: PASS, 3/3.

---

## Task 2.5 — Cross-pollination: `explorerFiles` can adopt outline headers

**Files:**

- Modify: `src/providers/explorerFiles.ts`
- Create: `src/services/serviceAdoption.svelte.ts`
- Create: `test/unit/services/serviceAdoption.test.ts`

- [x] **Step 1 — Author the adoption service**

`src/services/serviceAdoption.svelte.ts`:

```ts
import type { AdoptedNode } from '../types/typeAdoptedNode';

export class AdoptionService {
    enabled = $state(false);
    adoptHeaders = $state(true);
    adoptTasks = $state(false);
    adoptBlocks = $state(false);

    filterChildren(children: AdoptedNode[]): AdoptedNode[] {
        if (!this.enabled) return [];
        const out: AdoptedNode[] = [];
        for (const c of children) {
            if (c.kind === 'header' && !this.adoptHeaders) continue;
            if (c.kind === 'task' && !this.adoptTasks) continue;
            if (c.kind === 'block' && !this.adoptBlocks) continue;
            out.push({ ...c, children: this.filterChildren(c.children) });
        }
        return out;
    }
}
```

- [x] **Step 2 — Failing service test**

`test/unit/services/serviceAdoption.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { AdoptionService } from '../../../src/services/serviceAdoption.svelte';
import type { AdoptedNode } from '../../../src/types/typeAdoptedNode';

function mkNode(kind: AdoptedNode['kind'], children: AdoptedNode[] = []): AdoptedNode {
    return {
        id: kind,
        parentPath: 'p',
        file: {} as any,
        kind,
        label: kind,
        depth: 0,
        line: 0,
        children,
    };
}

describe('AdoptionService', () => {
    it('returns [] when disabled', () => {
        const svc = new AdoptionService();
        expect(svc.filterChildren([mkNode('header')])).toEqual([]);
    });

    it('passes headers when enabled and adoptHeaders is true', () => {
        const svc = new AdoptionService();
        svc.enabled = true;
        const out = svc.filterChildren([mkNode('header'), mkNode('task'), mkNode('block')]);
        expect(out.map((n) => n.kind)).toEqual(['header']);
    });

    it('passes tasks when adoptTasks is on, skips blocks when adoptBlocks is off', () => {
        const svc = new AdoptionService();
        svc.enabled = true;
        svc.adoptTasks = true;
        const out = svc.filterChildren([mkNode('header'), mkNode('task'), mkNode('block')]);
        expect(out.map((n) => n.kind)).toEqual(['header', 'task']);
    });

    it('recurses into headers, filtering nested children', () => {
        const svc = new AdoptionService();
        svc.enabled = true;
        svc.adoptTasks = true;
        const tree = [mkNode('header', [mkNode('task'), mkNode('block')])];
        const out = svc.filterChildren(tree);
        expect(out[0].children.map((n) => n.kind)).toEqual(['task']);
    });
});
```

- [ ] **Step 3 — Implement adoption in `explorerFiles`**

In `src/providers/explorerFiles.ts`, find the function that produces
children for a file node (likely `getChildrenForFile` or equivalent).
Inject an `AdoptionService` instance + `buildOutlineForFile` and
concatenate adopted children:

```ts
import { buildOutlineForFile } from './explorerOutline';

export function getChildrenForFile(file: TFile, ctx: {
    adoption: AdoptionService;
    readContent: (file: TFile) => Promise<string>;
}): AdoptedNode[] {
    if (!ctx.adoption.enabled) return [];
    return ctx.adoption.filterChildren(
        buildOutlineForFile({
            path: file.path,
            content: '/* lazy-loaded; see callers */',
            file,
        }),
    );
}
```

The actual `readContent` integration depends on how `explorerFiles`
currently lazy-loads; do not block the synchronous tree on disk reads.
If the existing provider exposes a `children()` async API, wire
adoption into it. If it does not, leave a TODO with the exact line and
flag the integration in the handoff.

- [x] **Step 4 — Run tests**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceAdoption.test.ts test/unit/providers/explorerOutline.test.ts --fileParallelism=false
```

Expected: PASS, 7/7.

Execution note, 2026-05-11T04:31:26:

- Subagent completed the T2.4/T2.5 foundation without touching
  `explorerFiles.ts`.
- `src/types/typeAdoptedNode.ts`, `src/services/serviceAdoption.svelte.ts`,
  and the base adoption service tests already existed and matched the plan
  foundation.
- Extended `src/providers/explorerOutline.ts` and
  `test/unit/providers/explorerOutline.test.ts` to normalize uppercase task
  state (`[X] -> x`), preserve `/` and `-`, strip a trailing block reference
  from task labels, and add a sibling adopted `block` node for task-line block
  references.
- RED:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/providers/explorerOutline.test.ts test/unit/services/serviceAdoption.test.ts --fileParallelism=false`
  failed 1/10 because task-line block refs did not include `task-block`.
- GREEN: the same command passed 2 files / 10 tests.
- Focused unit gate with `serviceTheme`:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTheme.test.ts test/unit/providers/explorerOutline.test.ts test/unit/services/serviceAdoption.test.ts --fileParallelism=false`
  passed 3 files / 14 tests.
- Svelte autofixer CLI returned `issues: []` for
  `src/services/serviceAdoption.svelte.ts`.
- T2.5 Step 3 remains open: `explorerFiles.getTree()` is synchronous around
  `src/providers/explorerFiles.ts:101-120`, so adopted-node content requires an
  async or cache-backed content stage before it can be safely concatenated into
  file-node children.

---

## Task 2.6 — Folder context menu + "is in folder" filter badge

**Files:**

- Modify: `src/providers/explorerFiles.ts`
- Modify: `src/services/serviceCMenu.ts`
- Modify: `src/services/serviceFilter.svelte.ts`

- [x] **Step 1 — Failing test for folder context menu**

`test/unit/providers/explorerFilesFolderMenu.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { canShowContextMenu } from '../../../src/providers/explorerFiles';

describe('explorerFiles folder context menu', () => {
    it('returns true for folder nodes', () => {
        const node = { id: 'f', kind: 'folder' as const, label: 'F' };
        expect(canShowContextMenu(node)).toBe(true);
    });
});
```

- [x] **Step 2 — Implement**

In `explorerFiles.ts`, ensure that `handleContextMenu` accepts both
`file` and `folder` kinds. Per spec 08: folders **must** support
context menus and the "Create Node Note" action. Update the predicate
that previously skipped folders.

For the filter side: when a folder is selected, the folder must NOT
join the global filter list. Instead, expose a "Filter: is in folder
<name>" badge that the user can click. In `serviceFilter.svelte.ts`,
add:

```ts
addIsInFolderFilter(folder: { path: string; name: string }): void {
    const id = `folder:${folder.path}`;
    if (this.activeFilters.find((f) => f.id === id)) return;
    this.activeFilters.push({
        id,
        kind: 'is-in-folder',
        label: `is in folder ${folder.name}`,
        match: (file) => file.path.startsWith(folder.path + '/'),
    });
}
```

- [x] **Step 3 — Run unit suite**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/providers/explorerFilesFolderMenu.test.ts --fileParallelism=false
```

Expected: PASS.

Execution note, 2026-05-11T05:01:54:

- Implemented T2.6 using existing test files rather than creating
  `test/unit/providers/explorerFilesFolderMenu.test.ts`, because this repo's
  explorer provider tests live under `test/unit/components/explorerFiles.test.ts`.
- RED, folder context:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/components/explorerFiles.test.ts --fileParallelism=false`
  failed 1/15 after fixture correction because `handleContextMenu` made zero
  calls for folder nodes.
- RED, folder filter badge:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceFilter.test.ts --fileParallelism=false`
  failed 1/21 because `FilterService.addIsInFolderFilter` did not exist.
- GREEN:
  `test/unit/components/explorerFiles.test.ts` passed 15/15 and
  `test/unit/services/serviceFilter.test.ts` passed 21/21.
- Focused regression gate:
  `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/components/explorerFiles.test.ts test/unit/services/serviceFilter.test.ts test/unit/services/serviceCMenu.test.ts test/unit/services/serviceActiveFiltersIndex.test.ts --fileParallelism=false`
  passed 4 files / 48 tests.
- Implementation:
  `explorerFiles.handleContextMenu` now opens panel context menus for folder
  nodes; `explorerFiles` registers `folder.filter`, whose label is
  `Filter: is in folder <name>` and whose action calls
  `FilterService.addIsInFolderFilter`; `FilterService` deduplicates
  `folder:<path>` rules and exposes `is in folder <path>` through
  `getFlatRules()`.
- Svelte autofixer on `serviceFilter.svelte.ts`: `issues: []`; it suggested
  replacing existing internal `Set` instances with `SvelteSet`, but those sets
  are non-rendering subscriber/deduplication internals and were left unchanged
  for scope control.

---

## Task 2.7 — `tabOutlines` workspace tab

**Files:**

- Modify: `src/services/serviceViews.svelte.ts` (register the new tab)
- Create: `src/components/views/viewOutlineExplorer.svelte`
- Create: `test/component/viewTreeAdoptedNodes.test.ts`

- [ ] **Step 1 — Failing test**

`test/component/viewTreeAdoptedNodes.test.ts`:

```ts
import { mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import viewOutlineExplorer from '../../src/components/views/viewOutlineExplorer.svelte';
import { ThemeService } from '../../src/services/serviceTheme.svelte';
import { AdoptionService } from '../../src/services/serviceAdoption.svelte';
import type { AdoptedNode } from '../../src/types/typeAdoptedNode';

const adoption = new AdoptionService();
adoption.enabled = true;

const tree: AdoptedNode[] = [
    { id: 'h1', kind: 'header', label: 'Top', depth: 1, line: 0, parentPath: 'n.md', file: {} as any, children: [
        { id: 't1', kind: 'task', label: 'Do X', depth: 2, line: 1, parentPath: 'n.md', taskState: ' ', file: {} as any, children: [] },
    ] },
];

const apps: ReturnType<typeof mount>[] = [];
afterEach(() => { while (apps.length) unmount(apps.pop()!); });

describe('viewOutlineExplorer', () => {
    it('renders header + task as adopted tree rows', () => {
        const host = document.createElement('div');
        document.body.appendChild(host);
        const theme = new ThemeService();
        theme.mode = 'thin';
        theme.identity = 'outline';
        apps.push(mount(viewOutlineExplorer, {
            target: host,
            props: { tree, themeService: theme, adoptionService: adoption },
        }));
        expect(host.querySelectorAll('.tree-item').length).toBeGreaterThanOrEqual(2);
        host.remove();
    });
});
```

- [ ] **Step 2 — Implement `viewOutlineExplorer.svelte`**

```svelte
<script lang="ts">
    import type { AdoptedNode } from '../../types/typeAdoptedNode';
    import type { ThemeService } from '../../services/serviceTheme.svelte';
    import type { AdoptionService } from '../../services/serviceAdoption.svelte';

    interface Props {
        tree: AdoptedNode[];
        themeService: ThemeService;
        adoptionService: AdoptionService;
    }
    let { tree, themeService, adoptionService }: Props = $props();

    const useNative = $derived(themeService.useNativeDom);

    function iconFor(kind: AdoptedNode['kind']): string {
        if (kind === 'header') return 'i-lucide-heading';
        if (kind === 'task') return 'i-lucide-square-check';
        return 'i-lucide-bookmark';
    }
</script>

{#snippet row(node: AdoptedNode)}
    <div
        class:tree-item={useNative}
        class:vm-outline-row={!useNative}
        style="padding-left: {node.depth * 12}px"
    >
        <div class:tree-item-self={useNative} class:vm-outline-self={!useNative}>
            <span class="{iconFor(node.kind)} vm-outline-icon"></span>
            <span class:tree-item-inner={useNative}>{node.label}</span>
        </div>
        {#if node.children.length}
            <div class:tree-item-children={useNative} class:vm-outline-children={!useNative}>
                {#each node.children as child (child.id)}
                    {@render row(child)}
                {/each}
            </div>
        {/if}
    </div>
{/snippet}

<div class="vm-outline-explorer" data-vm-explorer="outline">
    {#each tree as node (node.id)}
        {@render row(node)}
    {/each}
</div>
```

- [ ] **Step 3 — Register the tab**

In `serviceViews.svelte.ts`, append an outline-tab descriptor matching
the existing tab registry shape. Read the file to confirm shape — do
not invent fields. Add the i18n key `tabs.outline.title` to locales.

- [ ] **Step 4 — Run tests + check + build**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeAdoptedNodes.test.ts --fileParallelism=false
pnpm run check
pnpm run build:plugin
```

Expected: PASS, build exits 0.

---

## Thread Verification Envelope (run at handoff)

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTextMeasurePretext.test.ts test/unit/services/serviceAdoption.test.ts test/unit/providers/explorerOutline.test.ts test/unit/providers/explorerFilesFolderMenu.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewNodeTableHeightmap.test.ts test/component/viewNodeMirrorClasses.test.ts test/component/viewTreeAdoptedNodes.test.ts --fileParallelism=false
pnpm run check
pnpm run build:plugin
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev eval code="(() => activeDocument.querySelectorAll('.vm-node-table-row[data-vm-row]').length)()"
obsidian vault=plugin-dev dev:errors
```

Expected: all tests pass, `svelte-check` exits 0, build exits 0, plugin
reloads, eval returns a positive integer in a populated vault, no
Vaultman stack in dev errors. Performance check (run separately, not
gating handoff): scroll the table with 10,000 nodes; row paint should
stay above 30fps in DevTools' performance tab.

## Handoff Notes

- If `serviceVirtualizer.svelte.ts` was extended for the new estimator
  signature, list every other caller you updated in the handoff so T3
  can re-use the same shape for the snapshot timeline.
- If the cross-pollination integration in 2.5 had to stub `readContent`,
  note the exact line so T4 can finish it during the dashboard wire-up.
- `explorerSnippets` and `explorerPlugins` were not modified by this
  thread; their alias logic (`$` and `%`) remains with T4.
- Adopted Nodes DnD (block extraction) lives in T4 task 4.6 — do not
  start it here.
