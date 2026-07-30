---
title: Phase 4 — Runtime style injection
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B plan]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/plan
  - explorer/theme
---

# Phase 4 — Runtime Style Injection

One task. Add `#syncCustomStyles`, sanitization helpers, and `dispose`.
Wire calls in `register`/`unregister`/`update`/`hydrate`.

## Task 9 — `#syncCustomStyles` + sanitization + `dispose`

**Files:**
- Modify: `src/services/serviceTheme.svelte.ts`
- Create: `test/component/themeServiceCustomStyleInjection.test.ts`
- Create: `test/component/fixtures/themePresetFixtures.ts` (shared helper)

- [ ] **Step 1: Create shared fixture file**

Create `test/component/fixtures/themePresetFixtures.ts`:

```typescript
import type { ThemePreset } from '../../../src/types/typeThemePreset';

export function makeCustomPreset(
  id: string,
  overrides: Partial<ThemePreset> = {},
): ThemePreset {
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

- [ ] **Step 2: Write failing component tests**

Create `test/component/themeServiceCustomStyleInjection.test.ts`:

```typescript
import { describe, expect, it, afterEach } from 'vitest';
import { ThemeService } from '../../src/services/serviceTheme.svelte';
import { makeCustomPreset } from './fixtures/themePresetFixtures';

const SELECTOR = 'style[data-vm-theme-presets="custom"]';

describe('ThemeService runtime <style> injection', () => {
  afterEach(() => {
    document.querySelectorAll(SELECTOR).forEach(el => el.remove());
  });

  it('does not inject when customPresets is empty', () => {
    new ThemeService();
    expect(document.querySelector(SELECTOR)).toBeNull();
  });

  it('injects <style> when first custom registered', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustomPreset('c1'));
    const el = document.querySelector(SELECTOR);
    expect(el).not.toBeNull();
    expect(el?.textContent).toContain('.vm-theme-c1');
  });

  it('renders one block per custom preset', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustomPreset('c1'));
    svc.registerCustomPreset(makeCustomPreset('c2'));
    const el = document.querySelector(SELECTOR);
    expect(el?.textContent).toContain('.vm-theme-c1');
    expect(el?.textContent).toContain('.vm-theme-c2');
  });

  it('removes <style> when last custom unregistered', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustomPreset('c1'));
    svc.unregisterCustomPreset('c1');
    expect(document.querySelector(SELECTOR)).toBeNull();
  });

  it('updates <style> content on updateCustomPreset', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustomPreset('c1', {
      chrome: { popupBgOpacity: 0.5, popupBackdropBlur: '2px', popupBgTint: 0 },
    }));
    svc.updateCustomPreset('c1', {
      chrome: { popupBgOpacity: 0.9, popupBackdropBlur: '6px', popupBgTint: 0 },
    });
    const el = document.querySelector(SELECTOR);
    expect(el?.textContent).toContain('--vm-popup-bg-opacity: 0.9');
    expect(el?.textContent).toContain('--vm-popup-backdrop-blur: 6px');
    expect(el?.textContent).not.toContain('--vm-popup-bg-opacity: 0.5');
  });

  it('css-escapes special characters in preset id', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustomPreset('has spaces/and:colons'));
    const el = document.querySelector(SELECTOR);
    expect(el?.textContent).toContain('.vm-theme-has-spaces-and-colons');
    expect(el?.textContent).not.toContain('has spaces/and:colons');
  });

  it('sanitizes malicious CSS length values', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustomPreset('evil', {
      chrome: {
        popupBgOpacity: 0.5,
        popupBackdropBlur: '}; body { display:none } /*',
        popupBgTint: 0,
      },
    }));
    const el = document.querySelector(SELECTOR);
    expect(el?.textContent).not.toContain('display:none');
    expect(el?.textContent).toContain('--vm-popup-backdrop-blur: 0');
  });

  it('sanitizes out-of-range opacity', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustomPreset('o', {
      chrome: { popupBgOpacity: 999, popupBackdropBlur: '0px', popupBgTint: -5 },
    }));
    const el = document.querySelector(SELECTOR);
    expect(el?.textContent).toContain('--vm-popup-bg-opacity: 1');
    expect(el?.textContent).toContain('--vm-popup-bg-tint: 0');
  });

  it('dispose() removes the injected element', () => {
    const svc = new ThemeService();
    svc.registerCustomPreset(makeCustomPreset('c1'));
    svc.dispose();
    expect(document.querySelector(SELECTOR)).toBeNull();
  });

  it('hydrate triggers #syncCustomStyles', () => {
    const svc = new ThemeService();
    svc.hydrate({
      mode: 'thin',
      identity: 'native',
      faintModeEnabled: false,
      reducedMotion: false,
      foulDetection: false,
      themePresetId: 'vaultman',
      customPresets: [makeCustomPreset('c1')],
    });
    const el = document.querySelector(SELECTOR);
    expect(el).not.toBeNull();
    expect(el?.textContent).toContain('.vm-theme-c1');
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL**

Run: `pnpm exec vitest run --project component --config vitest.config.ts test/component/themeServiceCustomStyleInjection.test.ts --fileParallelism=false` Expected: FAIL — no `<style>` element created, no `dispose()` method.

- [ ] **Step 4: Implement injection + sanitization + dispose**

In `src/services/serviceTheme.svelte.ts`, add the private fields and methods at the bottom of the class (after `hydrate`):

```typescript
  // Runtime style injection — NEW in 0-B

  #styleEl: HTMLStyleElement | null = null;

  dispose(): void {
    this.#styleEl?.remove();
    this.#styleEl = null;
  }

  #syncCustomStyles(): void {
    if (this.customPresets.length === 0) {
      this.#styleEl?.remove();
      this.#styleEl = null;
      return;
    }

    const css = this.customPresets
      .map(p => this.#renderCustomBlock(p))
      .join('\n');

    if (!this.#styleEl) {
      this.#styleEl = document.createElement('style');
      this.#styleEl.dataset.vmThemePresets = 'custom';
      document.head.appendChild(this.#styleEl);
    }
    this.#styleEl.textContent = css;
  }

  #renderCustomBlock(p: ThemePreset): string {
    const safeId = this.#cssEscape(p.id);
    const bgO = this.#sanitizeNumber01(p.chrome.popupBgOpacity);
    const blur = this.#sanitizeCssLength(p.chrome.popupBackdropBlur);
    const tint = this.#sanitizeNumber01(p.chrome.popupBgTint);
    const rowH = this.#sanitizeCssLength(p.density.rowHeight);
    const padY = this.#sanitizeCssLength(p.density.rowPaddingY);
    const iconS = this.#sanitizeCssLength(p.density.iconSize);
    return `.vm-theme-${safeId} {
  --vm-popup-bg-opacity: ${bgO};
  --vm-popup-backdrop-blur: ${blur};
  --vm-popup-bg-tint: ${tint};
  --vm-row-height: ${rowH};
  --vm-row-padding-y: ${padY};
  --vm-icon-size: ${iconS};
}`;
  }

  #sanitizeCssLength(value: string): string {
    return /^-?\d+(\.\d+)?(px|em|rem|%|vh|vw)$|^0$/.test(value) ? value : '0';
  }

  #sanitizeNumber01(value: number): string {
    if (typeof value !== 'number' || !isFinite(value)) return '0';
    if (value < 0) return '0';
    if (value > 1) return '1';
    return String(value);
  }
```

Now wire calls. Modify the existing write methods and `hydrate`:

```typescript
  registerCustomPreset(preset: ThemePreset): void {
    if (preset.source !== 'custom') return;
    if (preset.id === 'native' || preset.id === 'vaultman') return;
    const next = this.customPresets.filter(p => p.id !== preset.id);
    this.customPresets = [...next, preset];
    this.#syncCustomStyles();   // NEW
  }

  unregisterCustomPreset(id: ThemePresetId): void {
    const before = this.customPresets.length;
    this.customPresets = this.customPresets.filter(p => p.id !== id);
    if (this.customPresets.length === before) return;
    if (this.activePresetId === id) this.activePresetId = 'native';
    this.#syncCustomStyles();   // NEW
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
    this.#syncCustomStyles();   // NEW
  }

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

    this.#syncCustomStyles();   // NEW
  }
```

- [ ] **Step 5: Run tests — expect PASS**

Run: `pnpm exec vitest run --project component --config vitest.config.ts test/component/themeServiceCustomStyleInjection.test.ts --fileParallelism=false` Expected: PASS — all 10 tests green.

Also re-run unit tests to verify nothing regressed:

Run: `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceThemeRunes.test.ts test/unit/types/typeThemePreset.test.ts test/unit/config/themePresetsBuiltin.test.ts` Expected: PASS.

- [ ] **Step 6: `pnpm check`**

Run: `pnpm check` Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/services/serviceTheme.svelte.ts \
        test/component/themeServiceCustomStyleInjection.test.ts \
        test/component/fixtures/themePresetFixtures.ts
git commit -m "$(cat <<'EOF'
feat(0-b): inject runtime <style> element for custom theme presets

#syncCustomStyles maintains a single <style data-vm-theme-presets=
"custom"> element in <head>. The element appears when the first custom
preset registers, updates content when customs change, and disappears
when the last unregisters. dispose() removes it on plugin unload.

Each custom block emits the same six tokens as the SCSS built-in
blocks (--vm-popup-bg-opacity, --vm-popup-backdrop-blur,
--vm-popup-bg-tint, --vm-row-height, --vm-row-padding-y,
--vm-icon-size). Values pass through #sanitizeCssLength /
#sanitizeNumber01 before injection — malicious or invalid values
become '0'.

Custom preset ids are css-escaped via #cssEscape so the emitted
selector matches the class composed by ThemeService.rootClasses.

hydrate now also triggers #syncCustomStyles to handle plugin reload
with persisted customs.
EOF
)"
```

When Phase 4 is complete, proceed to [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-5-scss-migration|Phase 5]].
