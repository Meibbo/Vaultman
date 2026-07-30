---
title: Phase 5 — SCSS migration
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B plan]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/plan
  - explorer/theme
  - explorer/scss
---

# Phase 5 — SCSS Migration

Three tasks: create the built-in token blocks file, migrate `_islands.scss` to token-driven chrome, migrate row-height consumers to the new density token. SCSS changes have no unit-test gate — verify via build and visual smoke.

## Task 10 — Install `@unocss/preset-theme` and configure built-in tokens

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml` (generated)
- Modify: `uno.config.ts`

- [ ] **Step 1: Install `@unocss/preset-theme`**

Run: `pnpm add -D @unocss/preset-theme@latest` Expected: `package.json` `devDependencies` gains `@unocss/preset-theme` at a version matching the installed `unocss` (currently ^66.6.8).
`pnpm-lock.yaml` is updated.

If the latest version differs from the installed `unocss` major version, pin to the matching version explicitly:

```bash
pnpm add -D @unocss/preset-theme@^66.6.8
```

- [ ] **Step 2: Read the installed preset-theme API surface**

Run: `cat node_modules/@unocss/preset-theme/package.json | head -20` Note the entry point and version. Read the README at `node_modules/@unocss/preset-theme/README.md` (or browse the [GitHub repo](https://github.com/unocss/unocss/tree/main/packages/preset-theme)) to confirm exact configuration shape.

The spec mandates this OUTPUT contract; the configuration shape may differ across plugin versions and the engineer must adapt:

1. Build emits exactly:
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
2. Variable names use the `--vm-` prefix exactly.
3. Class selectors are `.vm-theme-native` and `.vm-theme-vaultman` exactly.

If `@unocss/preset-theme`'s declarative API doesn't reach this shape (e.g., it generates `.theme-{name}` selectors with no override), the engineer writes a custom UnoCSS rule via `rules:` array that emits the equivalent CSS — preserving the OUTPUT contract above. Do NOT fight the plugin.

- [ ] **Step 3: Modify `uno.config.ts`**

Replace the file contents with the spec-mandated configuration. The exact API in the code below uses `presetTheme` with `prefix`, `theme`, and `selectors` fields — adjust if the installed version uses different field names while preserving the output contract.

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
    'vm-theme-native',
    'vm-theme-vaultman',
  ],
  shortcuts: [
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

- [ ] **Step 4: Run build**

Run: `pnpm run build:plugin` Expected: build passes.

If the preset-theme config shape is incorrect for the installed version, the build fails. Inspect the error; consult preset-theme README; adjust the config; re-run.

- [ ] **Step 5: Verify build output**

Run: `grep -A 8 "vm-theme-native" dist/build/styles.css | head -10` Expected: six `--vm-*` custom properties listed within the `.vm-theme-native { ... }` block.

Run: `grep -A 8 "vm-theme-vaultman" dist/build/styles.css | head -10` Expected: six `--vm-*` custom properties listed within the `.vm-theme-vaultman { ... }` block.

If either selector is absent or the variables are missing, the preset-theme configuration did not produce the spec-mandated output.
Fix before continuing.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml uno.config.ts
git commit -m "$(cat <<'EOF'
feat(0-b): adopt @unocss/preset-theme for built-in token blocks

Installs @unocss/preset-theme matching the installed UnoCSS version.
uno.config.ts declares two themes (native, vaultman) with six
CSS vars each (popup-bg-opacity, popup-backdrop-blur, popup-bg-tint,
row-height, row-padding-y, icon-size). UnoCSS emits the matching
.vm-theme-native and .vm-theme-vaultman blocks in the build output
with --vm-* prefixed variables.

Anticipates the upcoming Sub-system N (SCSS-to-UnoCSS migration,
target ~90% UnoCSS). Custom theme presets continue to be
runtime-injected by ThemeService since preset-theme is build-time
only.

Adds 'vm-theme-native' and 'vm-theme-vaultman' to safelist so theme
selectors are kept even when not referenced statically.
EOF
)"
```

## Task 11 — Migrate `_islands.scss` to token-driven chrome

**Files:**
- Modify: `src/styles/popup/_islands.scss`

- [ ] **Step 1: Read current state**

Run: `grep -n "vm-glass-blur\|vm-theme-default\|vm-theme-native\|vm-theme-polish\|vm-theme-glass" src/styles/popup/_islands.scss` Note all line numbers that reference legacy theme blocks or `--vm-glass-blur`.

- [ ] **Step 2: Replace the four theme blocks with one token-driven block**

Open `src/styles/popup/_islands.scss`. Find the four legacy blocks (approximately lines 446-475 per pre-0-B state). They look like:

```scss
.vm-theme-default,
.vm-theme-native {
  .vm-explorer-popup { ... }
  .vm-squircle { ... }
}

.vm-theme-polish { ... }
.vm-theme-glass { ... }
```

Replace ALL FOUR blocks with the single token-driven block from [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/05-scss-and-dom-binding|spec shard 05 §"File 3"]]:

```scss
// Token-driven chrome. Selector targets .vm-root because the active
// preset's token block (in _theme-presets.scss or runtime-injected)
// supplies var values via cascade.
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

- [ ] **Step 3: Run build**

Run: `pnpm run build:plugin` Expected: build passes.

- [ ] **Step 4: Verify legacy references removed**

Run: `grep -n "vm-theme-default\|vm-theme-polish\|vm-theme-glass\|vm-glass-blur" src/styles/popup/_islands.scss` Expected: empty output.

Run: `grep -rn "vm-glass-blur" src/styles/` Expected: empty output (any other file still using `--vm-glass-blur` must be updated to `--vm-popup-backdrop-blur` — investigate matches).

- [ ] **Step 5: Live visual smoke (optional but recommended)**

Run: `pnpm run build` (or whichever script syncs to `plugin-dev`).
Reload Vaultman in Obsidian. Open a popup; confirm it renders. Switch preset via:

```javascript
plugin.themeService.setPreset('native');
```

Confirm the popup turns opaque with no blur. Then:

```javascript
plugin.themeService.setPreset('vaultman');
```

Confirm semi-translucent with blur.

- [ ] **Step 6: Commit**

```bash
git add src/styles/popup/_islands.scss
git commit -m "$(cat <<'EOF'
refactor(0-b): migrate _islands.scss to token-driven chrome

Replaces the four legacy theme-name blocks (vm-theme-default,
vm-theme-native, vm-theme-polish, vm-theme-glass) with a single
.vm-root selector that reads --vm-popup-bg-opacity and
--vm-popup-backdrop-blur from the active preset's token block in
_theme-presets.scss.

--vm-glass-blur is gone. Custom presets supply chrome tokens via
ThemeService runtime injection.
EOF
)"
```

## Task 12 — Migrate `_virtual-list.scss` and `_tree.scss` to density tokens

**Files:**
- Modify: `src/styles/explorer/_virtual-list.scss`
- Modify: `src/styles/explorer/_tree.scss`

- [ ] **Step 1: Audit current row-height usage**

Run: `grep -nE "(height|padding-y|padding):\s*[0-9]+px" src/styles/explorer/_virtual-list.scss src/styles/explorer/_tree.scss | head -20`

Identify rules that hardcode row height, vertical padding, or icon size. These are the migration targets.

- [ ] **Step 2: Migrate hardcoded values to var() reads**

For each identified rule, replace numeric values with var() reads.
Example pattern:

```scss
// Before:
.vm-view-list-row {
  height: 32px;
  padding: 4px 8px;
}

// After:
.vm-view-list-row {
  height: var(--vm-row-height, 32px);
  padding: var(--vm-row-padding-y, 4px) 8px;
}
```

Apply the same pattern to icon-related rules:

```scss
// Before:
.vm-view-list-row .icon {
  width: 16px;
  height: 16px;
}

// After:
.vm-view-list-row .icon {
  width: var(--vm-icon-size, 16px);
  height: var(--vm-icon-size, 16px);
}
```

The exact rules depend on current file content; the migration pattern is the same.

- [ ] **Step 3: Run build**

Run: `pnpm run build:plugin` Expected: build passes.

- [ ] **Step 4: Live visual smoke**

Reload Vaultman. Switch presets and confirm row height changes between native (~26px) and vaultman (~32px). If TanStack virtualizer measureElement reflows show visible jank during switch, it is the known R5 risk — acceptable.

- [ ] **Step 5: Commit**

```bash
git add src/styles/explorer/_virtual-list.scss src/styles/explorer/_tree.scss
git commit -m "$(cat <<'EOF'
refactor(0-b): row density from CSS vars in virtual-list and tree

Row height, vertical padding, and icon size in _virtual-list.scss and
_tree.scss now read from --vm-row-height, --vm-row-padding-y, and
--vm-icon-size respectively. Default fallback values (32px, 4px, 16px)
match the vaultman preset so existing default-install behavior is
preserved.

TanStack virtualizer estimateSize remains the constant 32; first paint
after preset switch may show row jank for a few frames as
measureElement reflows. Documented as accepted in spec R5.
EOF
)"
```

When Phase 5 is complete, proceed to [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-6-legacy-cleanup|Phase 6]].
