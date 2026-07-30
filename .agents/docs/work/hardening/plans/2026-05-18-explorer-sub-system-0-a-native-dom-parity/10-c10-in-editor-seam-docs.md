---
title: 10 — C10 in-editor seam shard + types
type: plan-task
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 10 — C10: In-editor seam vocabulary shard + `InEditorMountContract` types

Type-only commit. The shard `08-in-editor-seam-vocabulary.md` was written during the spec phase; this commit finalizes its types in `src/types/typeViewHost.ts` and adds a compile-only test ensuring shape stability.

**Files:**
- Modify (final review): `src/types/typeViewHost.ts` (confirm in-editor seam types match spec shard 08)
- Test: `test/unit/types/typeViewHost.compile.test.ts`

## Steps

- [ ] **Step 1: Confirm types from C1 are complete per spec shard 08**

Open `src/types/typeViewHost.ts` and verify the following types exist with the exact shape from spec shard 08:

```typescript
export type ViewHostMountContext = 'panel' | 'in-editor';

export interface NoteContextProvider {
  activeFile: () => string | null;
  activeHeadingPath: () => readonly string[];
  cursorPosition: () => { line: number; ch: number } | null;
}

export interface InEditorMountContract {
  hostElement: HTMLElement;
  preset: ThemePreset;
  initialViewMode: 'tree' | 'list' | 'table' | 'grid' | 'cards';
  noteContextProvider: NoteContextProvider;
  unmount(): void;
}
```

If C1 already added them per the plan, no edit needed in this step. If any field drifted during impl, fix here.

- [ ] **Step 2: Write compile-only test for in-editor seam types**

Create `test/unit/types/typeViewHost.compile.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import type {
  ViewHostMountContext,
  NoteContextProvider,
  InEditorMountContract,
  NodeElementMask,
  NodeElementOverrides,
  NodeElementKind,
  BadgeKindMask,
  UniversalDndVocab,
} from '../../../src/types/typeViewHost';
import { UNIVERSAL_DND_VOCAB } from '../../../src/types/typeViewHost';

describe('typeViewHost compile-only contracts', () => {
  it('ViewHostMountContext narrows to panel | in-editor', () => {
    const a: ViewHostMountContext = 'panel';
    const b: ViewHostMountContext = 'in-editor';
    expect([a, b]).toEqual(['panel', 'in-editor']);
  });

  it('NoteContextProvider has 3 thunk fields', () => {
    const provider: NoteContextProvider = {
      activeFile: () => null,
      activeHeadingPath: () => [],
      cursorPosition: () => null,
    };
    expect(provider.activeFile()).toBeNull();
    expect(provider.activeHeadingPath()).toEqual([]);
    expect(provider.cursorPosition()).toBeNull();
  });

  it('InEditorMountContract has required fields', () => {
    const stub: InEditorMountContract = {
      hostElement: {} as HTMLElement,
      preset: {} as never,
      initialViewMode: 'tree',
      noteContextProvider: {
        activeFile: () => null,
        activeHeadingPath: () => [],
        cursorPosition: () => null,
      },
      unmount: () => {},
    };
    expect(typeof stub.unmount).toBe('function');
    expect(stub.initialViewMode).toBe('tree');
  });

  it('NodeElementMask has 6 top-level kinds + nested badges', () => {
    const mask: NodeElementMask = {
      icon: true, label: true, detail: true, media: false,
      badges: { ops: true, filters: true, warnings: true, inherited: true, counts: true },
      actions: true,
    };
    expect(Object.keys(mask).length).toBe(6);
    expect(Object.keys(mask.badges).length).toBe(5);
  });

  it('NodeElementOverrides allows partial badge sub-mask', () => {
    const ov: NodeElementOverrides = {
      media: true,
      badges: { warnings: false },
    };
    expect(ov.media).toBe(true);
    expect(ov.badges?.warnings).toBe(false);
  });

  it('NodeElementKind union covers all 6 kinds', () => {
    const kinds: readonly NodeElementKind[] = ['icon', 'label', 'detail', 'media', 'badges', 'actions'];
    expect(kinds.length).toBe(6);
  });

  it('UniversalDndVocab const provides 9 canonical strings', () => {
    const v: UniversalDndVocab = UNIVERSAL_DND_VOCAB;
    expect(v.dragSource).toBe('is-being-dragged');
    expect(v.dragTarget).toBe('is-being-dragged-over');
    expect(v.dropIndicator).toBe('drop-indicator');
    expect(v.dropIndicatorActive).toBe('is-active');
    expect(v.bodyGrabbing).toBe('is-grabbing');
    expect(v.ghost).toBe('drag-ghost');
    expect(v.ghostSelf).toBe('drag-ghost-self');
    expect(v.ghostIcon).toBe('drag-ghost-icon');
    expect(v.ghostAction).toBe('drag-ghost-action');
  });
});
```

- [ ] **Step 3: Run compile-only test**

```powershell
pnpm vitest run test/unit/types/typeViewHost.compile.test.ts
```

Expected: PASS. If any test fails, the type shape drifted from spec shard 08 — fix `typeViewHost.ts` to match the spec.

- [ ] **Step 4: Verify shard 08 of the spec is committed**

Run:

```powershell
git log --oneline -- .agents/docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/08-in-editor-seam-vocabulary.md
```

Expected: at least one commit (from the brainstorm spec write). If for some reason the shard is missing from git, commit it now.

- [ ] **Step 5: Run `pnpm verify`**

```powershell
pnpm verify
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add test/unit/types/typeViewHost.compile.test.ts src/types/typeViewHost.ts
git commit -m "docs(0-A): in-editor seam vocabulary shard + InEditorMountContract types

Finalizes ViewHostMountContext, NoteContextProvider, InEditorMountContract
types in typeViewHost.ts. Compile-only test verifies shape stability for
the future in-editor renderer fast-follow. Spec shard 08 is the locked
class-vocabulary contract per (view × preset × context) cell."
```

## Verification gates

- 7 compile-only tests pass.
- `pnpm verify` baseline preserved.
- No source change to view components or services (types-only commit).

## Rollback

`git revert <commit>` reverts the test addition. Types from C1 remain.
