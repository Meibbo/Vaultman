---
title: 01 — C1 extend ExplorerViewFeatureContract
type: plan-task
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 01 — C1: Extend `ExplorerViewFeatureContract`

Add `NativeStateMod`, `NativeClassVocabulary`, `NativeDomEmission`, `UNIVERSAL_DND_VOCAB`, `ViewHostMountContext`, `NoteContextProvider`, `InEditorMountContract` types. Update per-view CONTRACTS literals with Bases vocab. No consumers wired yet.

**Files:**
- Modify: `src/services/serviceExplorerViewContract.ts` (add types, extend CONTRACTS)
- Create: `src/types/typeViewHost.ts` (NodeElement types, UNIVERSAL_DND_VOCAB, in-editor seam types)
- Test: `test/unit/services/serviceExplorerViewContract.test.ts` (extend existing if present; else create)

## Steps

- [ ] **Step 1: Write failing test for contract shape exhaustiveness**

Create or extend `test/unit/services/serviceExplorerViewContract.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  EXPLORER_PLATFORM_VIEW_MODES,
  explorerViewContract,
  type ExplorerViewFeatureContract,
  type NativeStateMod,
} from '../../../src/services/serviceExplorerViewContract';
import { UNIVERSAL_DND_VOCAB } from '../../../src/types/typeViewHost';

describe('ExplorerViewFeatureContract — 0-A extension', () => {
  it('returns a contract for every platform mode', () => {
    for (const mode of EXPLORER_PLATFORM_VIEW_MODES) {
      const contract = explorerViewContract(mode);
      expect(contract).toBeDefined();
      expect(contract.viewMode).toBe(mode);
      expect(contract.nativeDomEmission).toBeDefined();
      expect(contract.nativeDomEmission.panel).toBeDefined();
      expect(contract.nativeDomEmission.inEditor).toBeDefined();
    }
  });

  it('tree contract emits the tree-item* family in panel context', () => {
    const c = explorerViewContract('tree');
    expect(c.nativeDomEmission.panel.rowRoot).toBe('tree-item');
    expect(c.nativeDomEmission.panel.primaryLabel).toBe('tree-item-inner');
    expect(c.nativeDomEmission.panel.innerWrapper).toBe('tree-item-self');
    expect(c.nativeDomEmission.panel.childrenContainer).toBe('tree-item-children');
    expect(c.nativeDomEmission.panel.collapseIcon).toBe('collapse-icon');
  });

  it('table contract emits Bases vocab in panel context', () => {
    const c = explorerViewContract('table');
    expect(c.nativeDomEmission.panel.rowRoot).toBe('bases-tr');
    expect(c.nativeDomEmission.panel.primaryLabel).toBe('bases-table-cell');
    expect(c.nativeDomEmission.panel.cellWrapper).toBe('bases-td');
    expect(c.nativeDomEmission.panel.headerCell).toBe('bases-table-header');
  });

  it('cards contract emits Bases cards vocab including cover image slot', () => {
    const c = explorerViewContract('cards');
    expect(c.nativeDomEmission.panel.rowRoot).toBe('bases-cards-item');
    expect(c.nativeDomEmission.panel.primaryLabel).toBe('bases-cards-property mod-title');
    expect(c.nativeDomEmission.panel.cellWrapper).toBe('bases-cards-property');
    expect(c.nativeDomEmission.panel.coverImage).toBe('bases-cards-cover');
  });

  it('list contract emits no native classes (no Obsidian analog)', () => {
    const c = explorerViewContract('list');
    expect(c.nativeDomEmission.panel.rowRoot).toBeNull();
    expect(c.nativeDomEmission.panel.primaryLabel).toBeNull();
    expect(c.nativeDomEmission.panel.rowStateMods).toEqual([]);
  });

  it('grid contract emits no native classes (no Bases analog)', () => {
    const c = explorerViewContract('grid');
    expect(c.nativeDomEmission.panel.rowRoot).toBeNull();
    expect(c.nativeDomEmission.panel.primaryLabel).toBeNull();
    expect(c.nativeDomEmission.panel.rowStateMods).toEqual([]);
  });

  it('in-editor context uses reduced rowStateMods (no DnD by default)', () => {
    const treeInEditor = explorerViewContract('tree').nativeDomEmission.inEditor;
    expect(treeInEditor.rowStateMods).toContain('is-active');
    expect(treeInEditor.rowStateMods).toContain('is-selected');
    expect(treeInEditor.rowStateMods).toContain('is-focused');
    expect(treeInEditor.rowStateMods).not.toContain('is-being-dragged');
    expect(treeInEditor.rowStateMods).not.toContain('is-being-dragged-over');
  });

  it('UNIVERSAL_DND_VOCAB exports canonical class strings', () => {
    expect(UNIVERSAL_DND_VOCAB.dragSource).toBe('is-being-dragged');
    expect(UNIVERSAL_DND_VOCAB.dragTarget).toBe('is-being-dragged-over');
    expect(UNIVERSAL_DND_VOCAB.dropIndicator).toBe('drop-indicator');
    expect(UNIVERSAL_DND_VOCAB.dropIndicatorActive).toBe('is-active');
    expect(UNIVERSAL_DND_VOCAB.bodyGrabbing).toBe('is-grabbing');
    expect(UNIVERSAL_DND_VOCAB.ghost).toBe('drag-ghost');
  });

  it('NativeStateMod allowlist on tree includes drag mods in panel only', () => {
    const treePanel = explorerViewContract('tree').nativeDomEmission.panel;
    expect(treePanel.rowStateMods).toContain('is-being-dragged');
    expect(treePanel.rowStateMods).toContain('mod-collapsible');
    expect(treePanel.rowStateMods).toContain('is-collapsed');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm vitest run test/unit/services/serviceExplorerViewContract.test.ts
```

Expected: FAIL with type errors (missing `nativeDomEmission` on contract, missing `NativeStateMod`, missing import of `UNIVERSAL_DND_VOCAB`).

- [ ] **Step 3: Create `src/types/typeViewHost.ts`**

```typescript
import type { ThemePreset } from './typeThemePreset';

export type ViewHostMountContext = 'panel' | 'in-editor';

export type NodeElementKind = 'icon' | 'label' | 'detail' | 'media' | 'badges' | 'actions';

export interface BadgeKindMask {
  ops: boolean;
  filters: boolean;
  warnings: boolean;
  inherited: boolean;
  counts: boolean;
}

export interface NodeElementMask {
  icon: boolean;
  label: boolean;
  detail: boolean;
  media: boolean;
  badges: BadgeKindMask;
  actions: boolean;
}

export type NodeElementOverrides = Partial<{
  icon: boolean;
  label: boolean;
  detail: boolean;
  media: boolean;
  badges: Partial<BadgeKindMask>;
  actions: boolean;
}>;

export const UNIVERSAL_DND_VOCAB = {
  dragSource: 'is-being-dragged',
  dragTarget: 'is-being-dragged-over',
  dropIndicator: 'drop-indicator',
  dropIndicatorActive: 'is-active',
  bodyGrabbing: 'is-grabbing',
  ghost: 'drag-ghost',
  ghostSelf: 'drag-ghost-self',
  ghostIcon: 'drag-ghost-icon',
  ghostAction: 'drag-ghost-action',
} as const;

export type UniversalDndVocab = typeof UNIVERSAL_DND_VOCAB;

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

- [ ] **Step 4: Extend `src/services/serviceExplorerViewContract.ts` with new types**

Append after the existing `ExplorerViewFeatureFlags` and `ExplorerViewScaleContract` interfaces, before the `ExplorerViewFeatureContract` interface:

```typescript
export type NativeStateMod =
  | 'is-active'
  | 'is-selected'
  | 'is-focused'
  | 'is-being-dragged'
  | 'is-being-dragged-over'
  | 'has-active-menu'
  | 'is-clickable'
  | 'is-collapsed'
  | 'mod-collapsible'
  | 'is-being-renamed'
  | 'is-cut';

export interface NativeClassVocabulary {
  rowRoot: string | null;
  primaryLabel: string | null;
  innerWrapper: string | null;
  childrenContainer: string | null;
  collapseIcon: string | null;
  cellWrapper: string | null;
  coverImage: string | null;
  headerCell: string | null;
  rowStateMods: readonly NativeStateMod[];
}

export interface NativeDomEmission {
  panel: NativeClassVocabulary;
  inEditor: NativeClassVocabulary;
}
```

Then update the `ExplorerViewFeatureContract` interface to include `nativeDomEmission`:

```typescript
export interface ExplorerViewFeatureContract {
  viewMode: ExplorerPlatformViewMode;
  features: ExplorerViewFeatureFlags;
  scale: ExplorerViewScaleContract;
  nativeDomEmission: NativeDomEmission;
  adapterNotes?: string;
}
```

- [ ] **Step 5: Update CONTRACTS literals with Bases vocab**

Replace the existing `const CONTRACTS: Record<...>` block with the literals from spec shard 02. Full body:

```typescript
const NULL_VOCAB: NativeClassVocabulary = {
  rowRoot: null,
  primaryLabel: null,
  innerWrapper: null,
  childrenContainer: null,
  collapseIcon: null,
  cellWrapper: null,
  coverImage: null,
  headerCell: null,
  rowStateMods: [],
};

const CONTRACTS: Record<ExplorerPlatformViewMode, ExplorerViewFeatureContract> = {
  tree: {
    viewMode: 'tree',
    features: SHARED_FEATURES,
    scale: { releaseGateNodes: 10_000, mustPassNodes: 50_000, proofNodes: 100_000 },
    nativeDomEmission: {
      panel: {
        rowRoot: 'tree-item',
        primaryLabel: 'tree-item-inner',
        innerWrapper: 'tree-item-self',
        childrenContainer: 'tree-item-children',
        collapseIcon: 'collapse-icon',
        cellWrapper: null,
        coverImage: null,
        headerCell: null,
        rowStateMods: [
          'is-active', 'is-selected', 'is-focused',
          'has-active-menu', 'is-being-dragged', 'is-being-dragged-over',
          'mod-collapsible', 'is-collapsed',
        ],
      },
      inEditor: {
        rowRoot: 'tree-item',
        primaryLabel: 'tree-item-inner',
        innerWrapper: 'tree-item-self',
        childrenContainer: 'tree-item-children',
        collapseIcon: 'collapse-icon',
        cellWrapper: null,
        coverImage: null,
        headerCell: null,
        rowStateMods: ['is-active', 'is-selected', 'is-focused'],
      },
    },
  },

  list: {
    viewMode: 'list',
    features: SHARED_FEATURES,
    scale: { releaseGateNodes: 10_000, mustPassNodes: 50_000, proofNodes: 100_000 },
    nativeDomEmission: { panel: NULL_VOCAB, inEditor: NULL_VOCAB },
  },

  table: {
    viewMode: 'table',
    features: SHARED_FEATURES,
    scale: { releaseGateNodes: 10_000, characterizationNodes: 50_000 },
    adapterNotes: 'Consumes platform projection facts; 50K is characterized before full migration. Adopts Bases table vocabulary in native preset.',
    nativeDomEmission: {
      panel: {
        rowRoot: 'bases-tr',
        primaryLabel: 'bases-table-cell',
        innerWrapper: null,
        childrenContainer: null,
        collapseIcon: null,
        cellWrapper: 'bases-td',
        coverImage: null,
        headerCell: 'bases-table-header',
        rowStateMods: [
          'is-active', 'is-selected', 'is-focused',
          'has-active-menu', 'is-being-dragged', 'is-being-dragged-over',
        ],
      },
      inEditor: {
        rowRoot: 'bases-tr',
        primaryLabel: 'bases-table-cell',
        innerWrapper: null,
        childrenContainer: null,
        collapseIcon: null,
        cellWrapper: 'bases-td',
        coverImage: null,
        headerCell: 'bases-table-header',
        rowStateMods: ['is-active', 'is-selected', 'is-focused'],
      },
    },
  },

  grid: {
    viewMode: 'grid',
    features: SHARED_FEATURES,
    scale: { releaseGateNodes: 10_000, characterizationNodes: 50_000 },
    adapterNotes: 'Consumes platform projection facts; 50K is characterized before full migration. No Bases analog for grid; emits vm-* classes exclusively.',
    nativeDomEmission: { panel: NULL_VOCAB, inEditor: NULL_VOCAB },
  },

  cards: {
    viewMode: 'cards',
    features: SHARED_FEATURES,
    scale: { releaseGateNodes: 10_000, characterizationNodes: 50_000 },
    adapterNotes: 'Consumes platform projection facts; 50K is characterized before full migration. Adopts Bases cards (gallery) vocabulary in native preset, including bases-cards-cover for the media slot.',
    nativeDomEmission: {
      panel: {
        rowRoot: 'bases-cards-item',
        primaryLabel: 'bases-cards-property mod-title',
        innerWrapper: null,
        childrenContainer: null,
        collapseIcon: null,
        cellWrapper: 'bases-cards-property',
        coverImage: 'bases-cards-cover',
        headerCell: null,
        rowStateMods: [
          'is-active', 'is-selected', 'is-focused',
          'has-active-menu', 'is-being-dragged', 'is-being-dragged-over',
        ],
      },
      inEditor: {
        rowRoot: 'bases-cards-item',
        primaryLabel: 'bases-cards-property mod-title',
        innerWrapper: null,
        childrenContainer: null,
        collapseIcon: null,
        cellWrapper: 'bases-cards-property',
        coverImage: 'bases-cards-cover',
        headerCell: null,
        rowStateMods: ['is-active', 'is-selected', 'is-focused'],
      },
    },
  },
};
```

- [ ] **Step 6: Run test to verify pass**

Run:

```powershell
pnpm vitest run test/unit/services/serviceExplorerViewContract.test.ts
```

Expected: PASS. All 9 test cases green.

- [ ] **Step 7: Run `pnpm verify` to ensure no broader regressions**

Run:

```powershell
pnpm verify
```

Expected: PASS — unit + component + lint all green. Type compile passes because the new fields are additive; no existing consumer requires `nativeDomEmission` yet (consumers wire in C6/C8).

- [ ] **Step 8: Commit**

```powershell
git add src/services/serviceExplorerViewContract.ts src/types/typeViewHost.ts test/unit/services/serviceExplorerViewContract.test.ts
git commit -m "feat(0-A): extend ExplorerViewFeatureContract with nativeDomEmission

Adds NativeStateMod, NativeClassVocabulary, NativeDomEmission types and
per-view CONTRACTS literals encoding the honest-hybrid native vocabulary
(tree-item* for tree, Bases vocab for table/cards, vm-only for list/grid).
Adds UNIVERSAL_DND_VOCAB shared constant and declares ViewHostMountContext,
NoteContextProvider, InEditorMountContract types for the in-editor seam.
No consumers wired yet; this commit is type-only foundation."
```

## Verification gates

- New unit tests pass (9 cases).
- `pnpm verify` baseline preserved.
- Bundle size delta negligible (types only + literals).
- Git diff scoped to: `src/services/serviceExplorerViewContract.ts`, `src/types/typeViewHost.ts`, `test/unit/services/serviceExplorerViewContract.test.ts`.

## Rollback

`git revert <commit>` cleanly removes the additions. No consumers depend on them yet.
