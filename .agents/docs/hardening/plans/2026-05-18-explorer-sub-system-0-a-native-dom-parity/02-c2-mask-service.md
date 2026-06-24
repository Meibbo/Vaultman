---
title: 02 — C2 serviceNodeElementVisibility
type: plan-task
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 02 — C2: Add `serviceNodeElementVisibility`

Pure-function service that derives `NodeElementMask` from
`(preset, overrides)`. No consumers wired yet.

**Files:**
- Create: `src/services/serviceNodeElementVisibility.ts`
- Test: `test/unit/services/serviceNodeElementVisibility.test.ts`

## Steps

- [ ] **Step 1: Write failing test for mask invariants**

Create `test/unit/services/serviceNodeElementVisibility.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import {
  baseMaskFromPreset,
  computeNodeElementMask,
  mergeOverrides,
} from '../../../src/services/serviceNodeElementVisibility';
import type { NodeElementOverrides } from '../../../src/types/typeViewHost';
import type { ThemePreset } from '../../../src/types/typeThemePreset';

function makePreset(args: {
  lockNodeElementVisibility: boolean;
  media?: boolean;
  ops?: boolean;
  warnings?: boolean;
}): ThemePreset {
  return {
    source: 'built-in',
    id: 'test',
    displayName: 'test',
    useNativeDom: false,
    chrome: { popupBgOpacity: 1, popupBackdropBlur: '0px', popupBgTint: 0 },
    density: { rowHeight: '26px', rowPaddingY: '2px', iconSize: '16px' },
    dock: { visible: true, presentation: 'bar' },
    tabs: { visible: true, presentation: 'top-tabs', kind: 'workspace' },
    toolbar: { buttons: 'core' },
    viewModes: ['tree'],
    nodeElements: {
      icon: true, label: true, detail: true,
      media: args.media ?? false,
      badges: {
        ops: args.ops ?? true,
        filters: true,
        warnings: args.warnings ?? true,
        inherited: true,
        counts: true,
      },
      actions: true,
    },
    lockNodeElementVisibility: args.lockNodeElementVisibility,
  } as ThemePreset;
}

describe('serviceNodeElementVisibility — invariants', () => {
  it('baseMaskFromPreset returns a fresh mask reflecting preset.nodeElements', () => {
    const preset = makePreset({ lockNodeElementVisibility: false, media: false });
    const mask = baseMaskFromPreset(preset);
    expect(mask.icon).toBe(true);
    expect(mask.label).toBe(true);
    expect(mask.detail).toBe(true);
    expect(mask.media).toBe(false);
    expect(mask.badges.ops).toBe(true);
    expect(mask.badges.warnings).toBe(true);
    expect(mask.actions).toBe(true);
  });

  it('computeNodeElementMask ignores overrides when lockNodeElementVisibility=true', () => {
    const preset = makePreset({ lockNodeElementVisibility: true, media: false });
    const overrides: NodeElementOverrides = { media: true, icon: false };
    const mask = computeNodeElementMask(preset, overrides);
    expect(mask.media).toBe(false);
    expect(mask.icon).toBe(true);
  });

  it('computeNodeElementMask applies overrides when lockNodeElementVisibility=false', () => {
    const preset = makePreset({ lockNodeElementVisibility: false, media: false });
    const mask = computeNodeElementMask(preset, { media: true });
    expect(mask.media).toBe(true);
  });

  it('null overrides equivalent to undefined overrides', () => {
    const preset = makePreset({ lockNodeElementVisibility: false });
    const m1 = computeNodeElementMask(preset, null);
    const m2 = computeNodeElementMask(preset, undefined as unknown as NodeElementOverrides);
    expect(m1).toEqual(m2);
  });

  it('mergeOverrides shallow-merges simple keys', () => {
    const base = baseMaskFromPreset(makePreset({ lockNodeElementVisibility: false }));
    const merged = mergeOverrides(base, { detail: false, actions: false });
    expect(merged.icon).toBe(base.icon);
    expect(merged.detail).toBe(false);
    expect(merged.actions).toBe(false);
  });

  it('mergeOverrides sub-merges badges per key', () => {
    const base = baseMaskFromPreset(makePreset({
      lockNodeElementVisibility: false, ops: true, warnings: true,
    }));
    const merged = mergeOverrides(base, { badges: { warnings: false } });
    expect(merged.badges.warnings).toBe(false);
    expect(merged.badges.ops).toBe(true);
    expect(merged.badges.filters).toBe(true);
    expect(merged.badges.inherited).toBe(true);
    expect(merged.badges.counts).toBe(true);
  });

  it('does not mutate preset.nodeElements', () => {
    const preset = makePreset({ lockNodeElementVisibility: false, ops: true });
    const before = JSON.stringify(preset.nodeElements);
    computeNodeElementMask(preset, { badges: { ops: false } });
    expect(JSON.stringify(preset.nodeElements)).toBe(before);
  });

  it('does not mutate overrides input', () => {
    const preset = makePreset({ lockNodeElementVisibility: false });
    const overrides: NodeElementOverrides = { icon: false, badges: { ops: false } };
    const before = JSON.stringify(overrides);
    computeNodeElementMask(preset, overrides);
    expect(JSON.stringify(overrides)).toBe(before);
  });

  it('determinism: same input yields structurally identical output', () => {
    const preset = makePreset({ lockNodeElementVisibility: false });
    const ov = { media: true } as NodeElementOverrides;
    const m1 = computeNodeElementMask(preset, ov);
    const m2 = computeNodeElementMask(preset, ov);
    expect(m1).toEqual(m2);
  });

  it('returned mask has fresh badges sub-object (not aliased to preset)', () => {
    const preset = makePreset({ lockNodeElementVisibility: false });
    const mask = baseMaskFromPreset(preset);
    expect(mask.badges).not.toBe(preset.nodeElements.badges);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm vitest run test/unit/services/serviceNodeElementVisibility.test.ts
```

Expected: FAIL with "Cannot find module 'serviceNodeElementVisibility'".

- [ ] **Step 3: Implement `src/services/serviceNodeElementVisibility.ts`**

```typescript
import type { ThemePreset } from '../types/typeThemePreset';
import type { NodeElementMask, NodeElementOverrides } from '../types/typeViewHost';

export function baseMaskFromPreset(preset: ThemePreset): NodeElementMask {
  return {
    icon: preset.nodeElements.icon,
    label: preset.nodeElements.label,
    detail: preset.nodeElements.detail,
    media: preset.nodeElements.media,
    badges: { ...preset.nodeElements.badges },
    actions: preset.nodeElements.actions,
  };
}

export function mergeOverrides(base: NodeElementMask, ov: NodeElementOverrides): NodeElementMask {
  return {
    icon: ov.icon ?? base.icon,
    label: ov.label ?? base.label,
    detail: ov.detail ?? base.detail,
    media: ov.media ?? base.media,
    badges: {
      ops: ov.badges?.ops ?? base.badges.ops,
      filters: ov.badges?.filters ?? base.badges.filters,
      warnings: ov.badges?.warnings ?? base.badges.warnings,
      inherited: ov.badges?.inherited ?? base.badges.inherited,
      counts: ov.badges?.counts ?? base.badges.counts,
    },
    actions: ov.actions ?? base.actions,
  };
}

export function computeNodeElementMask(
  preset: ThemePreset,
  overrides: NodeElementOverrides | null | undefined,
): NodeElementMask {
  if (preset.lockNodeElementVisibility) {
    return baseMaskFromPreset(preset);
  }
  return mergeOverrides(baseMaskFromPreset(preset), overrides ?? {});
}
```

- [ ] **Step 4: Run test to verify pass**

Run:

```powershell
pnpm vitest run test/unit/services/serviceNodeElementVisibility.test.ts
```

Expected: PASS — all 10 cases green.

- [ ] **Step 5: Run `pnpm verify`**

Run:

```powershell
pnpm verify
```

Expected: PASS. New file adds 1 unit test file. No consumers depend on it yet.

- [ ] **Step 6: Commit**

```powershell
git add src/services/serviceNodeElementVisibility.ts test/unit/services/serviceNodeElementVisibility.test.ts
git commit -m "feat(0-A): add serviceNodeElementVisibility with NodeElementMask

Pure-function service computing per-row visibility mask from
(preset.nodeElements, preset.lockNodeElementVisibility,
btnNodeElementsVisibility overrides). Enforces media-always-off when
preset locks visibility, supports partial overrides with shallow + badge
sub-merge, never mutates inputs. No consumers wired yet."
```

## Verification gates

- 10 new unit tests pass.
- Pure functions: no closures, no service deps, no state. Each function
  deterministic for same input.
- `pnpm verify` baseline preserved.

## Rollback

`git revert <commit>` cleanly removes the additions.
