---
title: 03 — C3 serviceViewHost + Symbol context keys
type: plan-task
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 03 — C3: Add `serviceViewHost` runes class + Symbol context keys

Per-panel mutable host state. Owns `viewMode`, `mountContext`, `preset`,
`btnNodeElementsVisibility`. Derives `selectableModes`, `nodeElementMask`,
`multiSelectionAvailable`. No consumers yet (mounted in C4).

**Files:**
- Create: `src/services/serviceViewHost.svelte.ts`
- Create: `src/components/explorer/viewHostContext.ts`
- Create: `src/components/explorer/` (new folder)
- Test: `test/unit/services/serviceViewHost.test.ts`

## Steps

- [ ] **Step 1: Verify parent folder exists and create `src/components/explorer/`**

Run:

```powershell
New-Item -ItemType Directory -Force -Path src/components/explorer | Out-Null
Test-Path src/components/explorer
```

Expected: `True`.

- [ ] **Step 2: Write failing test for runes class state and derivations**

Create `test/unit/services/serviceViewHost.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { ViewHostService } from '../../../src/services/serviceViewHost.svelte';
import type { ThemePreset } from '../../../src/types/typeThemePreset';

function makePreset(args: {
  id?: string;
  viewModes?: readonly string[];
  lock?: boolean;
  media?: boolean;
}): ThemePreset {
  return {
    source: 'built-in',
    id: args.id ?? 'vaultman',
    displayName: 'test',
    useNativeDom: false,
    chrome: { popupBgOpacity: 1, popupBackdropBlur: '0px', popupBgTint: 0 },
    density: { rowHeight: '26px', rowPaddingY: '2px', iconSize: '16px' },
    dock: { visible: true, presentation: 'bar' },
    tabs: { visible: true, presentation: 'top-tabs', kind: 'workspace' },
    toolbar: { buttons: 'core' },
    viewModes: (args.viewModes ?? ['tree', 'list', 'table', 'grid', 'cards']) as never,
    nodeElements: {
      icon: true, label: true, detail: true,
      media: args.media ?? false,
      badges: { ops: true, filters: true, warnings: true, inherited: true, counts: true },
      actions: true,
    },
    lockNodeElementVisibility: args.lock ?? false,
  } as ThemePreset;
}

describe('ViewHostService — state and derivations', () => {
  it('selectableModes is the intersection of preset.viewModes and EXPLORER_PLATFORM_VIEW_MODES', () => {
    const preset = makePreset({ viewModes: ['tree', 'list', 'outline' as never] });
    const svc = new ViewHostService({ preset, mountContext: 'panel' });
    expect(svc.selectableModes).toEqual(['tree', 'list']);
  });

  it('native preset selectableModes equals [tree]', () => {
    const preset = makePreset({ id: 'native', viewModes: ['tree'], lock: true });
    const svc = new ViewHostService({ preset, mountContext: 'panel' });
    expect(svc.selectableModes).toEqual(['tree']);
  });

  it('nodeElementMask follows preset baseline when no overrides', () => {
    const preset = makePreset({ lock: false, media: false });
    const svc = new ViewHostService({ preset, mountContext: 'panel' });
    expect(svc.nodeElementMask.media).toBe(false);
    expect(svc.nodeElementMask.icon).toBe(true);
  });

  it('toggleElement flips an override when unlocked', () => {
    const preset = makePreset({ lock: false, media: false });
    const svc = new ViewHostService({ preset, mountContext: 'panel' });
    svc.toggleElement('media');
    expect(svc.nodeElementMask.media).toBe(true);
  });

  it('toggleElement is a no-op when locked', () => {
    const preset = makePreset({ lock: true, media: false });
    const svc = new ViewHostService({ preset, mountContext: 'panel' });
    svc.toggleElement('media');
    expect(svc.nodeElementMask.media).toBe(false);
  });

  it('toggleElement("badges") flips all 5 badge sub-kinds together', () => {
    const preset = makePreset({ lock: false });
    const svc = new ViewHostService({ preset, mountContext: 'panel' });
    svc.toggleElement('badges');
    expect(svc.nodeElementMask.badges.ops).toBe(false);
    expect(svc.nodeElementMask.badges.filters).toBe(false);
    expect(svc.nodeElementMask.badges.warnings).toBe(false);
    expect(svc.nodeElementMask.badges.inherited).toBe(false);
    expect(svc.nodeElementMask.badges.counts).toBe(false);
  });

  it('toggleBadgeKind flips only that sub-kind', () => {
    const preset = makePreset({ lock: false });
    const svc = new ViewHostService({ preset, mountContext: 'panel' });
    svc.toggleBadgeKind('warnings');
    expect(svc.nodeElementMask.badges.warnings).toBe(false);
    expect(svc.nodeElementMask.badges.ops).toBe(true);
  });

  it('resetOverrides clears all overrides; mask returns to baseFromPreset', () => {
    const preset = makePreset({ lock: false, media: false });
    const svc = new ViewHostService({ preset, mountContext: 'panel' });
    svc.toggleElement('media');
    svc.toggleElement('icon');
    svc.resetOverrides();
    expect(svc.nodeElementMask.media).toBe(false);
    expect(svc.nodeElementMask.icon).toBe(true);
  });

  it('multiSelectionAvailable is true when unlocked AND view has nodeElementToggles', () => {
    const preset = makePreset({ lock: false });
    const svc = new ViewHostService({ preset, mountContext: 'panel', initialViewMode: 'tree' });
    expect(svc.multiSelectionAvailable).toBe(true);
  });

  it('multiSelectionAvailable is false when locked', () => {
    const preset = makePreset({ lock: true });
    const svc = new ViewHostService({ preset, mountContext: 'panel', initialViewMode: 'tree' });
    expect(svc.multiSelectionAvailable).toBe(false);
  });

  it('switching preset preserves btnNodeElementsVisibility overrides', () => {
    const presetA = makePreset({ id: 'vaultman', lock: false, media: false });
    const presetB = makePreset({ id: 'vaultman', lock: false, media: false });
    const svc = new ViewHostService({ preset: presetA, mountContext: 'panel' });
    svc.toggleElement('media');
    expect(svc.nodeElementMask.media).toBe(true);
    svc.preset = presetB;
    expect(svc.btnNodeElementsVisibility.media).toBe(true);
    expect(svc.nodeElementMask.media).toBe(true);
  });

  it('switching to a locked preset makes overrides dormant; mask reflects preset baseline', () => {
    const unlocked = makePreset({ id: 'vaultman', lock: false, media: false });
    const locked = makePreset({ id: 'native', lock: true, media: false });
    const svc = new ViewHostService({ preset: unlocked, mountContext: 'panel' });
    svc.toggleElement('media');
    expect(svc.nodeElementMask.media).toBe(true);
    svc.preset = locked;
    expect(svc.nodeElementMask.media).toBe(false);
    expect(svc.btnNodeElementsVisibility.media).toBe(true);
  });

  it('setViewMode updates viewMode state', () => {
    const preset = makePreset({});
    const svc = new ViewHostService({ preset, mountContext: 'panel', initialViewMode: 'tree' });
    svc.setViewMode('cards');
    expect(svc.viewMode).toBe('cards');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```powershell
pnpm vitest run test/unit/services/serviceViewHost.test.ts
```

Expected: FAIL with "Cannot find module 'serviceViewHost.svelte'".

- [ ] **Step 4: Implement `src/services/serviceViewHost.svelte.ts`**

```typescript
import type { ThemePreset } from '../types/typeThemePreset';
import type { ExplorerViewMode } from '../types/typeViews';
import {
  EXPLORER_PLATFORM_VIEW_MODES,
  explorerViewContract,
  type ExplorerPlatformViewMode,
} from './serviceExplorerViewContract';
import type {
  NodeElementMask,
  NodeElementOverrides,
  NodeElementKind,
  BadgeKindMask,
  ViewHostMountContext,
} from '../types/typeViewHost';
import { computeNodeElementMask } from './serviceNodeElementVisibility';

export interface ViewHostServiceArgs {
  preset: ThemePreset;
  mountContext: ViewHostMountContext;
  initialViewMode?: ExplorerViewMode;
}

export class ViewHostService {
  preset = $state<ThemePreset>() as ThemePreset;
  mountContext = $state<ViewHostMountContext>('panel');
  viewMode = $state<ExplorerViewMode>('tree');
  btnNodeElementsVisibility = $state<NodeElementOverrides>({});

  readonly selectableModes = $derived<readonly ExplorerPlatformViewMode[]>(
    EXPLORER_PLATFORM_VIEW_MODES.filter((m) => (this.preset.viewModes as readonly string[]).includes(m)),
  );

  readonly nodeElementMask = $derived<NodeElementMask>(
    computeNodeElementMask(
      this.preset,
      this.preset.lockNodeElementVisibility ? null : this.btnNodeElementsVisibility,
    ),
  );

  readonly multiSelectionAvailable = $derived<boolean>(
    !this.preset.lockNodeElementVisibility
    && this.isPlatformMode(this.viewMode)
    && explorerViewContract(this.viewMode as ExplorerPlatformViewMode).features.nodeElementToggles,
  );

  constructor(args: ViewHostServiceArgs) {
    this.preset = args.preset;
    this.mountContext = args.mountContext;
    if (args.initialViewMode) this.viewMode = args.initialViewMode;
  }

  setViewMode(mode: ExplorerViewMode): void {
    this.viewMode = mode;
  }

  toggleElement(kind: NodeElementKind): void {
    if (this.preset.lockNodeElementVisibility) return;
    if (kind === 'badges') {
      const currentParent = this.nodeElementMask.badges;
      const allOn = currentParent.ops && currentParent.filters && currentParent.warnings && currentParent.inherited && currentParent.counts;
      const newValue = !allOn;
      this.btnNodeElementsVisibility = {
        ...this.btnNodeElementsVisibility,
        badges: {
          ops: newValue, filters: newValue, warnings: newValue,
          inherited: newValue, counts: newValue,
        },
      };
      return;
    }
    this.btnNodeElementsVisibility = {
      ...this.btnNodeElementsVisibility,
      [kind]: !this.nodeElementMask[kind],
    };
  }

  toggleBadgeKind(badgeKind: keyof BadgeKindMask): void {
    if (this.preset.lockNodeElementVisibility) return;
    const currentBadges = this.nodeElementMask.badges;
    this.btnNodeElementsVisibility = {
      ...this.btnNodeElementsVisibility,
      badges: { ...currentBadges, [badgeKind]: !currentBadges[badgeKind] },
    };
  }

  resetOverrides(): void {
    this.btnNodeElementsVisibility = {};
  }

  private isPlatformMode(mode: ExplorerViewMode): boolean {
    return (EXPLORER_PLATFORM_VIEW_MODES as readonly string[]).includes(mode);
  }
}
```

- [ ] **Step 5: Implement `src/components/explorer/viewHostContext.ts`**

```typescript
import type { ViewHostService } from '../../services/serviceViewHost.svelte';
import type { ThemePreset } from '../../types/typeThemePreset';
import type { NodeElementMask } from '../../types/typeViewHost';

// Typed Symbol pattern mirrors O's FRAME_NAVIGATION_KEY / FRAME_POPUPS_KEY.
// If O uses a generic helper (e.g., createInjectionKey<T>()), reuse it
// here for consistency; otherwise the cast pattern below is the locked
// fallback.

export const VIEW_HOST_KEY = Symbol('VIEW_HOST') as unknown as {
  readonly _t: ViewHostService;
};

export const NODE_ELEMENT_MASK_KEY = Symbol('NODE_ELEMENT_MASK') as unknown as {
  readonly _t: { value: () => NodeElementMask };
};

export const PRESET_KEY = Symbol('PRESET') as unknown as {
  readonly _t: { value: () => ThemePreset };
};

export type ViewHostKey = typeof VIEW_HOST_KEY;
export type NodeElementMaskKey = typeof NODE_ELEMENT_MASK_KEY;
export type PresetKey = typeof PRESET_KEY;
```

- [ ] **Step 6: Check O's actual Symbol-key pattern and align if needed**

Run:

```powershell
Get-Content src/components/frame/frameNavigation.svelte.ts -TotalCount 60
```

Look for: any `createInjectionKey<T>()` generic helper or different cast
pattern. If O uses a helper, replace the cast above with that helper for
consistency. If O uses a different cast, match it. Update
`viewHostContext.ts` accordingly. This is a small fix-up, not a behavior
change.

- [ ] **Step 7: Run test to verify pass**

Run:

```powershell
pnpm vitest run test/unit/services/serviceViewHost.test.ts
```

Expected: PASS — all 13 cases green.

- [ ] **Step 8: Run `pnpm verify`**

Run:

```powershell
pnpm verify
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add src/services/serviceViewHost.svelte.ts src/components/explorer/viewHostContext.ts test/unit/services/serviceViewHost.test.ts
git commit -m "feat(0-A): add serviceViewHost runes class + Symbol context keys

ViewHostService owns per-panel state (preset, mountContext, viewMode,
btnNodeElementsVisibility) with reactive derivations for selectableModes,
nodeElementMask, multiSelectionAvailable. Supports preset switch with
override-dormancy preservation, feature-contract gating of multi-selection
submenu, badge bulk-toggle and sub-toggle, reset semantics.

VIEW_HOST_KEY / NODE_ELEMENT_MASK_KEY / PRESET_KEY typed Symbol context
keys exported for ViewHost shell consumption in C4."
```

## Verification gates

- 13 unit tests pass.
- `pnpm verify` baseline preserved.
- No consumer of the service yet (ViewHost shell mounts it in C4).

## Rollback

`git revert <commit>` cleanly removes additions.
