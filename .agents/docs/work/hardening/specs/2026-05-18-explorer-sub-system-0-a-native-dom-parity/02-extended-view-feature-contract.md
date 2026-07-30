---
title: 02 — Extended View Feature Contract
type: spec-shard
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 02 — Extended View Feature Contract

Extends the existing [`ExplorerViewFeatureContract`](../../../../../src/services/serviceExplorerViewContract.ts) with native-DOM-vocabulary fields. The existing fields (`viewMode`, `features`, `scale`, `adapterNotes`) are preserved.

## Type additions

```typescript
// src/services/serviceExplorerViewContract.ts (additions)

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

export interface ExplorerViewFeatureContract {
  viewMode: ExplorerPlatformViewMode;
  features: ExplorerViewFeatureFlags;
  scale: ExplorerViewScaleContract;
  nativeDomEmission: NativeDomEmission;
  adapterNotes?: string;
}
```

`NativeClassVocabulary` fields use `null` to signal "no native vocabulary in this slot for this view × context". `null` is a positive declaration (we have no analog) and is distinct from `undefined` (unspecified). View components treat `null` as "emit only the `vm-*` class, no native additive class".

## Universal DnD vocabulary

DnD state mods are universal across panels in Obsidian (file-explorer, outline tab, bases). Vaultman publishes them as a single shared constant rather than re-listing them in every view contract.

```typescript
// src/types/typeViewHost.ts (additions)

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
```

`is-being-dragged` and `is-being-dragged-over` appear in `NativeStateMod` (for `nativeDomEmission.rowStateMods` allowlists);
the universal const is the SOURCE-of-truth string. View components import from `UNIVERSAL_DND_VOCAB` for the literal string and consult `rowStateMods.includes('is-being-dragged')` for the per-view emission decision.

## Per-view literals (Bases-corrected)

```typescript
const SHARED_FEATURES: ExplorerViewFeatureFlags = {
  selection: true,
  keyboardFocus: true,
  contextMenu: true,
  scrollReveal: true,
  badges: true,
  nodeElementToggles: true,
  acceptsMediaDescriptors: true,
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
    nativeDomEmission: {
      panel:    { rowRoot: null, primaryLabel: null, innerWrapper: null, childrenContainer: null, collapseIcon: null, cellWrapper: null, coverImage: null, headerCell: null, rowStateMods: [] },
      inEditor: { rowRoot: null, primaryLabel: null, innerWrapper: null, childrenContainer: null, collapseIcon: null, cellWrapper: null, coverImage: null, headerCell: null, rowStateMods: [] },
    },
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
    nativeDomEmission: {
      panel:    { rowRoot: null, primaryLabel: null, innerWrapper: null, childrenContainer: null, collapseIcon: null, cellWrapper: null, coverImage: null, headerCell: null, rowStateMods: [] },
      inEditor: { rowRoot: null, primaryLabel: null, innerWrapper: null, childrenContainer: null, collapseIcon: null, cellWrapper: null, coverImage: null, headerCell: null, rowStateMods: [] },
    },
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

## Invariants enforced by C1 tests

- `CONTRACTS` is exhaustive over `EXPLORER_PLATFORM_VIEW_MODES` (TypeScript exhaustiveness check + runtime test asserting all 5 keys present).
- Each `nativeDomEmission` has both `panel` and `inEditor` slots.
- `rowStateMods` is a subset of `NativeStateMod` literal union.
- `null` is the only valid "no vocab" marker; empty string is invalid.
- Tree native vocab literals match the `tree-item*` family documented in `08-in-editor-seam-vocabulary.md`.
- Table native vocab literals match Bases table family (`bases-tr`, `bases-table-cell`, `bases-td`, `bases-table-header`).
- Cards native vocab literals match Bases cards family (`bases-cards-item`, `bases-cards-property mod-title`, `bases-cards-property`, `bases-cards-cover`).
- List and Grid have `rowRoot === null` in both contexts (no native analog).

## Source provenance

Vocab literals captured from `C:\Users\vic_A\Desktop\obsidian-web-lab` during 0-A brainstorm research:
- `obsidian/app.css` lines 9446-20395 for `tree-item*` family
- `obsidian/app.css` lines 2031-2085 and 14297-14670 for `bases-table-*` and `bases-tr` / `bases-td`
- `obsidian/app.css` lines 2075-2085 and 14097-14201 for `bases-cards-*` and `bases-cards-cover`

If Obsidian renames any of these classes in future minor versions, the breakage is localized to this file. Live `plugin-dev` smoke catches it. See `11-risks-and-followups.md` risk R5.
