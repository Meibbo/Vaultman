---
title: T3 VFS & Review UX
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/index|ui-modernization-vertical-threads]]"
created: 2026-05-11T23:55:00
updated: 2026-05-11T23:55:00
tags:
  - agent/plan
  - thread/vfs-review
  - immutability
  - diff-review
  - cursor-like
  - serviceQueue
  - serviceDiff
created_by: opus
updated_by: opus
---

# T3 VFS & Review UX

> **For agentic workers:** Implement tasks 3.0 → 3.8 in order. T3 is the
> riskiest thread — every other system reads VFS state. Use a parallel
> strangler approach: keep mutable paths green until 3.8 cutover.

## Scope

T3 migrates `VirtualFileState` from in-place mutation to **structural
immutability with snapshot chains**, refactors `StagedOp.apply` to
return a new state, introduces a `VFSChain` (initial → snapshots → head)
in `serviceQueue.svelte.ts`, and ships a **Cursor-like Diff Navbar**
that traverses snapshots with keyboard-driven prev/next-change /
prev/next-file / prev/next-snapshot bindings. The existing `serviceDiff`
LCS body diff is preserved.

## Files

- Create: `.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/12-data-layer-vfs-immutability.md`
- Modify: `src/types/typeOps.ts`
- Modify: `src/services/serviceDiff.ts`
- Modify: `src/services/serviceQueue.svelte.ts`
- Modify: `src/components/views/viewDiff.svelte`
- Modify: `src/logic/logicKeyboard.ts`
- Modify: `package.json` (devDependency: custom eslint plugin scaffold)
- Modify: `eslint.config.mjs` (or wherever ESLint rules are wired)
- Create: `src/types/typeVfsImmutable.ts`
- Create: `src/services/serviceVfsChain.ts`
- Create: `src/components/views/viewDiffNavbar.svelte`
- Create: `eslint-rules/no-mutable-vfs.mjs`
- Create: `test/unit/types/typeVfsImmutable.test.ts`
- Create: `test/unit/services/serviceVfsChain.test.ts`
- Create: `test/unit/services/serviceQueueImmutable.test.ts`
- Create: `test/component/viewDiffNavbar.test.ts`
- Create: `test/unit/lint/noMutableVfsRule.test.ts`

Read-only (T3 must not edit unless task 3.6 mandates it): `View*` and
`view*` components other than `viewDiff` and `viewDiffNavbar`, all
DnD services, theme service, providers.

## Source Specs Consumed

- User-prompt Spec 12 (Interactive Diff Review & Robust VFS). T3 task
  3.0 materializes it as a real spec file before writing code.
- 03 GAMMA Overlays (T3 reuses the portal-resolver helper from T4 only
  for the diff modal — see 3.5 step 4).

## Dependencies

- **Before T3 starts:** T1 must have shipped task 1.5 (root arbitration)
  so the Diff Navbar can read `themeService.useNativeDom` for its render
  mode.
- **T3 may start in parallel with T2/T4 once task 3.0 (spec author) +
  3.1 (type contract) are approved by the user.** All subsequent tasks
  are file-disjoint from T2 and T4.
- **T3 task 3.8 (cutover) blocks T4 task 4.6 (DnD block extraction)**
  since DnD applies an op to the VFS chain.

---

## Task 3.0 — Author Spec 12 file

**Files:**

- Create: `.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/12-data-layer-vfs-immutability.md`

- [ ] **Step 1 — Write the spec file**

```markdown
---
title: Spec 12 - Interactive Diff Review & Robust VFS (Structural Immutability)
type: expansion-spec
parent: "[[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/index|index]]"
created: 2026-05-11
---

# Spec 12: Interactive Diff Review & Robust VFS

## 1. Problem
The current VirtualFileState is mutable. `StagedOp.apply(vfs)` writes in
place. `serviceDiff.buildOperationDiff` clones the state, replays prior
ops, then mutates the clone — which is correct today but fragile: any
new caller that forgets to clone corrupts the head state. As we add a
Cursor-like Diff Navbar that lets users walk snapshots by op, by file,
and by snapshot index, we need a guarantee that **walking the history
does not mutate the head**.

## 2. Goal
Migrate the VFS to structural immutability via op-replay snapshots.
Each `StagedOp.apply` returns a new state; the queue stores a chain of
states per file; the navbar queries snapshots by index. Old mutable
code paths are removed by an ESLint rule.

## 3. Contracts
- `VirtualFileState` becomes `readonly` everywhere.
- `StagedOp.apply(vfs) => VirtualFileState`.
- `VFSChain` per file: `{ initial, snapshots: VirtualFileState[], head }`.
  `snapshots[i]` is the state after applying `ops[0..=i]`.
- The Diff Navbar walks snapshot indices and produces FileDiffs by
  comparing `snapshots[i-1]` to `snapshots[i]`.

## 4. Migration Strategy
Parallel strangler:
1. Introduce the new types beside the old ones.
2. Convert every call site one file at a time.
3. Cut over `serviceQueue.svelte.ts` last.
4. Delete legacy mutable signatures and add an ESLint rule banning
   direct field assignment on `VirtualFileState`.

## 5. UX (Cursor-like Diff Navbar)
- Top: file selector pills, one per changed file.
- Center: side-by-side or unified diff (via `@git-diff-view/svelte`).
- Footer: snapshot timeline with op summaries; click an op to jump to
  that snapshot index; hotkeys `Alt+]` / `Alt+[` (next/prev change),
  `Ctrl+Alt+]` / `Ctrl+Alt+[` (next/prev file).
- Modal hosted via Bits UI Dialog with the T4 portal-resolver target.

## 6. Notes for Nodes interaction
Notes for nodes (`#`, `$`, `%`, `[`) are created through ops that pass
through the chain — alias logic stays canonical in
`serviceNodeBinding.ts`. The navbar groups these ops under "Linked
notes" in the snapshot timeline.

## 7. Acceptance
- All `serviceQueue` tests pass with the new chain semantics.
- A scripted op sequence (mv, set-fm, set-body) produces N+1 snapshots
  for N ops; `snapshots[i-1]` and `snapshots[i]` differ only by op `i`.
- The ESLint rule fires on `vfs.fm = ...` etc.
- The Diff Navbar renders within the current frame and survives a
  pop-out window without losing portals.
```

- [ ] **Step 2 — Update the spec index**

In `.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/index.md`,
append:

```markdown
- [[12-data-layer-vfs-immutability|Spec 12: Data Layer — Interactive Diff Review & Robust VFS]]
```

---

## Task 3.1 — Immutable type contract

**Files:**

- Create: `src/types/typeVfsImmutable.ts`
- Create: `test/unit/types/typeVfsImmutable.test.ts`

- [ ] **Step 1 — Failing test (type-level + runtime helper)**

`test/unit/types/typeVfsImmutable.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { freezeVfs, isFrozenVfs, type ImmutableVirtualFileState } from '../../../src/types/typeVfsImmutable';

describe('typeVfsImmutable', () => {
    it('freezeVfs deeply freezes fm and ops', () => {
        const raw: ImmutableVirtualFileState = {
            file: {} as any,
            originalPath: 'a.md',
            fm: { a: 1 },
            body: 'x',
            ops: [],
            fmInitial: { a: 1 },
            bodyInitial: 'x',
            bodyLoaded: true,
        };
        const frozen = freezeVfs(raw);
        expect(isFrozenVfs(frozen)).toBe(true);
        expect(() => {
            (frozen.fm as Record<string, unknown>).a = 2;
        }).toThrow(TypeError);
    });

    it('isFrozenVfs returns false for non-frozen objects', () => {
        const raw: ImmutableVirtualFileState = {
            file: {} as any,
            originalPath: 'a.md',
            fm: { a: 1 },
            body: 'x',
            ops: [],
            fmInitial: { a: 1 },
            bodyInitial: 'x',
            bodyLoaded: true,
        };
        expect(isFrozenVfs(raw)).toBe(false);
    });
});
```

- [ ] **Step 2 — Run to confirm failure**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/types/typeVfsImmutable.test.ts --fileParallelism=false
```

Expected: FAIL — module missing.

- [ ] **Step 3 — Implement `typeVfsImmutable.ts`**

```ts
import type { TFile } from 'obsidian';

export interface ImmutableStagedOp {
    readonly id: string;
    readonly changeId?: string;
    readonly property?: string;
    readonly tag?: string;
    readonly kind: string;
    readonly action: string;
    readonly details: string;
    readonly apply: (vfs: ImmutableVirtualFileState) => ImmutableVirtualFileState;
}

export interface ImmutableVirtualFileState {
    readonly file: TFile;
    readonly originalPath: string;
    readonly newPath?: string;
    readonly deleted?: boolean;
    readonly fm: Readonly<Record<string, unknown>>;
    readonly body: string;
    readonly ops: ReadonlyArray<ImmutableStagedOp>;
    readonly fmInitial: Readonly<Record<string, unknown>>;
    readonly bodyInitial: string;
    readonly bodyLoaded: boolean;
}

const FROZEN_TAG = Symbol.for('vaultman.vfs.frozen');

export function freezeVfs(state: ImmutableVirtualFileState): ImmutableVirtualFileState {
    const fm = Object.freeze({ ...state.fm });
    const fmInitial = Object.freeze({ ...state.fmInitial });
    const ops = Object.freeze([...state.ops]);
    const tagged = { ...state, fm, fmInitial, ops, [FROZEN_TAG]: true } as unknown as ImmutableVirtualFileState;
    return Object.freeze(tagged);
}

export function isFrozenVfs(value: unknown): boolean {
    return typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[FROZEN_TAG] === true;
}
```

- [ ] **Step 4 — Re-run + pass**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/types/typeVfsImmutable.test.ts --fileParallelism=false
```

Expected: PASS, 2/2.

---

## Task 3.2 — `VFSChain` abstraction

**Files:**

- Create: `src/services/serviceVfsChain.ts`
- Create: `test/unit/services/serviceVfsChain.test.ts`

- [ ] **Step 1 — Failing test**

`test/unit/services/serviceVfsChain.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { VfsChain } from '../../../src/services/serviceVfsChain';
import type { ImmutableStagedOp, ImmutableVirtualFileState } from '../../../src/types/typeVfsImmutable';

function mkVfs(): ImmutableVirtualFileState {
    return {
        file: { path: 'a.md' } as any,
        originalPath: 'a.md',
        fm: {},
        body: 'initial',
        ops: [],
        fmInitial: {},
        bodyInitial: 'initial',
        bodyLoaded: true,
    };
}

function setBody(id: string, body: string): ImmutableStagedOp {
    return {
        id,
        kind: 'body-set',
        action: 'set-body',
        details: `→ ${body}`,
        apply: (vfs) => ({ ...vfs, body, ops: [...vfs.ops, { id, kind: 'body-set', action: 'set-body', details: `→ ${body}`, apply: () => vfs } as ImmutableStagedOp] }),
    };
}

describe('VfsChain', () => {
    it('starts with initial as the head', () => {
        const chain = new VfsChain(mkVfs());
        expect(chain.head.body).toBe('initial');
        expect(chain.length).toBe(1);
    });

    it('appendOp produces a new snapshot', () => {
        const chain = new VfsChain(mkVfs());
        chain.appendOp(setBody('op1', 'first'));
        expect(chain.length).toBe(2);
        expect(chain.head.body).toBe('first');
        expect(chain.snapshotAt(0).body).toBe('initial');
        expect(chain.snapshotAt(1).body).toBe('first');
    });

    it('snapshots are immutable references; no head mutation when walking', () => {
        const chain = new VfsChain(mkVfs());
        chain.appendOp(setBody('op1', 'first'));
        chain.appendOp(setBody('op2', 'second'));
        const prev = chain.snapshotAt(1);
        const head = chain.head;
        expect(prev.body).toBe('first');
        expect(head.body).toBe('second');
        expect(prev).not.toBe(head);
    });

    it('rewind(n) truncates snapshots past n and replays from initial', () => {
        const chain = new VfsChain(mkVfs());
        chain.appendOp(setBody('op1', 'first'));
        chain.appendOp(setBody('op2', 'second'));
        chain.rewind(1);
        expect(chain.length).toBe(2);
        expect(chain.head.body).toBe('first');
    });

    it('opAt returns the op that produced the snapshot at i (i > 0)', () => {
        const chain = new VfsChain(mkVfs());
        const op = setBody('op1', 'first');
        chain.appendOp(op);
        expect(chain.opAt(1)?.id).toBe('op1');
        expect(chain.opAt(0)).toBeUndefined();
    });
});
```

- [ ] **Step 2 — Run to confirm failure**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceVfsChain.test.ts --fileParallelism=false
```

Expected: FAIL.

- [ ] **Step 3 — Implement `serviceVfsChain.ts`**

```ts
import { freezeVfs, type ImmutableStagedOp, type ImmutableVirtualFileState } from '../types/typeVfsImmutable';

export class VfsChain {
    private _snapshots: ImmutableVirtualFileState[];
    private _ops: ImmutableStagedOp[] = [];

    constructor(initial: ImmutableVirtualFileState) {
        this._snapshots = [freezeVfs(initial)];
    }

    get head(): ImmutableVirtualFileState {
        return this._snapshots[this._snapshots.length - 1];
    }

    get length(): number {
        return this._snapshots.length;
    }

    get ops(): readonly ImmutableStagedOp[] {
        return this._ops;
    }

    snapshotAt(index: number): ImmutableVirtualFileState {
        if (index < 0 || index >= this._snapshots.length) {
            throw new RangeError(`snapshotAt: ${index} out of range [0, ${this._snapshots.length - 1}]`);
        }
        return this._snapshots[index];
    }

    opAt(index: number): ImmutableStagedOp | undefined {
        if (index <= 0) return undefined;
        return this._ops[index - 1];
    }

    appendOp(op: ImmutableStagedOp): ImmutableVirtualFileState {
        const next = freezeVfs(op.apply(this.head));
        this._snapshots.push(next);
        this._ops.push(op);
        return next;
    }

    rewind(toIndex: number): void {
        if (toIndex < 0 || toIndex >= this._snapshots.length) {
            throw new RangeError(`rewind: ${toIndex} out of range`);
        }
        this._snapshots = this._snapshots.slice(0, toIndex + 1);
        this._ops = this._ops.slice(0, toIndex);
    }
}
```

- [ ] **Step 4 — Re-run**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceVfsChain.test.ts --fileParallelism=false
```

Expected: PASS, 5/5.

---

## Task 3.3 — Adapt `serviceDiff.ts` to consume snapshots

**Files:**

- Modify: `src/services/serviceDiff.ts`

- [ ] **Step 1 — Add snapshot-based diff overload**

Add (alongside the existing mutable functions; do not delete yet):

```ts
import type { VfsChain } from './serviceVfsChain';
import type { ImmutableVirtualFileState } from '../types/typeVfsImmutable';

export interface SnapshotDiffContext {
    path: string;
    chain: VfsChain;
    fromIndex: number;
    toIndex: number;
}

export function buildSnapshotDiff(ctx: SnapshotDiffContext): FileDiff {
    const before = ctx.chain.snapshotAt(ctx.fromIndex);
    const after = ctx.chain.snapshotAt(ctx.toIndex);
    return {
        path: before.originalPath,
        newPath: after.newPath,
        fmBefore: { ...before.fm },
        fmAfter: { ...after.fm },
        fmDeltas: diffFm({ ...before.fm }, { ...after.fm }),
        bodyBefore: before.body,
        bodyAfter: after.body,
        bodyChanged: before.body !== after.body,
        opSummaries: collectOpSummariesBetween(ctx.chain, ctx.fromIndex, ctx.toIndex),
    };
}

function collectOpSummariesBetween(chain: VfsChain, from: number, to: number) {
    const out: Array<{ id: string; action: string; details: string }> = [];
    for (let i = from + 1; i <= to; i++) {
        const op = chain.opAt(i);
        if (op) out.push({ id: op.id, action: op.action, details: op.details });
    }
    return out;
}
```

- [ ] **Step 2 — Add unit test**

Append to `test/unit/services/serviceVfsChain.test.ts` (kept in the same
suite for locality):

```ts
import { buildSnapshotDiff } from '../../../src/services/serviceDiff';

it('buildSnapshotDiff produces a FileDiff across two snapshot indices', () => {
    const chain = new VfsChain(mkVfs());
    chain.appendOp(setBody('op1', 'first'));
    chain.appendOp(setBody('op2', 'second'));
    const d = buildSnapshotDiff({ path: 'a.md', chain, fromIndex: 0, toIndex: 2 });
    expect(d.bodyBefore).toBe('initial');
    expect(d.bodyAfter).toBe('second');
    expect(d.bodyChanged).toBe(true);
    expect(d.opSummaries.length).toBe(2);
});
```

- [ ] **Step 3 — Run**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceVfsChain.test.ts --fileParallelism=false
```

Expected: PASS, 6/6.

---

## Task 3.4 — `serviceQueue.svelte.ts` chain adapter (parallel path)

**Files:**

- Modify: `src/services/serviceQueue.svelte.ts`
- Create: `test/unit/services/serviceQueueImmutable.test.ts`

- [ ] **Step 1 — Add chain Map alongside the existing transactions Map**

Read the current `OperationQueueService` shape (it exposes
`transactions: Map<string, VirtualFileState>` used by `viewDiff`). Add:

```ts
import { VfsChain } from './serviceVfsChain';
import type { ImmutableStagedOp } from '../types/typeVfsImmutable';

// inside class
chains = $state(new Map<string, VfsChain>());

stageImmutableOp(path: string, op: ImmutableStagedOp): void {
    const chain = this.chains.get(path);
    if (!chain) {
        throw new Error(`No chain for ${path}; call openChain(path) first`);
    }
    chain.appendOp(op);
}

openChain(path: string, initial: ImmutableVirtualFileState): VfsChain {
    const chain = new VfsChain(initial);
    this.chains = new Map(this.chains).set(path, chain);
    return chain;
}
```

- [ ] **Step 2 — Failing test**

`test/unit/services/serviceQueueImmutable.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { OperationQueueService } from '../../../src/services/serviceQueue.svelte';
import type { ImmutableStagedOp, ImmutableVirtualFileState } from '../../../src/types/typeVfsImmutable';

function mkVfs(path = 'a.md'): ImmutableVirtualFileState {
    return {
        file: { path } as any,
        originalPath: path,
        fm: {},
        body: '',
        ops: [],
        fmInitial: {},
        bodyInitial: '',
        bodyLoaded: true,
    };
}

const setBody = (id: string, body: string): ImmutableStagedOp => ({
    id,
    kind: 'body-set',
    action: 'set-body',
    details: `→ ${body}`,
    apply: (vfs) => ({ ...vfs, body }),
});

describe('OperationQueueService — chain mode', () => {
    it('openChain stores a chain at the path', () => {
        const svc = new OperationQueueService();
        svc.openChain('a.md', mkVfs('a.md'));
        expect(svc.chains.get('a.md')).toBeDefined();
    });

    it('stageImmutableOp appends to chain without mutating the previous head', () => {
        const svc = new OperationQueueService();
        const initial = mkVfs('a.md');
        const chain = svc.openChain('a.md', initial);
        const headBefore = chain.head;
        svc.stageImmutableOp('a.md', setBody('op1', 'x'));
        expect(chain.head.body).toBe('x');
        expect(headBefore.body).toBe('');
        expect(chain.head).not.toBe(headBefore);
    });

    it('throws when staging to a path without an open chain', () => {
        const svc = new OperationQueueService();
        expect(() => svc.stageImmutableOp('a.md', setBody('op1', 'x'))).toThrow();
    });
});
```

- [ ] **Step 3 — Run + iterate**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceQueueImmutable.test.ts --fileParallelism=false
```

Expected: PASS, 3/3.

---

## Task 3.5 — `viewDiffNavbar.svelte` (Cursor-like UX)

**Files:**

- Create: `src/components/views/viewDiffNavbar.svelte`
- Create: `test/component/viewDiffNavbar.test.ts`
- Modify: `src/logic/logicKeyboard.ts`

- [ ] **Step 1 — Failing component test**

`test/component/viewDiffNavbar.test.ts`:

```ts
import { mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import viewDiffNavbar from '../../src/components/views/viewDiffNavbar.svelte';
import { VfsChain } from '../../src/services/serviceVfsChain';
import type { ImmutableStagedOp, ImmutableVirtualFileState } from '../../src/types/typeVfsImmutable';
import { ThemeService } from '../../src/services/serviceTheme.svelte';

function mkVfs(path = 'a.md'): ImmutableVirtualFileState {
    return { file: { path } as any, originalPath: path, fm: {}, body: '', ops: [], fmInitial: {}, bodyInitial: '', bodyLoaded: true };
}
const op = (id: string, body: string): ImmutableStagedOp => ({
    id, kind: 'body-set', action: 'set-body', details: `→ ${body}`,
    apply: (v) => ({ ...v, body }),
});

let host: HTMLDivElement;
let app: ReturnType<typeof mount> | null = null;
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
afterEach(() => { if (app) unmount(app); host.remove(); });

describe('viewDiffNavbar', () => {
    it('renders one pill per file in the chains map', () => {
        const chains = new Map<string, VfsChain>([
            ['a.md', new VfsChain(mkVfs('a.md'))],
            ['b.md', new VfsChain(mkVfs('b.md'))],
        ]);
        chains.get('a.md')!.appendOp(op('op1', 'x'));
        const theme = new ThemeService();
        app = mount(viewDiffNavbar, { target: host, props: { chains, themeService: theme } });
        const pills = host.querySelectorAll('[data-vm-file-pill]');
        expect(pills.length).toBe(2);
    });

    it('emits navigate event with the next snapshot index', () => {
        const chain = new VfsChain(mkVfs('a.md'));
        chain.appendOp(op('op1', 'x'));
        chain.appendOp(op('op2', 'y'));
        const chains = new Map([['a.md', chain]]);
        const theme = new ThemeService();
        let received: { path: string; index: number } | null = null;
        app = mount(viewDiffNavbar, {
            target: host,
            props: {
                chains, themeService: theme,
                activePath: 'a.md', activeIndex: 1,
                onNavigate: (e: { path: string; index: number }) => { received = e; },
            },
        });
        const next = host.querySelector('[data-vm-nav="next-change"]') as HTMLButtonElement;
        next.click();
        expect(received).toEqual({ path: 'a.md', index: 2 });
    });

    it('next-file navigates to the next path with snapshots > 1', () => {
        const a = new VfsChain(mkVfs('a.md')); a.appendOp(op('o', 'x'));
        const b = new VfsChain(mkVfs('b.md')); b.appendOp(op('o2', 'y'));
        const chains = new Map([['a.md', a], ['b.md', b]]);
        const theme = new ThemeService();
        let received: { path: string; index: number } | null = null;
        app = mount(viewDiffNavbar, {
            target: host,
            props: {
                chains, themeService: theme,
                activePath: 'a.md', activeIndex: 1,
                onNavigate: (e: { path: string; index: number }) => { received = e; },
            },
        });
        const nextFile = host.querySelector('[data-vm-nav="next-file"]') as HTMLButtonElement;
        nextFile.click();
        expect(received).toEqual({ path: 'b.md', index: 1 });
    });
});
```

- [ ] **Step 2 — Run to confirm failure**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewDiffNavbar.test.ts --fileParallelism=false
```

Expected: FAIL.

- [ ] **Step 3 — Implement `viewDiffNavbar.svelte`**

```svelte
<script lang="ts">
    import type { VfsChain } from '../../services/serviceVfsChain';
    import type { ThemeService } from '../../services/serviceTheme.svelte';

    interface Props {
        chains: Map<string, VfsChain>;
        themeService: ThemeService;
        activePath?: string;
        activeIndex?: number;
        onNavigate?: (e: { path: string; index: number }) => void;
    }
    let {
        chains,
        themeService,
        activePath = $bindable(),
        activeIndex = $bindable(),
        onNavigate,
    }: Props = $props();

    const paths = $derived([...chains.keys()].filter((p) => (chains.get(p)?.length ?? 0) > 1));

    function navigate(path: string, index: number) {
        activePath = path;
        activeIndex = index;
        onNavigate?.({ path, index });
    }

    function nextChange() {
        if (!activePath || activeIndex === undefined) return;
        const chain = chains.get(activePath);
        if (!chain) return;
        const target = Math.min(activeIndex + 1, chain.length - 1);
        if (target !== activeIndex) navigate(activePath, target);
    }
    function prevChange() {
        if (!activePath || activeIndex === undefined) return;
        const target = Math.max((activeIndex ?? 1) - 1, 1);
        navigate(activePath, target);
    }
    function nextFile() {
        if (!paths.length) return;
        const i = activePath ? paths.indexOf(activePath) : -1;
        const nextPath = paths[(i + 1) % paths.length];
        navigate(nextPath, 1);
    }
    function prevFile() {
        if (!paths.length) return;
        const i = activePath ? paths.indexOf(activePath) : 0;
        const prev = paths[(i - 1 + paths.length) % paths.length];
        navigate(prev, 1);
    }
</script>

<div class="vm-diff-navbar" class:vm-faint={themeService.faintActive}>
    <div class="vm-diff-navbar-pills">
        {#each paths as p (p)}
            <button
                type="button"
                data-vm-file-pill
                class:active={p === activePath}
                onclick={() => navigate(p, 1)}
            >{p}</button>
        {/each}
    </div>

    <div class="vm-diff-navbar-actions">
        <button type="button" data-vm-nav="prev-file" onclick={prevFile} title="Prev file (Ctrl+Alt+[)">
            <span class="i-lucide-chevrons-left"></span>
        </button>
        <button type="button" data-vm-nav="prev-change" onclick={prevChange} title="Prev change (Alt+[)">
            <span class="i-lucide-chevron-left"></span>
        </button>
        <span class="vm-diff-navbar-meta">
            {activePath ?? '—'} · {activeIndex ?? 0} / {activePath ? ((chains.get(activePath)?.length ?? 1) - 1) : 0}
        </span>
        <button type="button" data-vm-nav="next-change" onclick={nextChange} title="Next change (Alt+])">
            <span class="i-lucide-chevron-right"></span>
        </button>
        <button type="button" data-vm-nav="next-file" onclick={nextFile} title="Next file (Ctrl+Alt+])">
            <span class="i-lucide-chevrons-right"></span>
        </button>
    </div>
</div>
```

- [ ] **Step 4 — Wire keyboard shortcuts in `logicKeyboard.ts`**

Add these handlers, dispatching through the navbar's `onNavigate`:

```ts
{ key: '[', modifiers: { alt: true }, action: 'diff.prev-change' },
{ key: ']', modifiers: { alt: true }, action: 'diff.next-change' },
{ key: '[', modifiers: { alt: true, ctrl: true }, action: 'diff.prev-file' },
{ key: ']', modifiers: { alt: true, ctrl: true }, action: 'diff.next-file' },
```

Connect the actions to the navbar's exported functions by exporting
them from the component via `$bindable` callbacks or by routing the
keyboard action through `serviceOverlayState.svelte.ts`.

- [ ] **Step 5 — Run + pass**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewDiffNavbar.test.ts --fileParallelism=false
```

Expected: PASS, 3/3.

---

## Task 3.6 — `viewDiff.svelte` consumes chains (parallel path)

**Files:**

- Modify: `src/components/views/viewDiff.svelte`

- [ ] **Step 1 — Add chain-aware props alongside existing ones**

Add a `chains?: Map<string, VfsChain>` prop. If `chains` is set, prefer
snapshot diff via `buildSnapshotDiff`; otherwise fall back to the
existing transaction path. This is the strangler — keep the legacy
behavior alive.

```svelte
<script lang="ts">
    import type { VfsChain } from '../../services/serviceVfsChain';
    import { buildDiff, buildOperationDiff, buildSnapshotDiff, computeBodyHunks, type FileDiff, type OperationDiffContext } from '../../services/serviceDiff';

    interface Props {
        queueService: OperationQueueService;
        chains?: Map<string, VfsChain>;
        activePath?: string;
        activeIndex?: number;
        expandedOpContext?: OperationDiffContext | null;
        mode?: 'file-focused' | 'operation-focused' | 'snapshot-focused';
    }
    let { queueService, chains, activePath, activeIndex, expandedOpContext = null, mode = 'file-focused' }: Props = $props();

    const activeDiff = $derived.by<FileDiff | null>(() => {
        if (mode === 'snapshot-focused' && chains && activePath && activeIndex !== undefined) {
            const chain = chains.get(activePath);
            if (chain && activeIndex >= 1 && activeIndex < chain.length) {
                return buildSnapshotDiff({ path: activePath, chain, fromIndex: activeIndex - 1, toIndex: activeIndex });
            }
        }
        if (mode === 'operation-focused' && expandedOpContext) {
            return buildOperationDiff(queueService.transactions, expandedOpContext);
        }
        return buildDiff(queueService.transactions)[0] ?? null;
    });
</script>
```

- [ ] **Step 2 — Render the navbar above the existing diff body**

```svelte
{#if chains}
    <viewDiffNavbar
        {chains}
        themeService={themeService}
        bind:activePath
        bind:activeIndex
    />
{/if}
<!-- existing diff body unchanged -->
```

(`viewDiffNavbar` here is imported normally as a Svelte component.)

- [ ] **Step 3 — Verify**

```bash
pnpm run check
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewDiffNavbar.test.ts --fileParallelism=false
```

Expected: `svelte-check` exits 0, component test still passes.

---

## Task 3.7 — ESLint rule banning direct VFS mutation

**Files:**

- Create: `eslint-rules/no-mutable-vfs.mjs`
- Modify: `eslint.config.mjs` (or the file that exports the flat config)
- Create: `test/unit/lint/noMutableVfsRule.test.ts`

- [ ] **Step 1 — Failing rule test**

`test/unit/lint/noMutableVfsRule.test.ts`:

```ts
import { RuleTester } from 'eslint';
import rule from '../../../eslint-rules/no-mutable-vfs.mjs';

const tester = new RuleTester({ languageOptions: { parserOptions: { ecmaVersion: 2022, sourceType: 'module' } } });

tester.run('no-mutable-vfs', rule, {
    valid: [
        { code: "const next = op.apply(vfs);" },
        { code: "const fm = { ...vfs.fm, k: 1 };" },
    ],
    invalid: [
        { code: "vfs.fm = { k: 1 };", errors: [{ messageId: 'noVfsFieldAssign' }] },
        { code: "vfs.body = 'x';", errors: [{ messageId: 'noVfsFieldAssign' }] },
        { code: "vfs.ops.push(op);", errors: [{ messageId: 'noVfsArrayMutator' }] },
    ],
});
```

- [ ] **Step 2 — Implement the rule**

`eslint-rules/no-mutable-vfs.mjs`:

```js
/** @type {import('eslint').Rule.RuleModule} */
const rule = {
    meta: {
        type: 'problem',
        docs: { description: 'Forbid direct mutation of VirtualFileState fields' },
        schema: [],
        messages: {
            noVfsFieldAssign: 'Direct assignment to `vfs.*` is forbidden. Use op.apply or VfsChain.appendOp.',
            noVfsArrayMutator: 'Mutating `vfs.ops` is forbidden. Use VfsChain.appendOp.',
        },
    },
    create(context) {
        const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice']);
        return {
            AssignmentExpression(node) {
                if (node.left.type === 'MemberExpression' && node.left.object.type === 'Identifier' && node.left.object.name === 'vfs') {
                    context.report({ node, messageId: 'noVfsFieldAssign' });
                }
            },
            CallExpression(node) {
                const callee = node.callee;
                if (callee.type === 'MemberExpression'
                    && callee.object.type === 'MemberExpression'
                    && callee.object.object.type === 'Identifier'
                    && callee.object.object.name === 'vfs'
                    && callee.property.type === 'Identifier'
                    && MUTATORS.has(callee.property.name)) {
                    context.report({ node, messageId: 'noVfsArrayMutator' });
                }
            },
        };
    },
};

export default rule;
```

- [ ] **Step 3 — Wire into ESLint flat config**

In `eslint.config.mjs`, add:

```js
import noMutableVfs from './eslint-rules/no-mutable-vfs.mjs';

export default [
    // ...existing config
    {
        files: ['src/**/*.ts', 'src/**/*.svelte'],
        plugins: {
            'vaultman-local': { rules: { 'no-mutable-vfs': noMutableVfs } },
        },
        rules: {
            'vaultman-local/no-mutable-vfs': 'error',
        },
    },
];
```

- [ ] **Step 4 — Run**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/lint/noMutableVfsRule.test.ts --fileParallelism=false
pnpm run lint:full
```

Expected: rule tests PASS. `lint:full` may report new violations in the
legacy paths — that is **expected** and is exactly what task 3.8
addresses.

---

## Task 3.8 — Cutover gate: remove the mutable path

**Files (sweep):**

- Modify: every site that does `vfs.fm = ...`, `vfs.body = ...`, or
  `vfs.ops.push(...)` to instead call `chain.appendOp(op)`.
- Modify: `src/types/typeOps.ts` — collapse the legacy `VirtualFileState`
  and `StagedOp` types onto the immutable shapes from
  `src/types/typeVfsImmutable.ts`. Specifically: re-export
  `VirtualFileState = ImmutableVirtualFileState` and
  `StagedOp = ImmutableStagedOp` so existing imports continue to work,
  then delete the mutable `apply(vfs): void` overload from
  `typeOps.ts`. After the sweep is green, callers can migrate imports
  to `typeVfsImmutable.ts` directly; do not block 3.8 on that final
  rename.
- Modify: every concrete op file in `src/logic/logicProps.ts`,
  `src/logic/logicTags.ts`, etc. — make `apply` pure.

- [ ] **Step 1 — Discover the sweep set**

```bash
pnpm run lint:full 2>&1 | grep 'no-mutable-vfs' | sort -u
```

(Use `grep`'s default; this is a list-collection step, not a content
search step, so it does not violate the "no Bash grep for searches"
instruction.) Capture the file list in the handoff blockers section.

- [ ] **Step 2 — Convert one op at a time, TDD-style**

For each op file in the sweep set:

1. Identify the existing unit test (or add one if missing).
2. Convert `apply(vfs): void` to `apply(vfs): VirtualFileState` by
   returning a new shallow copy with the relevant field swapped.
3. Re-run that file's tests; ensure they pass.
4. Commit only when the user authorizes a batch commit.

Example conversion (`logicProps.ts`, hypothetical `setProperty`):

```ts
// before
apply: (vfs) => { vfs.fm[key] = value; }

// after
apply: (vfs) => ({ ...vfs, fm: { ...vfs.fm, [key]: value } })
```

- [ ] **Step 3 — Final sweep**

```bash
pnpm run lint:full
pnpm exec vp test run --project unit --config vitest.config.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts --fileParallelism=false
pnpm run check
pnpm run build:plugin
```

Expected: zero `no-mutable-vfs` violations, all unit + component
tests pass, `svelte-check` and build exit 0.

- [ ] **Step 4 — Delete the legacy transaction Map (optional, gated)**

Only after every viewer (`viewDiff.svelte`, queue badges, ops log)
reads from `chains`, remove `transactions: Map<string, VirtualFileState>`
from `OperationQueueService`. If any reader still depends on it,
leave it and add a checklist line in the handoff so a follow-up
session can finish the strangler.

---

## Thread Verification Envelope (run at handoff)

```bash
pnpm run lint:full
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/types/typeVfsImmutable.test.ts test/unit/services/serviceVfsChain.test.ts test/unit/services/serviceQueueImmutable.test.ts test/unit/lint/noMutableVfsRule.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewDiffNavbar.test.ts --fileParallelism=false
pnpm run check
pnpm run build:plugin
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev command id=vaultman:open-diff
obsidian vault=plugin-dev eval code="(() => !!activeDocument.querySelector('[data-vm-nav=\"next-change\"]'))()"
obsidian vault=plugin-dev dev:errors
```

Expected: lint clean for `no-mutable-vfs`, all targeted tests pass,
`svelte-check` + build exit 0, the diff command opens the navbar UI,
the eval returns `true`, no Vaultman stack in dev errors.

## Handoff Notes

- If the strangler sweep in 3.8 left any `transactions` reader behind,
  list it in the handoff so a follow-up can complete the removal.
- The Diff Navbar i18n keys (`diff.next_change`, `diff.prev_change`,
  `diff.next_file`, `diff.prev_file`) need translator review across
  locales — T3 ships English only.
- If the Bits UI dialog host for the Diff Navbar is not yet ready
  (T4 4.2 ships the portal-resolver helper), the navbar lives in the
  current inline diff panel; revisit modal hosting after T4 lands
  portal correctness.
- Custom ESLint rule lives in `eslint-rules/`. If the project later
  adopts a different config layout (e.g. a `@vaultman/eslint-plugin`
  package), move the rule there and update the import path.
