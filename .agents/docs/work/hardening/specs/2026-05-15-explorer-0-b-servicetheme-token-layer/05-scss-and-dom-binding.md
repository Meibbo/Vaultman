---
title: UnoCSS preset-theme token layer and DOM binding
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B serviceTheme + token layer]]"
created: 2026-05-15T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/spec
  - explorer/theme
  - explorer/unocss
  - explorer/scss
---

# UnoCSS `preset-theme` Token Layer And DOM Binding

## Why `unocss-preset-theme`

The user decided mid-brainstorm to invert the styling-source plan: UnoCSS will become the primary styling source (~90% target) post-0-B via the new Sub-system N (SCSS-to-UnoCSS migration). 0-B anticipates that target state for the small token surface it owns. The decision reverses the earlier "SCSS-only" plan.

Adopting `unocss-preset-theme` now means:

- Built-in theme tokens are declared once, declaratively, in `uno.config.ts`. No hand-maintained SCSS file for theme blocks.
- When Sub-system N migrates the rest of the styles, theme tokens are already in the canonical place. N does not have to touch them.
- UnoCSS will continue to be the build-time source-of-truth for theme CSS-var emission.

Custom presets continue to be runtime-injected by `ThemeService` (a `<style data-vm-theme-presets="custom">` element). Build-time UnoCSS cannot know about user-created presets; runtime injection is mandatory for that path.

## File 1 — `package.json` (MODIFIED)

Add the preset-theme plugin to `devDependencies` (UnoCSS itself is already declared):

```jsonc
{
  "devDependencies": {
    "@unocss/preset-theme": "^66.6.8",   // match installed unocss version
    "@unocss/vite": "^66.6.8",
    "unocss": "^66.6.8"
  }
}
```

Install via `pnpm install` after editing.

## File 2 — `uno.config.ts` (MODIFIED)

Extend the config with `presetTheme`:

```typescript
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetWind3,
} from 'unocss';
import presetTheme from '@unocss/preset-theme';

const VM_THEME_NATIVE = {
  'popup-bg-opacity': '1',
  'popup-backdrop-blur': '0px',
  'popup-bg-tint': '0',
  'row-height': '26px',
  'row-padding-y': '2px',
  'icon-size': '14px',
};

const VM_THEME_VAULTMAN = {
  'popup-bg-opacity': '0.92',
  'popup-backdrop-blur': '4px',
  'popup-bg-tint': '0',
  'row-height': '32px',
  'row-padding-y': '4px',
  'icon-size': '16px',
};

export default defineConfig({
  presets: [
    presetWind3({ preflight: false }),
    presetAttributify(),
    presetIcons({ scale: 1.0, warn: false }),
    presetTheme({
      prefix: '--vm',
      theme: {
        native: VM_THEME_NATIVE,
        vaultman: VM_THEME_VAULTMAN,
      },
      selectors: {
        native: '.vm-theme-native',
        vaultman: '.vm-theme-vaultman',
      },
    }),
  ],
  safelist: [
    // existing safelist preserved
    'vm-root',
    'vm-mode-thin',
    'vm-mode-balanced',
    'vm-mode-thick',
    'vm-id-native',
    'vm-id-bases',
    'vm-id-outline',
    'vm-id-bookmarks',
    'vm-faint',
    'vm-reduced-motion',
    'vm-foul-detect',
    'obsidian-mimic-file',
    'obsidian-mimic-folder',
    'obsidian-mimic-tree-item',
    'obsidian-mimic-property',
    // NEW — ensure theme classes are kept even if not referenced statically
    'vm-theme-native',
    'vm-theme-vaultman',
  ],
  shortcuts: [
    // existing shortcuts preserved verbatim
    ['obsidian-mimic-file-layout', 'flex items-center px-2'],
    ['obsidian-mimic-folder-layout', 'flex items-center'],
    [
      'vm-btn-squircle',
      'inline-flex items-center justify-center rounded-md p-1 hover:bg-[var(--background-modifier-hover)]',
    ],
    [
      'vm-card',
      'rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-2',
    ],
    [
      'vm-btn-primary',
      'inline-flex items-center justify-center rounded-md px-3 py-1 bg-[var(--interactive-accent)] text-[var(--text-on-accent)] hover:bg-[var(--interactive-accent-hover)]',
    ],
  ],
  rules: [],
});
```

**API note.** `@unocss/preset-theme` API may not match this skeleton verbatim across versions. The exact configuration shape — whether `selectors` is the field name, whether `prefix` controls CSS-var prefix, etc. — must be verified against `@unocss/preset-theme` docs during T10 implementation. The contract the spec mandates is:

1. Build output contains exactly two CSS blocks:
   ```css
   .vm-theme-native {
     --vm-popup-bg-opacity: 1;
     --vm-popup-backdrop-blur: 0px;
     --vm-popup-bg-tint: 0;
     --vm-row-height: 26px;
     --vm-row-padding-y: 2px;
     --vm-icon-size: 14px;
   }
   .vm-theme-vaultman {
     --vm-popup-bg-opacity: 0.92;
     --vm-popup-backdrop-blur: 4px;
     --vm-popup-bg-tint: 0;
     --vm-row-height: 32px;
     --vm-row-padding-y: 4px;
     --vm-icon-size: 16px;
   }
   ```
2. The selector class names are exactly `.vm-theme-native` and `.vm-theme-vaultman` so `ThemeService.rootClasses` matches.
3. The CSS variables are prefixed `--vm-*` so existing SCSS consumers work unchanged.

If preset-theme's actual API forces different naming, write a custom UnoCSS rule that emits the same CSS rather than fight the plugin. The spec contract is the CSS output shape, not the plugin's name for configuration keys.

## File 3 — `src/styles/popup/_islands.scss` (MODIFIED)

Same migration as the SCSS-first plan: replace the four legacy theme-name blocks with a single token-driven block.

### Before

```scss
.vm-theme-default,
.vm-theme-native {
  .vm-explorer-popup { ... }
  .vm-squircle { ... }
}

.vm-theme-polish { ... }
.vm-theme-glass {
  .vm-explorer-popup,
  .vm-squircle {
    background: color-mix(in srgb, $vm-bg-secondary 62%, transparent);
    backdrop-filter: blur(var(--vm-glass-blur, 12px));
    -webkit-backdrop-filter: blur(var(--vm-glass-blur, 12px));
  }
}
```

### After

```scss
// Token-driven chrome. Selector targets any .vm-root because the active
// preset's token block (emitted by unocss-preset-theme at build time, or
// runtime-injected for customs) supplies var values.
.vm-root .vm-explorer-popup,
.vm-root .vm-squircle {
  background: color-mix(
    in srgb,
    $vm-bg-secondary
    calc(var(--vm-popup-bg-opacity, 1) * 100%),
    transparent
  );
  border-radius: $vm-radius-m;
  box-shadow: none;
  backdrop-filter: blur(var(--vm-popup-backdrop-blur, 0px));
  -webkit-backdrop-filter: blur(var(--vm-popup-backdrop-blur, 0px));
}
```

Three legacy theme-name selectors deleted. Token values arrive from whichever `.vm-theme-{id}` class is active on `.vm-root`.

## File 4 — `src/styles/explorer/_virtual-list.scss` (MODIFIED)

Find constants for row height, padding-y, icon size; replace with `var()` reads:

```scss
.vm-view-list-row {
  height: var(--vm-row-height, 32px);
  padding: var(--vm-row-padding-y, 4px) 8px;
}

.vm-view-list-row .icon {
  width: var(--vm-icon-size, 16px);
  height: var(--vm-icon-size, 16px);
}
```

## File 5 — `src/styles/explorer/_tree.scss` (MODIFIED)

Same pattern as `_virtual-list.scss`. If no row-height constants exist in this file (rendering depends on component style), this file may not need changes.

## DOM binding flow

Same as the SCSS-first plan with the source of var defs changed:

```
1. main.ts construct:
     this.themeService = new ThemeService();
     this.themeService.hydrate(this.settings.elasticUi);

2. ThemeService internal state:
     activePresetId = 'vaultman' (default)
     customPresets  = [] (default)

3. ThemeService.rootClasses getter:
     [ 'vm-root', 'vm-mode-thin', 'vm-id-native', 'vm-theme-vaultman' ]

4. frameVaultman.svelte:619 (unchanged):
     const elasticRootClasses = $derived(
       plugin.themeService.rootClasses.join(' ')
     );

5. DOM:
     <div class="vm-root vm-mode-thin vm-id-native vm-theme-vaultman ...">

6. UnoCSS-emitted .vm-theme-vaultman block (build output) supplies:
     --vm-popup-bg-opacity: 0.92;
     --vm-popup-backdrop-blur: 4px;
     --vm-row-height: 32px;
     // ...

7. _islands.scss + _virtual-list.scss + _tree.scss read the vars via
   var() and paint.
```

## Runtime custom preset injection

Unchanged from the SCSS-first plan. ThemeService's `#syncCustomStyles` method appends `<style data-vm-theme-presets="custom">` to `<head>` and populates it with one `.vm-theme-{cssEscapedId}` block per custom preset, with the same six tokens that UnoCSS emits for built-ins.

The runtime-injected blocks coexist with UnoCSS-emitted blocks in the cascade. Selector specificity is identical (`.vm-theme-{id}`), so the later-loaded source wins. `ThemeService.#syncCustomStyles` appends to `<head>` after the bundle loads, so runtime blocks appear later in the cascade — but this only matters if a custom preset shares an id with a built-in, which is rejected by `registerCustomPreset` (built-in ids are reserved).

### CSS-id encoding

Same as before. `#cssEscape(id)` replaces non-`[A-Za-z0-9_-]` with `-`.

### Value sanitization

Same as before. `#sanitizeCssLength` and `#sanitizeNumber01` validate each token before injection.

## Body class binding removed

Unchanged from the SCSS-first plan. The four legacy body classes toggled by `applyVaultmanTheme` are deleted (`vm-theme-*`, `vm-island-backdrop-enabled`, `vm-faint-accents-workspace-focus`, `vm-node-backgrounds-off`, `vm-node-borders-off`).

The first goes to `.vm-root` via `rootClasses`. The other four become dead body selectors until a follow-up re-binds them on `.vm-root`. See [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/09-risks-and-open-items|Sec 9 R6]].

## Verification queries

After implementation, these greps must return zero matches in `src/`:

- `grep -rn "applyVaultmanTheme" src/`
- `grep -rn "vm-glass-blur" src/styles/`
- `grep -rn "body\.vm-theme\|body \.vm-theme" src/styles/`

These verify the migration is complete.

Also verify build output:

- `grep -A 8 "vm-theme-native" dist/build/styles.css` → 6 `--vm-*` custom properties declared.
- `grep -A 8 "vm-theme-vaultman" dist/build/styles.css` → 6 `--vm-*` custom properties declared.

The build output verification confirms `unocss-preset-theme` emitted the expected blocks. If absent, the preset-theme configuration in T10 is wrong.
