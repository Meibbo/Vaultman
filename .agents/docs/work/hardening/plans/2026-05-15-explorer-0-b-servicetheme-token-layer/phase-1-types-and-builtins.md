---
title: Phase 1 — Types and built-ins
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B plan]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/plan
  - explorer/theme
---

# Phase 1 — Types And Built-ins

Three tasks. Lock the type contract first, then the built-in constants.
No runtime behavior yet.

## Task 1 — `ThemePreset` type module + `isBuiltInPreset`

**Files:**
- Create: `src/types/typeThemePreset.ts`
- Create: `test/unit/types/typeThemePreset.test.ts`

- [ ] **Step 1: Create the type module skeleton**

Create `src/types/typeThemePreset.ts` with the full type contract from
[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/03-api-contract|spec shard 03 §"ThemePreset type — exhaustive contract"]].
Include exactly:

```typescript
export type ThemePresetId = string;
export type ThemePresetSource = 'built-in' | 'custom';
export type ExplorerViewMode = 'tree' | 'table' | 'grid' | 'cards' | 'list';

export interface ChromeTokens {
  popupBgOpacity: number;
  popupBackdropBlur: string;
  popupBgTint: number;
}

export interface DensityTokens {
  rowHeight: string;
  rowPaddingY: string;
  iconSize: string;
}

export interface NodeElementVisibility {
  icon: boolean;
  label: boolean;
  detail: boolean;
  media: boolean;
  badges: {
    ops: boolean;
    filters: boolean;
    warnings: boolean;
    inherited: boolean;
    counts: boolean;
  };
  actions: boolean;
}

export type DockPresentation =
  | 'bar' | 'drawer' | 'pill-fab' | 'accordion' | 'hidden';
export type TabsPresentation =
  | 'top-tabs' | 'drawer' | 'overlay' | 'island' | 'hidden';
export type TabsKind =
  | 'workspace' | 'modal' | 'status-bar-island' | 'embedded';
export type ToolbarButtonSet = 'core' | 'full' | readonly string[];

export interface DockSettings {
  visible: boolean;
  presentation: DockPresentation;
}

export interface TabsSettings {
  visible: boolean;
  presentation: TabsPresentation;
  kind: TabsKind;
}

export interface ToolbarSettings {
  buttons: ToolbarButtonSet;
}

export interface ColorKnobMap {
  zebraRows?: boolean;
  rainbowNodes?: 'off' | 'manual' | 'auto-hsv';
  accentOverride?: string;
  custom?: Record<string, string>;
}

export interface LayoutPlacementMap {
  mode?: 'fixed' | 'squared-grid' | 'free-drag';
  placements?: Record<string, {
    region: string;
    width?: number;
    height?: number;
    order?: number;
  }>;
}

export interface ThemePreset {
  source: ThemePresetSource;
  id: ThemePresetId;
  displayName: string;
  extends?: ThemePresetId;

  useNativeDom: boolean;
  chrome: ChromeTokens;
  density: DensityTokens;

  dock: DockSettings;
  tabs: TabsSettings;
  toolbar: ToolbarSettings;
  viewModes: readonly ExplorerViewMode[];
  nodeElements: NodeElementVisibility;
  lockNodeElementVisibility: boolean;

  unload?: readonly string[];
  colors?: ColorKnobMap;
  layout?: LayoutPlacementMap;
  workspaceId?: string;
}

const BUILT_IN_IDS: ReadonlySet<ThemePresetId> = new Set([
  'native',
  'vaultman',
]);

export function isBuiltInPreset(p: ThemePreset): boolean {
  return p.source === 'built-in';
}
```

Do NOT add `normalizeCustomPreset` yet — that lands in T2.

- [ ] **Step 2: Write the failing tests for `isBuiltInPreset`**

Create `test/unit/types/typeThemePreset.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  isBuiltInPreset,
  type ThemePreset,
} from '../../../src/types/typeThemePreset';

const SAMPLE_BUILT_IN: ThemePreset = {
  source: 'built-in',
  id: 'sample',
  displayName: 'Sample',
  useNativeDom: false,
  chrome: { popupBgOpacity: 1, popupBackdropBlur: '0px', popupBgTint: 0 },
  density: { rowHeight: '30px', rowPaddingY: '4px', iconSize: '16px' },
  dock: { visible: true, presentation: 'bar' },
  tabs: { visible: true, presentation: 'top-tabs', kind: 'embedded' },
  toolbar: { buttons: 'full' },
  viewModes: ['tree'],
  nodeElements: {
    icon: true, label: true, detail: true, media: false,
    badges: { ops: false, filters: false, warnings: false, inherited: false, counts: false },
    actions: false,
  },
  lockNodeElementVisibility: false,
};

describe('isBuiltInPreset', () => {
  it('returns true for source: built-in', () => {
    expect(isBuiltInPreset(SAMPLE_BUILT_IN)).toBe(true);
  });

  it('returns false for source: custom', () => {
    const custom: ThemePreset = { ...SAMPLE_BUILT_IN, source: 'custom' };
    expect(isBuiltInPreset(custom)).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/types/typeThemePreset.test.ts`
Expected: PASS — 2 tests pass.

- [ ] **Step 4: `pnpm check`**

Run: `pnpm check`
Expected: 0 errors / 0 warnings (or no new errors beyond the existing
8 lint warnings noted in baseline).

- [ ] **Step 5: Commit**

```bash
git add src/types/typeThemePreset.ts test/unit/types/typeThemePreset.test.ts
git commit -m "$(cat <<'EOF'
feat(0-b): add ThemePreset type contract + isBuiltInPreset

Introduces the exhaustive ThemePreset shape that subsequent sub-systems
will consume. All future preset dimensions (dock, tabs, toolbar,
viewModes, nodeElements, unload?, colors?, layout?, workspaceId?,
extends?) are declared. 0-B wires only useNativeDom + chrome + density;
remaining fields are declare-only.

See .agents/docs/work/hardening/specs/2026-05-15-explorer-0-b-
servicetheme-token-layer/03-api-contract.md.
EOF
)"
```

## Task 2 — `normalizeCustomPreset` validator and helpers

**Files:**
- Modify: `src/types/typeThemePreset.ts` (append normalizer + helpers)
- Modify: `test/unit/types/typeThemePreset.test.ts` (append tests)

- [ ] **Step 1: Write failing tests for input rejection**

Append to `test/unit/types/typeThemePreset.test.ts`:

```typescript
import { normalizeCustomPreset } from '../../../src/types/typeThemePreset';

function makeMinimalCustomRaw(overrides: Record<string, unknown> = {}): unknown {
  return {
    source: 'custom',
    id: 'unset',
    displayName: 'Test',
    useNativeDom: false,
    chrome: { popupBgOpacity: 0.5, popupBackdropBlur: '2px', popupBgTint: 0 },
    density: { rowHeight: '30px', rowPaddingY: '3px', iconSize: '15px' },
    dock: { visible: true, presentation: 'bar' },
    tabs: { visible: true, presentation: 'top-tabs', kind: 'embedded' },
    toolbar: { buttons: 'full' },
    viewModes: ['tree', 'list'],
    nodeElements: {
      icon: true, label: true, detail: true, media: false,
      badges: { ops: true, filters: true, warnings: true, inherited: true, counts: true },
      actions: true,
    },
    lockNodeElementVisibility: false,
    ...overrides,
  };
}

describe('normalizeCustomPreset', () => {
  it('rejects non-object inputs', () => {
    expect(normalizeCustomPreset(null)).toBeNull();
    expect(normalizeCustomPreset(undefined)).toBeNull();
    expect(normalizeCustomPreset('string')).toBeNull();
    expect(normalizeCustomPreset(42)).toBeNull();
    expect(normalizeCustomPreset([])).toBeNull();
  });

  it('rejects source !== "custom"', () => {
    const raw = makeMinimalCustomRaw({ source: 'built-in', id: 'x' });
    expect(normalizeCustomPreset(raw)).toBeNull();
  });

  it('rejects built-in id collisions', () => {
    expect(normalizeCustomPreset(makeMinimalCustomRaw({ id: 'native' }))).toBeNull();
    expect(normalizeCustomPreset(makeMinimalCustomRaw({ id: 'vaultman' }))).toBeNull();
  });

  it('rejects missing or empty id', () => {
    expect(normalizeCustomPreset(makeMinimalCustomRaw({ id: '' }))).toBeNull();
    expect(normalizeCustomPreset(makeMinimalCustomRaw({ id: 42 }))).toBeNull();
  });

  it('accepts a minimal valid custom and returns it', () => {
    const raw = makeMinimalCustomRaw({ id: 'mine' });
    const result = normalizeCustomPreset(raw);
    expect(result).not.toBeNull();
    expect(result?.source).toBe('custom');
    expect(result?.id).toBe('mine');
  });

  it('forces nodeElements.media to false even if raw says true', () => {
    const raw = makeMinimalCustomRaw({
      id: 'm',
      nodeElements: {
        icon: true, label: true, detail: true, media: true,
        badges: { ops: false, filters: false, warnings: false, inherited: false, counts: false },
        actions: true,
      },
    });
    const result = normalizeCustomPreset(raw);
    expect(result?.nodeElements.media).toBe(false);
  });

  it('strips "markmap" from viewModes silently', () => {
    const raw = makeMinimalCustomRaw({
      id: 'm',
      viewModes: ['tree', 'markmap', 'list'],
    });
    const result = normalizeCustomPreset(raw);
    expect(result?.viewModes).toEqual(['tree', 'list']);
  });

  it('passes through valid extends id', () => {
    const raw = makeMinimalCustomRaw({ id: 'm', extends: 'native' });
    const result = normalizeCustomPreset(raw);
    expect(result?.extends).toBe('native');
  });

  it('ignores invalid extends types', () => {
    const raw = makeMinimalCustomRaw({ id: 'm', extends: 42 });
    const result = normalizeCustomPreset(raw);
    expect(result?.extends).toBeUndefined();
  });

  it('preserves optional unload[] when valid', () => {
    const raw = makeMinimalCustomRaw({
      id: 'm',
      unload: ['file-explorer', 'tag-pane'],
    });
    const result = normalizeCustomPreset(raw);
    expect(result?.unload).toEqual(['file-explorer', 'tag-pane']);
  });
});
```

- [ ] **Step 2: Run tests — verify they FAIL**

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/types/typeThemePreset.test.ts`
Expected: FAIL — `normalizeCustomPreset is not a function` for all new tests.

- [ ] **Step 3: Implement `normalizeCustomPreset` in `src/types/typeThemePreset.ts`**

Append:

```typescript
function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function normalizeChrome(raw: unknown): ChromeTokens | null {
  if (!isRecord(raw)) return null;
  const o = typeof raw.popupBgOpacity === 'number' ? raw.popupBgOpacity : null;
  const b = typeof raw.popupBackdropBlur === 'string' ? raw.popupBackdropBlur : null;
  const t = typeof raw.popupBgTint === 'number' ? raw.popupBgTint : 0;
  if (o === null || b === null) return null;
  return { popupBgOpacity: o, popupBackdropBlur: b, popupBgTint: t };
}

function normalizeDensity(raw: unknown): DensityTokens | null {
  if (!isRecord(raw)) return null;
  const rh = typeof raw.rowHeight === 'string' ? raw.rowHeight : null;
  const py = typeof raw.rowPaddingY === 'string' ? raw.rowPaddingY : null;
  const is = typeof raw.iconSize === 'string' ? raw.iconSize : null;
  if (rh === null || py === null || is === null) return null;
  return { rowHeight: rh, rowPaddingY: py, iconSize: is };
}

const VALID_DOCK_PRESENTATIONS = new Set<DockPresentation>([
  'bar', 'drawer', 'pill-fab', 'accordion', 'hidden',
]);

function normalizeDock(raw: unknown): DockSettings {
  if (!isRecord(raw)) return { visible: true, presentation: 'bar' };
  return {
    visible: raw.visible === true,
    presentation:
      typeof raw.presentation === 'string' &&
      VALID_DOCK_PRESENTATIONS.has(raw.presentation as DockPresentation)
        ? (raw.presentation as DockPresentation)
        : 'bar',
  };
}

const VALID_TABS_PRESENTATIONS = new Set<TabsPresentation>([
  'top-tabs', 'drawer', 'overlay', 'island', 'hidden',
]);
const VALID_TABS_KINDS = new Set<TabsKind>([
  'workspace', 'modal', 'status-bar-island', 'embedded',
]);

function normalizeTabs(raw: unknown): TabsSettings {
  if (!isRecord(raw)) return { visible: true, presentation: 'top-tabs', kind: 'embedded' };
  return {
    visible: raw.visible === true,
    presentation:
      typeof raw.presentation === 'string' &&
      VALID_TABS_PRESENTATIONS.has(raw.presentation as TabsPresentation)
        ? (raw.presentation as TabsPresentation)
        : 'top-tabs',
    kind:
      typeof raw.kind === 'string' &&
      VALID_TABS_KINDS.has(raw.kind as TabsKind)
        ? (raw.kind as TabsKind)
        : 'embedded',
  };
}

function normalizeToolbar(raw: unknown): ToolbarSettings {
  if (!isRecord(raw)) return { buttons: 'full' };
  const b = raw.buttons;
  if (b === 'core' || b === 'full') return { buttons: b };
  if (Array.isArray(b)) {
    return { buttons: b.filter((x): x is string => typeof x === 'string') };
  }
  return { buttons: 'full' };
}

const VALID_VIEW_MODES = new Set<ExplorerViewMode>([
  'tree', 'table', 'grid', 'cards', 'list',
]);

function normalizeViewModes(raw: unknown): readonly ExplorerViewMode[] {
  if (!Array.isArray(raw)) return ['tree'];
  const out = raw.filter(
    (x): x is ExplorerViewMode =>
      typeof x === 'string' && VALID_VIEW_MODES.has(x as ExplorerViewMode),
  );
  return out.length === 0 ? ['tree'] : out;
}

function normalizeNodeElements(raw: unknown): NodeElementVisibility {
  const def: NodeElementVisibility = {
    icon: true, label: true, detail: true,
    media: false,
    badges: { ops: false, filters: false, warnings: false, inherited: false, counts: false },
    actions: true,
  };
  if (!isRecord(raw)) return def;
  const badgesRaw = isRecord(raw.badges) ? raw.badges : {};
  return {
    icon: raw.icon === true,
    label: raw.label === true,
    detail: raw.detail === true,
    media: false, // forced — defaults-off invariant
    badges: {
      ops: badgesRaw.ops === true,
      filters: badgesRaw.filters === true,
      warnings: badgesRaw.warnings === true,
      inherited: badgesRaw.inherited === true,
      counts: badgesRaw.counts === true,
    },
    actions: raw.actions === true,
  };
}

function normalizeColors(raw: unknown): ColorKnobMap | undefined {
  if (!isRecord(raw)) return undefined;
  const out: ColorKnobMap = {};
  if (typeof raw.zebraRows === 'boolean') out.zebraRows = raw.zebraRows;
  if (raw.rainbowNodes === 'off' || raw.rainbowNodes === 'manual' || raw.rainbowNodes === 'auto-hsv') {
    out.rainbowNodes = raw.rainbowNodes;
  }
  if (typeof raw.accentOverride === 'string') out.accentOverride = raw.accentOverride;
  if (isRecord(raw.custom)) {
    out.custom = {};
    for (const [k, v] of Object.entries(raw.custom)) {
      if (typeof v === 'string') out.custom[k] = v;
    }
  }
  return out;
}

function normalizeLayout(raw: unknown): LayoutPlacementMap | undefined {
  if (!isRecord(raw)) return undefined;
  const out: LayoutPlacementMap = {};
  if (raw.mode === 'fixed' || raw.mode === 'squared-grid' || raw.mode === 'free-drag') {
    out.mode = raw.mode;
  }
  if (isRecord(raw.placements)) {
    const placements: LayoutPlacementMap['placements'] = {};
    for (const [k, v] of Object.entries(raw.placements)) {
      if (isRecord(v) && typeof v.region === 'string') {
        placements[k] = {
          region: v.region,
          width: typeof v.width === 'number' ? v.width : undefined,
          height: typeof v.height === 'number' ? v.height : undefined,
          order: typeof v.order === 'number' ? v.order : undefined,
        };
      }
    }
    out.placements = placements;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function normalizeCustomPreset(raw: unknown): ThemePreset | null {
  if (!isRecord(raw)) return null;
  if (raw.source !== 'custom') return null;
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
  if (BUILT_IN_IDS.has(raw.id)) return null;
  if (typeof raw.displayName !== 'string') return null;
  if (typeof raw.useNativeDom !== 'boolean') return null;

  const chrome = normalizeChrome(raw.chrome);
  if (!chrome) return null;
  const density = normalizeDensity(raw.density);
  if (!density) return null;

  return {
    source: 'custom',
    id: raw.id,
    displayName: raw.displayName,
    extends: typeof raw.extends === 'string' ? raw.extends : undefined,

    useNativeDom: raw.useNativeDom,
    chrome,
    density,

    dock: normalizeDock(raw.dock),
    tabs: normalizeTabs(raw.tabs),
    toolbar: normalizeToolbar(raw.toolbar),
    viewModes: normalizeViewModes(raw.viewModes),
    nodeElements: normalizeNodeElements(raw.nodeElements),
    lockNodeElementVisibility: raw.lockNodeElementVisibility === true,

    unload: Array.isArray(raw.unload)
      ? (raw.unload.filter((x): x is string => typeof x === 'string') as readonly string[])
      : undefined,
    colors: normalizeColors(raw.colors),
    layout: normalizeLayout(raw.layout),
    workspaceId: typeof raw.workspaceId === 'string' ? raw.workspaceId : undefined,
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/types/typeThemePreset.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: `pnpm check`**

Run: `pnpm check`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/types/typeThemePreset.ts test/unit/types/typeThemePreset.test.ts
git commit -m "$(cat <<'EOF'
feat(0-b): add normalizeCustomPreset validator

Validates raw custom preset shape from data.json. Rejects non-objects,
source !== 'custom', built-in id collisions, missing required fields,
and invalid CSS-length/number primitives. Enforces invariants:
nodeElements.media is forced false; viewModes drops 'markmap' silently.

Optional fields (extends, unload, colors, layout, workspaceId) are
preserved through normalization when valid.
EOF
)"
```

## Task 3 — Built-in preset constants + invariant tests

**Files:**
- Create: `src/config/themePresetsBuiltin.ts`
- Create: `test/unit/config/themePresetsBuiltin.test.ts`

- [ ] **Step 1: Create built-in constants file**

Create `src/config/themePresetsBuiltin.ts`:

```typescript
import type { ThemePreset } from '../types/typeThemePreset';

/**
 * Native preset — chameleon disguise.
 * Mimics Obsidian core File Explorer surface:
 * - DOM emits native classes (nav-file, tree-item, metadata-property…)
 * - Single tree view only
 * - No dock, no top-tabs, no extra vm buttons
 * - Compact density matching core
 * - Element visibility locked (user btnMultiSelection hidden)
 *
 * Not the fresh-install default. Users opt in for core-equivalent
 * disguise.
 */
export const PRESET_NATIVE: ThemePreset = {
  source: 'built-in',
  id: 'native',
  displayName: 'Native',

  useNativeDom: true,

  chrome: {
    popupBgOpacity: 1,
    popupBackdropBlur: '0px',
    popupBgTint: 0,
  },

  density: {
    rowHeight: '26px',
    rowPaddingY: '2px',
    iconSize: '14px',
  },

  dock: {
    visible: false,
    presentation: 'hidden',
  },

  tabs: {
    visible: false,
    presentation: 'hidden',
    kind: 'workspace',
  },

  toolbar: {
    buttons: 'core',
  },

  viewModes: ['tree'],

  nodeElements: {
    icon: true,
    label: true,
    detail: false,
    media: false,
    badges: {
      ops: false,
      filters: false,
      warnings: true,
      inherited: false,
      counts: false,
    },
    actions: false,
  },

  lockNodeElementVisibility: true,
} as const;

/**
 * Vaultman preset — full plugin layout.
 * The current rich Vaultman experience:
 * - VM-namespaced DOM classes (.vm-*)
 * - All 5 view modes (markmap deferred)
 * - Dock + top-tabs + full toolbar
 * - Comfortable density
 * - User btnMultiSelection unlocked
 * - Slight chrome polish (semi-transparent + small blur)
 *
 * Fresh-install default. Install plugin → see plugin.
 */
export const PRESET_VAULTMAN: ThemePreset = {
  source: 'built-in',
  id: 'vaultman',
  displayName: 'Vaultman',

  useNativeDom: false,

  chrome: {
    popupBgOpacity: 0.92,
    popupBackdropBlur: '4px',
    popupBgTint: 0,
  },

  density: {
    rowHeight: '32px',
    rowPaddingY: '4px',
    iconSize: '16px',
  },

  dock: {
    visible: true,
    presentation: 'bar',
  },

  tabs: {
    visible: true,
    presentation: 'top-tabs',
    kind: 'embedded',
  },

  toolbar: {
    buttons: 'full',
  },

  viewModes: ['tree', 'table', 'grid', 'cards', 'list'],

  nodeElements: {
    icon: true,
    label: true,
    detail: true,
    media: false,
    badges: {
      ops: true,
      filters: true,
      warnings: true,
      inherited: true,
      counts: true,
    },
    actions: true,
  },

  lockNodeElementVisibility: false,
} as const;

export const BUILT_IN_PRESETS = [PRESET_NATIVE, PRESET_VAULTMAN] as const;
```

- [ ] **Step 2: Write failing invariant tests**

Create `test/unit/config/themePresetsBuiltin.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  PRESET_NATIVE,
  PRESET_VAULTMAN,
  BUILT_IN_PRESETS,
} from '../../../src/config/themePresetsBuiltin';

describe('PRESET_NATIVE invariants', () => {
  it('source is built-in, id is "native"', () => {
    expect(PRESET_NATIVE.source).toBe('built-in');
    expect(PRESET_NATIVE.id).toBe('native');
  });

  it('chameleon disguise flags', () => {
    expect(PRESET_NATIVE.useNativeDom).toBe(true);
    expect(PRESET_NATIVE.lockNodeElementVisibility).toBe(true);
    expect(PRESET_NATIVE.viewModes).toEqual(['tree']);
    expect(PRESET_NATIVE.dock.visible).toBe(false);
    expect(PRESET_NATIVE.tabs.visible).toBe(false);
    expect(PRESET_NATIVE.toolbar.buttons).toBe('core');
  });

  it('nodeElements match core file explorer feature set', () => {
    expect(PRESET_NATIVE.nodeElements.media).toBe(false);
    expect(PRESET_NATIVE.nodeElements.detail).toBe(false);
    expect(PRESET_NATIVE.nodeElements.actions).toBe(false);
    expect(PRESET_NATIVE.nodeElements.badges.warnings).toBe(true);
    expect(PRESET_NATIVE.nodeElements.badges.ops).toBe(false);
  });
});

describe('PRESET_VAULTMAN invariants', () => {
  it('source is built-in, id is "vaultman"', () => {
    expect(PRESET_VAULTMAN.source).toBe('built-in');
    expect(PRESET_VAULTMAN.id).toBe('vaultman');
  });

  it('full plugin flags', () => {
    expect(PRESET_VAULTMAN.useNativeDom).toBe(false);
    expect(PRESET_VAULTMAN.lockNodeElementVisibility).toBe(false);
    expect(PRESET_VAULTMAN.viewModes).toEqual(['tree', 'table', 'grid', 'cards', 'list']);
    expect(PRESET_VAULTMAN.viewModes).not.toContain('markmap');
    expect(PRESET_VAULTMAN.dock.visible).toBe(true);
    expect(PRESET_VAULTMAN.tabs.visible).toBe(true);
    expect(PRESET_VAULTMAN.toolbar.buttons).toBe('full');
  });

  it('media slot defaults off even in full vm', () => {
    expect(PRESET_VAULTMAN.nodeElements.media).toBe(false);
  });
});

describe('BUILT_IN_PRESETS array', () => {
  it('contains exactly native + vaultman in canonical order', () => {
    expect(BUILT_IN_PRESETS).toHaveLength(2);
    expect(BUILT_IN_PRESETS.map(p => p.id)).toEqual(['native', 'vaultman']);
  });
});

describe('cross-preset invariants', () => {
  const lengthRe = /^\d+(\.\d+)?(px|em|rem|%)$|^0$/;

  it('all chrome.popupBgOpacity values are in [0..1]', () => {
    for (const p of BUILT_IN_PRESETS) {
      expect(p.chrome.popupBgOpacity).toBeGreaterThanOrEqual(0);
      expect(p.chrome.popupBgOpacity).toBeLessThanOrEqual(1);
    }
  });

  it('all density values are valid CSS lengths', () => {
    for (const p of BUILT_IN_PRESETS) {
      expect(p.density.rowHeight).toMatch(lengthRe);
      expect(p.density.rowPaddingY).toMatch(lengthRe);
      expect(p.density.iconSize).toMatch(lengthRe);
    }
  });

  it('all chrome.popupBackdropBlur values are valid CSS lengths', () => {
    for (const p of BUILT_IN_PRESETS) {
      expect(p.chrome.popupBackdropBlur).toMatch(lengthRe);
    }
  });

  it('native rowHeight numerically less than vaultman rowHeight', () => {
    const nativeRowH = parseInt(PRESET_NATIVE.density.rowHeight, 10);
    const vmRowH = parseInt(PRESET_VAULTMAN.density.rowHeight, 10);
    expect(nativeRowH).toBeLessThan(vmRowH);
  });
});
```

- [ ] **Step 3: Run tests — expect PASS**

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/config/themePresetsBuiltin.test.ts`
Expected: PASS — all tests green (built-ins already match the spec
values from step 1).

- [ ] **Step 4: `pnpm check`**

Run: `pnpm check`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/config/themePresetsBuiltin.ts test/unit/config/themePresetsBuiltin.test.ts
git commit -m "$(cat <<'EOF'
feat(0-b): add built-in theme presets (native + vaultman)

Two as-const constants ship as the 0-B built-in preset set:
- PRESET_NATIVE: chameleon disguise (useNativeDom=true, tree-only,
  no dock/tabs, locked element visibility, compact 26px density).
- PRESET_VAULTMAN: full plugin layout (useNativeDom=false, 5 view
  modes excluding markmap, dock+tabs visible, comfortable 32px
  density, slight chrome polish).

Tests assert chameleon/full invariants, defaults-off media slot,
markmap exclusion, and canonical BUILT_IN_PRESETS order.
EOF
)"
```

When Phase 1 is complete, proceed to
[[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-2-settings-shape|Phase 2]].
