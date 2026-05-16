---
title: Phase 3 — Service core
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B plan]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/plan
  - explorer/theme
---

# Phase 3 — Service Core

Four tasks expand `ThemeService` with preset state, derived reads,
writes, and hydrate handling. Each task adds one logical chunk; runtime
`<style>` injection lands in Phase 4.

## Task 5 — Add preset registry state + `activePreset` + `availablePresets` getters

**Files:**
- Modify: `src/services/serviceTheme.svelte.ts`
- Modify: `test/unit/services/serviceThemeRunes.test.ts`

- [ ] **Step 1: Append failing tests**

Append to `test/unit/services/serviceThemeRunes.test.ts`:

```typescript
import {
  PRESET_NATIVE,
  PRESET_VAULTMAN,
} from '../../../src/config/themePresetsBuiltin';

describe('ThemeService preset registry — state + activePreset', () => {
  it('defaults activePresetId to "vaultman"', () => {
    const svc = new ThemeService();
    expect(svc.activePresetId).toBe('vaultman');
  });

  it('activePreset returns PRESET_VAULTMAN by default', () => {
    const svc = new ThemeService();
    expect(svc.activePreset).toBe(PRESET_VAULTMAN);
  });

  it('activePreset returns PRESET_NATIVE when activePresetId is "native"', () => {
    const svc = new ThemeService();
    svc.activePresetId = 'native';
    expect(svc.activePreset).toBe(PRESET_NATIVE);
  });

  it('activePreset falls back to PRESET_VAULTMAN for unknown id', () => {
    const svc = new ThemeService();
    svc.activePresetId = 'nonexistent';
    expect(svc.activePreset).toBe(PRESET_VAULTMAN);
  });

  it('availablePresets starts with just the two built-ins', () => {
    const svc = new ThemeService();
    expect(svc.availablePresets.map(p => p.id)).toEqual(['native', 'vaultman']);
  });

  it('customPresets defaults to empty', () => {
    const svc = new ThemeService();
    expect(svc.customPresets).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceThemeRunes.test.ts`
Expected: FAIL — `activePresetId`, `activePreset`, `availablePresets`,
`customPresets` undefined on ThemeService.

- [ ] **Step 3: Modify `src/services/serviceTheme.svelte.ts`**

Replace the full file contents with:

```typescript
import type {
  ElasticUiSettings,
  VaultmanUiMode,
  VaultmanUiIdentity,
} from '../types/typeElasticUi';
import type {
  ThemePreset,
  ThemePresetId,
} from '../types/typeThemePreset';
import {
  PRESET_NATIVE,
  PRESET_VAULTMAN,
  BUILT_IN_PRESETS,
} from '../config/themePresetsBuiltin';

export class ThemeService {
  // Preset registry state — NEW in 0-B
  activePresetId = $state<ThemePresetId>('vaultman');
  customPresets = $state<readonly ThemePreset[]>([]);

  // Orthogonal legacy axes — preserved.
  mode = $state<VaultmanUiMode>('thin');
  identity = $state<VaultmanUiIdentity>('native');
  faintModeEnabled = $state(false);
  reducedMotion = $state(false);
  windowFocused = $state(true);
  foulDetection = $state(false);

  // Derived reads — NEW in 0-B
  get activePreset(): ThemePreset {
    if (this.activePresetId === 'native') return PRESET_NATIVE;
    if (this.activePresetId === 'vaultman') return PRESET_VAULTMAN;
    const custom = this.customPresets.find(p => p.id === this.activePresetId);
    return custom ?? PRESET_VAULTMAN;
  }

  get availablePresets(): readonly ThemePreset[] {
    return [...BUILT_IN_PRESETS, ...this.customPresets];
  }

  // Existing derived reads — PRESERVED.
  get faintActive(): boolean {
    return this.faintModeEnabled && !this.windowFocused;
  }

  get useUtilities(): boolean {
    return this.mode !== 'thin';
  }

  // NOTE: useNativeDom and rootClasses getters change in T6.
  // For now, keep the current behavior to avoid breaking
  // existing tests in this same task.
  get useNativeDom(): boolean {
    return this.mode === 'thin' || this.identity === 'native';
  }

  get rootClasses(): string[] {
    const out = ['vm-root', `vm-mode-${this.mode}`, `vm-id-${this.identity}`];
    if (this.faintActive) out.push('vm-faint');
    if (this.reducedMotion) out.push('vm-reduced-motion');
    if (this.foulDetection) out.push('vm-foul-detect');
    return out;
  }

  hydrate(settings: ElasticUiSettings): void {
    this.mode = settings.mode;
    this.identity = settings.identity;
    this.faintModeEnabled = settings.faintModeEnabled;
    this.reducedMotion = settings.reducedMotion;
    this.foulDetection = settings.foulDetection;
    // NOTE: themePresetId + customPresets hydration lands in T8.
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceThemeRunes.test.ts`
Expected: PASS — new tests green, existing tests still green.

- [ ] **Step 5: `pnpm check`**

Run: `pnpm check`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/serviceTheme.svelte.ts test/unit/services/serviceThemeRunes.test.ts
git commit -m "$(cat <<'EOF'
feat(0-b): add ThemeService preset registry state

Introduces activePresetId, customPresets runes state plus activePreset
and availablePresets derived getters. Built-in presets resolve in O(1)
without scanning the registry; customs scan only when active id is not
a built-in. Unknown ids fall back to PRESET_VAULTMAN.

useNativeDom, rootClasses, and hydrate still use the legacy formulas;
they change in T6 and T8.
EOF
)"
```

## Task 6 — `useNativeDom` derived from preset + `rootClasses` includes encoded theme class

**Files:**
- Modify: `src/services/serviceTheme.svelte.ts`
- Modify: `test/unit/services/serviceThemeRunes.test.ts`

- [ ] **Step 1: Append failing tests**

Append to `test/unit/services/serviceThemeRunes.test.ts`:

```typescript
describe('ThemeService useNativeDom + rootClasses derive from preset', () => {
  it('useNativeDom is false for vaultman preset (default)', () => {
    const svc = new ThemeService();
    expect(svc.useNativeDom).toBe(false);
  });

  it('useNativeDom is true for native preset', () => {
    const svc = new ThemeService();
    svc.activePresetId = 'native';
    expect(svc.useNativeDom).toBe(true);
  });

  it('rootClasses contains exactly one vm-theme-{id}', () => {
    const svc = new ThemeService();
    expect(svc.rootClasses).toContain('vm-theme-vaultman');
    expect(svc.rootClasses).not.toContain('vm-theme-native');
    svc.activePresetId = 'native';
    expect(svc.rootClasses).toContain('vm-theme-native');
    expect(svc.rootClasses).not.toContain('vm-theme-vaultman');
  });

  it('rootClasses encodes special characters in custom preset id', () => {
    const svc = new ThemeService();
    // Direct mutation to test the getter — register API lands in T7.
    svc.customPresets = [
      {
        source: 'custom',
        id: 'Native + dock',
        displayName: 'Native + dock',
        useNativeDom: true,
        chrome: { popupBgOpacity: 1, popupBackdropBlur: '0px', popupBgTint: 0 },
        density: { rowHeight: '26px', rowPaddingY: '2px', iconSize: '14px' },
        dock: { visible: true, presentation: 'drawer' },
        tabs: { visible: false, presentation: 'hidden', kind: 'workspace' },
        toolbar: { buttons: 'core' },
        viewModes: ['tree'],
        nodeElements: {
          icon: true, label: true, detail: false, media: false,
          badges: { ops: false, filters: false, warnings: true, inherited: false, counts: false },
          actions: false,
        },
        lockNodeElementVisibility: false,
      },
    ];
    svc.activePresetId = 'Native + dock';
    expect(svc.rootClasses).toContain('vm-theme-Native---dock');
    expect(svc.rootClasses).not.toContain('vm-theme-Native + dock');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceThemeRunes.test.ts`
Expected: FAIL — `useNativeDom` returns wrong value, `rootClasses`
missing `vm-theme-*` element.

- [ ] **Step 3: Replace `useNativeDom` and `rootClasses` getters and add `#cssEscape`**

In `src/services/serviceTheme.svelte.ts`, replace the existing
`useNativeDom` and `rootClasses` getters and add the private helper:

```typescript
  get useNativeDom(): boolean {
    return this.activePreset.useNativeDom;
  }

  get rootClasses(): string[] {
    const out = [
      'vm-root',
      `vm-mode-${this.mode}`,
      `vm-id-${this.identity}`,
      `vm-theme-${this.#cssEscape(this.activePresetId)}`,
    ];
    if (this.faintActive) out.push('vm-faint');
    if (this.reducedMotion) out.push('vm-reduced-motion');
    if (this.foulDetection) out.push('vm-foul-detect');
    return out;
  }

  #cssEscape(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '-');
  }
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceThemeRunes.test.ts`
Expected: PASS — including legacy tests of `useUtilities`, `faintActive`,
mode/identity-driven `rootClasses` checks (the latter must already
include the new vm-theme element).

If a legacy test fails because it asserted the exact length of
`rootClasses` or absence of a `vm-theme-*` element, update it: those
tests asserted pre-0-B behavior that the spec is intentionally changing.
Note this in the commit message.

- [ ] **Step 5: `pnpm check`**

Run: `pnpm check`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/serviceTheme.svelte.ts test/unit/services/serviceThemeRunes.test.ts
git commit -m "$(cat <<'EOF'
feat(0-b): derive useNativeDom + rootClasses from active preset

useNativeDom now reads from activePreset.useNativeDom directly. The
fresh-install default (themePresetId='vaultman') makes useNativeDom
false — intentional behavior change documented in spec Sec 9 R7.

rootClasses now includes 'vm-theme-{id}' where id is css-escaped via
the new #cssEscape helper. Built-in ids ('native', 'vaultman') pass
through unchanged; custom ids with special characters get
non-alphanumeric chars replaced with dashes so the class matches the
selector emitted by #syncCustomStyles (T9).
EOF
)"
```

## Task 7 — Write methods: `setPreset`, `registerCustomPreset`, `unregisterCustomPreset`, `updateCustomPreset`

**Files:**
- Modify: `src/services/serviceTheme.svelte.ts`
- Modify: `test/unit/services/serviceThemeRunes.test.ts`

- [ ] **Step 1: Append failing tests**

Append to `test/unit/services/serviceThemeRunes.test.ts`:

```typescript
import type { ThemePreset } from '../../../src/types/typeThemePreset';

function makeCustom(id: string, overrides: Partial<ThemePreset> = {}): ThemePreset {
  return {
    source: 'custom',
    id,
    displayName: id,
    useNativeDom: false,
    chrome: { popupBgOpacity: 0.5, popupBackdropBlur: '2px', popupBgTint: 0 },
    density: { rowHeight: '30px', rowPaddingY: '3px', iconSize: '15px' },
    dock: { visible: true, presentation: 'bar' },
    tabs: { visible: true, presentation: 'top-tabs', kind: 'embedded' },
    toolbar: { buttons: 'full' },
    viewModes: ['tree', 'list'],
    nodeElements: {
      icon: true, label: true, detail: true, media: false,
      badges: { ops: true, filters: false, warnings: true, inherited: false, counts: false },
      actions: true,
    },
    lockNodeElementVisibility: false,
    ...overrides,
  };
}

describe('ThemeService writes', () => {
  it('setPreset(unknownId) falls back to "native"', () => {
    const svc = new ThemeService();
    svc.setPreset('nonexistent-id');
    expect(svc.activePresetId).toBe('native');
  });

  it('setPreset("native") and setPreset("vaultman") accept built-in ids', () => {
    const svc = new ThemeService();
    svc.setPreset('native');
    expect(svc.activePresetId).toBe('native');
    svc.setPreset('vaultman');
    expect(svc.activePresetId).toBe('vaultman');
  });

  it('setPreset accepts a registered custom id', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustom('mine'));
    svc.setPreset('mine');
    expect(svc.activePresetId).toBe('mine');
  });

  it('registerCustomPreset rejects source="built-in"', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset({ ...PRESET_NATIVE } as ThemePreset);
    expect(svc.customPresets).toHaveLength(0);
  });

  it('registerCustomPreset rejects built-in id collisions', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustom('native'));
    svc.registerCustomPreset(makeCustom('vaultman'));
    expect(svc.customPresets).toHaveLength(0);
  });

  it('registerCustomPreset replaces existing on id collision', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustom('mine', { displayName: 'First' }));
    svc.registerCustomPreset(makeCustom('mine', { displayName: 'Second' }));
    expect(svc.customPresets).toHaveLength(1);
    expect(svc.customPresets[0].displayName).toBe('Second');
  });

  it('unregisterCustomPreset removes by id', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustom('mine'));
    svc.unregisterCustomPreset('mine');
    expect(svc.customPresets).toHaveLength(0);
  });

  it('unregisterCustomPreset falls back to native when removing active', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustom('mine'));
    svc.setPreset('mine');
    svc.unregisterCustomPreset('mine');
    expect(svc.activePresetId).toBe('native');
  });

  it('updateCustomPreset patches displayName preserving id and source', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustom('mine', { displayName: 'Old' }));
    svc.updateCustomPreset('mine', { displayName: 'New' });
    expect(svc.customPresets[0].displayName).toBe('New');
    expect(svc.customPresets[0].id).toBe('mine');
    expect(svc.customPresets[0].source).toBe('custom');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceThemeRunes.test.ts`
Expected: FAIL — `setPreset`/`registerCustomPreset`/`unregisterCustomPreset`/
`updateCustomPreset` undefined.

- [ ] **Step 3: Add write methods to `src/services/serviceTheme.svelte.ts`**

Inside the `ThemeService` class, add (above `hydrate`):

```typescript
  setPreset(id: ThemePresetId): void {
    if (!this.availablePresets.some(p => p.id === id)) {
      this.activePresetId = 'native';
      return;
    }
    this.activePresetId = id;
  }

  registerCustomPreset(preset: ThemePreset): void {
    if (preset.source !== 'custom') return;
    if (preset.id === 'native' || preset.id === 'vaultman') return;
    const next = this.customPresets.filter(p => p.id !== preset.id);
    this.customPresets = [...next, preset];
  }

  unregisterCustomPreset(id: ThemePresetId): void {
    const before = this.customPresets.length;
    this.customPresets = this.customPresets.filter(p => p.id !== id);
    if (this.customPresets.length === before) return;
    if (this.activePresetId === id) this.activePresetId = 'native';
  }

  updateCustomPreset(
    id: ThemePresetId,
    partial: Partial<ThemePreset>,
  ): void {
    this.customPresets = this.customPresets.map(p =>
      p.id === id
        ? { ...p, ...partial, source: 'custom' as const, id }
        : p,
    );
  }
```

Also import `PRESET_NATIVE` in the test file if not already (already
imported in T5 step 1).

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceThemeRunes.test.ts`
Expected: PASS — all new tests green.

- [ ] **Step 5: `pnpm check`**

Run: `pnpm check`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/serviceTheme.svelte.ts test/unit/services/serviceThemeRunes.test.ts
git commit -m "$(cat <<'EOF'
feat(0-b): add ThemeService write methods

Adds setPreset (validates against availablePresets, falls back to
'native'), registerCustomPreset (rejects built-in source, rejects
built-in id collisions, replaces same-id customs), unregisterCustomPreset
(falls back to 'native' if removing active), updateCustomPreset
(patch preserves id + source='custom').

#syncCustomStyles call sites are placeholders — runtime <style>
injection lands in T9.
EOF
)"
```

## Task 8 — `hydrate` reads `themePresetId` + `customPresets`

**Files:**
- Modify: `src/services/serviceTheme.svelte.ts`
- Modify: `test/unit/services/serviceThemeRunes.test.ts`

- [ ] **Step 1: Append failing tests**

```typescript
import { DEFAULT_ELASTIC_UI_SETTINGS } from '../../../src/types/typeElasticUi';

describe('ThemeService.hydrate', () => {
  it('reads themePresetId from settings', () => {
    const svc = new ThemeService();
    svc.hydrate({ ...DEFAULT_ELASTIC_UI_SETTINGS, themePresetId: 'native' });
    expect(svc.activePresetId).toBe('native');
  });

  it('reads customPresets from settings', () => {
    const svc = new ThemeService();
    svc.hydrate({
      ...DEFAULT_ELASTIC_UI_SETTINGS,
      themePresetId: 'vaultman',
      customPresets: [makeCustom('c1')],
    });
    expect(svc.customPresets).toHaveLength(1);
    expect(svc.customPresets[0].id).toBe('c1');
  });

  it('hydrate falls back to "vaultman" when themePresetId missing', () => {
    const svc = new ThemeService();
    const settings = { ...DEFAULT_ELASTIC_UI_SETTINGS };
    delete (settings as Partial<typeof settings>).themePresetId;
    svc.hydrate(settings as typeof DEFAULT_ELASTIC_UI_SETTINGS);
    expect(svc.activePresetId).toBe('vaultman');
  });

  it('hydrate filters invalid customPresets', () => {
    const svc = new ThemeService();
    svc.hydrate({
      ...DEFAULT_ELASTIC_UI_SETTINGS,
      themePresetId: 'vaultman',
      customPresets: [
        makeCustom('good'),
        { source: 'built-in', id: 'fake' } as unknown as ThemePreset,
        null as unknown as ThemePreset,
      ],
    });
    expect(svc.customPresets).toHaveLength(1);
    expect(svc.customPresets[0].id).toBe('good');
  });
});
```

Note: the "filters invalid customPresets" test relies on hydrate
calling `normalizeCustomPreset` over each entry. Confirmed in next
step.

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceThemeRunes.test.ts`
Expected: FAIL — themePresetId/customPresets not read by hydrate.

- [ ] **Step 3: Update `hydrate` in `src/services/serviceTheme.svelte.ts`**

Replace existing `hydrate`:

```typescript
  hydrate(settings: ElasticUiSettings): void {
    this.mode = settings.mode;
    this.identity = settings.identity;
    this.faintModeEnabled = settings.faintModeEnabled;
    this.reducedMotion = settings.reducedMotion;
    this.foulDetection = settings.foulDetection;

    this.activePresetId = settings.themePresetId ?? 'vaultman';
    this.customPresets = (settings.customPresets ?? [])
      .map(p => normalizeCustomPreset(p))
      .filter((p): p is ThemePreset => p !== null);
  }
```

Add the import at the top of the file:

```typescript
import { normalizeCustomPreset } from '../types/typeThemePreset';
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceThemeRunes.test.ts`
Expected: PASS — all hydrate tests green; existing tests still green.

- [ ] **Step 5: `pnpm check`**

Run: `pnpm check`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/serviceTheme.svelte.ts test/unit/services/serviceThemeRunes.test.ts
git commit -m "$(cat <<'EOF'
feat(0-b): hydrate themePresetId + customPresets in ThemeService

hydrate(settings) now reads the two new ElasticUiSettings fields and
re-normalizes customPresets via normalizeCustomPreset to defend against
malformed data.json entries. Missing themePresetId falls back to
'vaultman'. Invalid customPresets entries are silently dropped.

#syncCustomStyles call still pending — lands in T9.
EOF
)"
```

When Phase 3 is complete, proceed to
[[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-4-runtime-injection|Phase 4]].
