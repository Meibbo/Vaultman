---
title: Testing strategy
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B serviceTheme + token layer]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - explorer/theme
---

# Testing Strategy

## Existing tests — action per file

| File | Action 0-B |
|---|---|
| `test/unit/services/serviceTheme.test.ts` | DELETED. Tests `applyVaultmanTheme`, `normalizeLayoutTheme`, `LAYOUT_THEME_OPTIONS` — all deleted in 0-B. |
| `test/unit/services/serviceThemeRunes.test.ts` | EXPANDED. Existing tests for mode/identity/faintActive/useUtilities/rootClasses-without-theme-class are preserved. New tests for preset registry, `activePreset`, `useNativeDom`-derived-from-preset, `rootClasses` with `vm-theme-{id}`, hydrate with new fields. |
| `test/component/settingsUI.test.ts` | MODIFIED. Remove `updateGlassBlur` mock and tests that exercise the deleted slider/dropdown UI. |

Other existing tests that import `themeService` indirectly (e.g., `reactiveExplorers.test.ts`, `panelExplorerSelection.test.ts`, `overlayViewMenu.test.ts`) should be byte-identical: they only consume `themeService.useNativeDom` / `themeService.rootClasses` getter contracts which preserve their signatures.

## New unit test — `test/unit/types/typeThemePreset.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import {
  isBuiltInPreset,
  normalizeCustomPreset,
  type ThemePreset,
} from '../../../src/types/typeThemePreset';
import {
  PRESET_NATIVE,
  PRESET_VAULTMAN,
} from '../../../src/config/themePresetsBuiltin';

describe('typeThemePreset', () => {
  describe('isBuiltInPreset', () => {
    it('returns true for PRESET_NATIVE and PRESET_VAULTMAN', () => {
      expect(isBuiltInPreset(PRESET_NATIVE)).toBe(true);
      expect(isBuiltInPreset(PRESET_VAULTMAN)).toBe(true);
    });

    it('returns false for a synthetic custom preset', () => {
      const custom: ThemePreset = { ...PRESET_NATIVE, source: 'custom', id: 'x' };
      expect(isBuiltInPreset(custom)).toBe(false);
    });
  });

  describe('normalizeCustomPreset', () => {
    it('rejects non-object inputs', () => {
      expect(normalizeCustomPreset(null)).toBeNull();
      expect(normalizeCustomPreset(undefined)).toBeNull();
      expect(normalizeCustomPreset('string')).toBeNull();
      expect(normalizeCustomPreset(42)).toBeNull();
      expect(normalizeCustomPreset([])).toBeNull();
    });

    it('rejects source !== "custom"', () => {
      const raw = { ...PRESET_NATIVE };
      expect(normalizeCustomPreset(raw)).toBeNull();
    });

    it('rejects built-in id collisions', () => {
      const raw = makeMinimalCustomRaw({ id: 'native' });
      expect(normalizeCustomPreset(raw)).toBeNull();
      const raw2 = makeMinimalCustomRaw({ id: 'vaultman' });
      expect(normalizeCustomPreset(raw2)).toBeNull();
    });

    it('accepts a minimal valid custom shape', () => {
      const raw = makeMinimalCustomRaw({ id: 'my-preset' });
      const result = normalizeCustomPreset(raw);
      expect(result).not.toBeNull();
      expect(result?.source).toBe('custom');
      expect(result?.id).toBe('my-preset');
    });

    it('forces nodeElements.media to false even if raw says true', () => {
      const raw = makeMinimalCustomRaw({
        id: 'x',
        nodeElements: { ...defaultNodeElements, media: true },
      });
      const result = normalizeCustomPreset(raw);
      expect(result?.nodeElements.media).toBe(false);
    });

    it('strips "markmap" from viewModes', () => {
      const raw = makeMinimalCustomRaw({
        id: 'x',
        viewModes: ['tree', 'markmap', 'list'],
      });
      const result = normalizeCustomPreset(raw);
      expect(result?.viewModes).toEqual(['tree', 'list']);
    });

    it('passes through valid `extends` id (informational only)', () => {
      const raw = makeMinimalCustomRaw({ id: 'x', extends: 'native' });
      const result = normalizeCustomPreset(raw);
      expect(result?.extends).toBe('native');
    });

    it('ignores invalid `extends` types', () => {
      const raw = makeMinimalCustomRaw({ id: 'x', extends: 42 as unknown as string });
      const result = normalizeCustomPreset(raw);
      expect(result?.extends).toBeUndefined();
    });

    it('preserves optional future fields when provided as valid types', () => {
      const raw = makeMinimalCustomRaw({
        id: 'x',
        unload: ['file-explorer', 'tag-pane'],
        workspaceId: 'My Workspace',
      });
      const result = normalizeCustomPreset(raw);
      expect(result?.unload).toEqual(['file-explorer', 'tag-pane']);
      expect(result?.workspaceId).toBe('My Workspace');
    });
  });
});

// Helper kept in test file or shared fixture.
function makeMinimalCustomRaw(overrides: Partial<ThemePreset>): unknown {
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
    nodeElements: defaultNodeElements,
    lockNodeElementVisibility: false,
    ...overrides,
  };
}

const defaultNodeElements = {
  icon: true,
  label: true,
  detail: true,
  media: false,
  badges: { ops: true, filters: true, warnings: true, inherited: true, counts: true },
  actions: true,
};
```

## New unit test — `test/unit/config/themePresetsBuiltin.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
import {
  PRESET_NATIVE,
  PRESET_VAULTMAN,
  BUILT_IN_PRESETS,
} from '../../../src/config/themePresetsBuiltin';

describe('built-in theme presets', () => {
  describe('PRESET_NATIVE invariants', () => {
    it('source is built-in, id is "native"', () => {
      expect(PRESET_NATIVE.source).toBe('built-in');
      expect(PRESET_NATIVE.id).toBe('native');
    });

    it('chameleon flags match disguise intent', () => {
      expect(PRESET_NATIVE.useNativeDom).toBe(true);
      expect(PRESET_NATIVE.lockNodeElementVisibility).toBe(true);
      expect(PRESET_NATIVE.viewModes).toEqual(['tree']);
      expect(PRESET_NATIVE.dock.visible).toBe(false);
      expect(PRESET_NATIVE.tabs.visible).toBe(false);
      expect(PRESET_NATIVE.toolbar.buttons).toBe('core');
    });

    it('nodeElements match core File Explorer feature set', () => {
      expect(PRESET_NATIVE.nodeElements.media).toBe(false);
      expect(PRESET_NATIVE.nodeElements.detail).toBe(false);
      expect(PRESET_NATIVE.nodeElements.actions).toBe(false);
      expect(PRESET_NATIVE.nodeElements.badges.warnings).toBe(true);
    });
  });

  describe('PRESET_VAULTMAN invariants', () => {
    it('source is built-in, id is "vaultman"', () => {
      expect(PRESET_VAULTMAN.source).toBe('built-in');
      expect(PRESET_VAULTMAN.id).toBe('vaultman');
    });

    it('full plugin flags match vm experience', () => {
      expect(PRESET_VAULTMAN.useNativeDom).toBe(false);
      expect(PRESET_VAULTMAN.lockNodeElementVisibility).toBe(false);
      expect(PRESET_VAULTMAN.viewModes).toEqual(['tree', 'table', 'grid', 'cards', 'list']);
      expect(PRESET_VAULTMAN.viewModes).not.toContain('markmap');
      expect(PRESET_VAULTMAN.dock.visible).toBe(true);
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
    it('all chrome.popupBgOpacity values are in [0..1]', () => {
      for (const p of BUILT_IN_PRESETS) {
        expect(p.chrome.popupBgOpacity).toBeGreaterThanOrEqual(0);
        expect(p.chrome.popupBgOpacity).toBeLessThanOrEqual(1);
      }
    });

    it('all density values are valid CSS lengths', () => {
      const lengthRe = /^\d+(\.\d+)?(px|em|rem|%)$/;
      for (const p of BUILT_IN_PRESETS) {
        expect(p.density.rowHeight).toMatch(lengthRe);
        expect(p.density.rowPaddingY).toMatch(lengthRe);
        expect(p.density.iconSize).toMatch(lengthRe);
      }
    });

    it('all chrome.popupBackdropBlur values are valid CSS lengths', () => {
      const lengthRe = /^\d+(\.\d+)?(px|em|rem|%)$|^0$/;
      for (const p of BUILT_IN_PRESETS) {
        expect(p.chrome.popupBackdropBlur).toMatch(lengthRe);
      }
    });

    it('native rowHeight is less than vaultman rowHeight (compactness order)', () => {
      const nativeRowH = parseInt(PRESET_NATIVE.density.rowHeight, 10);
      const vmRowH = parseInt(PRESET_VAULTMAN.density.rowHeight, 10);
      expect(nativeRowH).toBeLessThan(vmRowH);
    });
  });
});
```

## Expanded unit test — `serviceThemeRunes.test.ts` (new test cases)

Preserve all existing tests. Add the following new describes:

```typescript
import { PRESET_NATIVE, PRESET_VAULTMAN } from '../../../src/config/themePresetsBuiltin';
import { DEFAULT_ELASTIC_UI_SETTINGS } from '../../../src/types/typeElasticUi';

describe('ThemeService preset registry', () => {
  it('defaults activePresetId to "vaultman" and activePreset returns PRESET_VAULTMAN', () => {
    const svc = new ThemeService();
    expect(svc.activePresetId).toBe('vaultman');
    expect(svc.activePreset).toBe(PRESET_VAULTMAN);
  });

  it('useNativeDom derives from activePreset.useNativeDom', () => {
    const svc = new ThemeService();
    svc.setPreset('native');
    expect(svc.useNativeDom).toBe(true);
    svc.setPreset('vaultman');
    expect(svc.useNativeDom).toBe(false);
  });

  it('rootClasses contains exactly one vm-theme-{id}', () => {
    const svc = new ThemeService();
    svc.setPreset('vaultman');
    expect(svc.rootClasses).toContain('vm-theme-vaultman');
    expect(svc.rootClasses).not.toContain('vm-theme-native');
    svc.setPreset('native');
    expect(svc.rootClasses).toContain('vm-theme-native');
    expect(svc.rootClasses).not.toContain('vm-theme-vaultman');
  });

  it('setPreset(unknownId) falls back to "native"', () => {
    const svc = new ThemeService();
    svc.setPreset('nonexistent-id');
    expect(svc.activePresetId).toBe('native');
  });

  it('availablePresets is built-ins + customs', () => {
    const svc = new ThemeService();
    expect(svc.availablePresets.map(p => p.id)).toEqual(['native', 'vaultman']);
    svc.registerCustomPreset(makeCustom('my-preset'));
    expect(svc.availablePresets.map(p => p.id)).toEqual(['native', 'vaultman', 'my-preset']);
  });

  it('registerCustomPreset rejects source="built-in"', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset({ ...PRESET_NATIVE } as any);
    expect(svc.customPresets).toHaveLength(0);
  });

  it('registerCustomPreset rejects ids that collide with built-ins', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustom('native'));
    svc.registerCustomPreset(makeCustom('vaultman'));
    expect(svc.customPresets).toHaveLength(0);
  });

  it('registerCustomPreset replaces existing on id collision (custom-to-custom)', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustom('mine', { displayName: 'First' }));
    svc.registerCustomPreset(makeCustom('mine', { displayName: 'Second' }));
    expect(svc.customPresets).toHaveLength(1);
    expect(svc.customPresets[0].displayName).toBe('Second');
  });

  it('unregisterCustomPreset removes and falls back to native if active', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustom('mine'));
    svc.setPreset('mine');
    svc.unregisterCustomPreset('mine');
    expect(svc.activePresetId).toBe('native');
    expect(svc.customPresets).toHaveLength(0);
  });

  it('updateCustomPreset patches a field without changing id/source', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustom('mine', { displayName: 'Old' }));
    svc.updateCustomPreset('mine', { displayName: 'New' });
    expect(svc.customPresets[0].displayName).toBe('New');
    expect(svc.customPresets[0].id).toBe('mine');
    expect(svc.customPresets[0].source).toBe('custom');
  });

  it('hydrate reads themePresetId and customPresets from settings', () => {
    const svc = new ThemeService();
    svc.hydrate({
      ...DEFAULT_ELASTIC_UI_SETTINGS,
      themePresetId: 'native',
      customPresets: [makeCustom('c1')],
    });
    expect(svc.activePresetId).toBe('native');
    expect(svc.customPresets).toHaveLength(1);
  });

  it('hydrate filters invalid customPresets entries', () => {
    const svc = new ThemeService();
    svc.hydrate({
      ...DEFAULT_ELASTIC_UI_SETTINGS,
      themePresetId: 'vaultman',
      customPresets: [
        makeCustom('valid'),
        { source: 'built-in', id: 'should-reject' } as any,
        null as any,
        { id: 'incomplete' } as any,
      ],
    });
    expect(svc.customPresets).toHaveLength(1);
    expect(svc.customPresets[0].id).toBe('valid');
  });

  it('rootClasses encodes custom id via css-safe transform', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustom('Native + dock'));
    svc.setPreset('Native + dock');
    // The css-safe class is encoded ('+' and spaces become dashes).
    // setPreset stores the raw id; rootClasses emits encoded via cascade.
    // (Acceptable: ThemeService stores raw id; the SCSS block uses encoded.)
    expect(svc.rootClasses).toContain('vm-theme-Native + dock');
    // Note: validate this against the implementation choice. If we encode
    // in rootClasses too, change to: .toContain('vm-theme-Native---dock')
  });
});

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
```

NOTE on the last test: implementation must decide whether `rootClasses` emits raw id or css-safe id. Recommended: emit **raw** in `rootClasses` (no transform) so DOM class matches the SCSS block emitted by `#syncCustomStyles` which uses `#cssEscape`. **Conflict** — fixing:
ensure `rootClasses` also applies `#cssEscape` to the active preset id when composing the class name. Update both paths. Test should assert encoded match.

## New component test — `test/component/themeServiceCustomStyleInjection.test.ts`

```typescript
import { describe, expect, it, afterEach } from 'vitest';
import { ThemeService } from '../../src/services/serviceTheme.svelte';
import { makeCustom } from './fixtures/themePresets';   // shared helper

describe('ThemeService custom style injection', () => {
  afterEach(() => {
    document.querySelectorAll('style[data-vm-theme-presets="custom"]')
      .forEach(el => el.remove());
  });

  it('does not inject <style> when customPresets is empty', () => {
    const svc = new ThemeService();
    expect(
      document.querySelector('style[data-vm-theme-presets="custom"]'),
    ).toBeNull();
  });

  it('injects <style> when first custom preset registered', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustom('c1'));
    const el = document.querySelector(
      'style[data-vm-theme-presets="custom"]',
    );
    expect(el).not.toBeNull();
    expect(el?.textContent).toContain('.vm-theme-c1');
  });

  it('renders one CSS block per custom preset', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustom('c1'));
    svc.registerCustomPreset(makeCustom('c2'));
    const el = document.querySelector(
      'style[data-vm-theme-presets="custom"]',
    );
    expect(el?.textContent).toContain('.vm-theme-c1');
    expect(el?.textContent).toContain('.vm-theme-c2');
  });

  it('removes <style> when last custom unregistered', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustom('c1'));
    svc.unregisterCustomPreset('c1');
    expect(
      document.querySelector('style[data-vm-theme-presets="custom"]'),
    ).toBeNull();
  });

  it('css-escapes special characters in preset id', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustom('has spaces/and:colons'));
    const el = document.querySelector(
      'style[data-vm-theme-presets="custom"]',
    );
    expect(el?.textContent).toContain('.vm-theme-has-spaces-and-colons');
    expect(el?.textContent).not.toContain('has spaces/and:colons');
  });

  it('sanitizes malicious CSS values', () => {
    const svc = new ThemeService();
    const malicious = makeCustom('evil', {
      chrome: {
        popupBgOpacity: 0.5,
        popupBackdropBlur: '}; body { display:none } /*',
        popupBgTint: 0,
      },
    });
    svc.registerCustomPreset(malicious);
    const el = document.querySelector(
      'style[data-vm-theme-presets="custom"]',
    );
    expect(el?.textContent).not.toContain('display:none');
    expect(el?.textContent).toContain('--vm-popup-backdrop-blur: 0');
  });

  it('dispose() removes the injected <style> element', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustom('c1'));
    svc.dispose();
    expect(
      document.querySelector('style[data-vm-theme-presets="custom"]'),
    ).toBeNull();
  });
});
```

## New component test — `test/component/frameVaultmanRootClasses.test.ts`

Lightweight component test that mounts a slim wrapper consuming `themeService.rootClasses`:

```typescript
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { ThemeService } from '../../src/services/serviceTheme.svelte';
import FrameRootHarness from './fixtures/FrameRootHarness.svelte';

describe('frameVaultman root class composition', () => {
  it('renders vm-theme-vaultman on .vm-root by default', () => {
    const themeService = new ThemeService();
    const { container } = render(FrameRootHarness, { themeService });
    const root = container.querySelector('.vm-root');
    expect(root?.classList.contains('vm-theme-vaultman')).toBe(true);
  });

  it('switches to vm-theme-native when preset changes', async () => {
    const themeService = new ThemeService();
    const { container, rerender } = render(FrameRootHarness, { themeService });
    themeService.setPreset('native');
    // tick + assert
    const root = container.querySelector('.vm-root');
    expect(root?.classList.contains('vm-theme-native')).toBe(true);
    expect(root?.classList.contains('vm-theme-vaultman')).toBe(false);
  });
});
```

`FrameRootHarness.svelte` (test fixture):

```svelte
<script lang="ts">
  import type { ThemeService } from '../../../src/services/serviceTheme.svelte';
  let { themeService }: { themeService: ThemeService } = $props();
  const rootClasses = $derived(themeService.rootClasses.join(' '));
</script>

<div class={rootClasses}></div>
```

## Test count summary

| Suite | New file | New tests |
|---|---|---|
| `unit/types/typeThemePreset.test.ts` | ✓ | ~10 |
| `unit/config/themePresetsBuiltin.test.ts` | ✓ | ~10 |
| `unit/services/serviceThemeRunes.test.ts` | (existing, expanded) | ~13 |
| `component/themeServiceCustomStyleInjection.test.ts` | ✓ | ~7 |
| `component/frameVaultmanRootClasses.test.ts` | ✓ | ~3 |

Total: 4 new files, 1 expanded, ~43 new tests.

## Verification gates

### Local gates (pre-merge)

- `pnpm verify` (lint + check + build + unit + component) passes.
- New tests specifically: all green.
- `git grep -n "applyVaultmanTheme"` returns zero matches.
- `git grep -n "vm-glass-blur"` returns zero matches.
- `git grep -n "body\.vm-theme\|body \.vm-theme"` in `src/styles/` returns zero matches.
- `git grep -n "normalizeLayoutTheme\|LAYOUT_THEME_OPTIONS"` returns zero matches.

### Live smoke (recommended, not blocking)

Run in `plugin-dev` via Obsidian CLI:

```javascript
// Verify DOM root carries the active preset class
const root = app.workspace.containerEl.querySelector('.vm-root');
console.log(root.className);
// Expected: includes "vm-theme-vaultman"

// Switch presets via service
window.__vaultman?.themeService?.setPreset('native');
// Tick a frame, then re-check
console.log(root.className);
// Expected: includes "vm-theme-native", does NOT include "vm-theme-vaultman"
```

Visual verification: chrome opacity + density actually change between the two presets.
