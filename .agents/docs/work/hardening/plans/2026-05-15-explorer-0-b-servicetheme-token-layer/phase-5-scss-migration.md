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

Three tasks: create the built-in token blocks file, migrate
`_islands.scss` to token-driven chrome, migrate row-height consumers to
the new density token. SCSS changes have no unit-test gate — verify via
build and visual smoke.

## Task 10 — Create `_theme-presets.scss` and wire into `main.scss`

**Files:**
- Create: `src/styles/_theme-presets.scss`
- Modify: `src/main.scss`

- [ ] **Step 1: Create `_theme-presets.scss`**

Create `src/styles/_theme-presets.scss` with the exact contents from
[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/05-scss-and-dom-binding|spec shard 05 §"File 1"]]:

```scss
// _theme-presets.scss
// Built-in theme preset tokens. Custom presets are runtime-injected by
// ThemeService — see src/services/serviceTheme.svelte.ts.
//
// Each block scopes its tokens under .vm-theme-{id}. The .vm-root carries
// exactly one such class at a time; cascade resolves vars from there.

@use 'tokens' as *;

/* ------------------------------------------------------------------ */
/*   Native preset — chameleon disguise                              */
/* ------------------------------------------------------------------ */

.vm-theme-native {
  --vm-popup-bg-opacity: 1;
  --vm-popup-backdrop-blur: 0px;
  --vm-popup-bg-tint: 0;

  --vm-row-height: 26px;
  --vm-row-padding-y: 2px;
  --vm-icon-size: 14px;
}

/* ------------------------------------------------------------------ */
/*   Vaultman preset — full plugin                                    */
/* ------------------------------------------------------------------ */

.vm-theme-vaultman {
  --vm-popup-bg-opacity: 0.92;
  --vm-popup-backdrop-blur: 4px;
  --vm-popup-bg-tint: 0;

  --vm-row-height: 32px;
  --vm-row-padding-y: 4px;
  --vm-icon-size: 16px;
}
```

- [ ] **Step 2: Wire into `main.scss`**

Open `src/main.scss`. Find this block at the top:

```scss
// 1. Settings & Tools (ITCSS: Settings -> Tools)
@use './styles/tokens' as *;
@use './styles/mixins' as *;
@use './styles/elastic';
```

Replace with:

```scss
// 1. Settings & Tools (ITCSS: Settings -> Tools)
@use './styles/tokens' as *;
@use './styles/mixins' as *;
@use './styles/elastic';
@use './styles/theme-presets';
```

- [ ] **Step 3: Run build**

Run: `pnpm run build:plugin`
Expected: build passes; emits updated `styles.css`.

If build fails with a Sass error about the new file, check the
`@use 'tokens' as *` line — `tokens` must resolve relative to
`_theme-presets.scss` location. If `tokens.scss` is in the same
directory (`src/styles/`), the path is correct. Otherwise adjust to
`@use '../tokens' as *` etc.

- [ ] **Step 4: Verify CSS output contains the blocks**

Run: `grep -A 2 "vm-theme-native\|vm-theme-vaultman" dist/build/styles.css | head -20`
Expected: two CSS blocks present with the six `--vm-*` custom
properties each. If the build emitted to a different path, adjust.

- [ ] **Step 5: Commit**

```bash
git add src/styles/_theme-presets.scss src/main.scss
git commit -m "$(cat <<'EOF'
feat(0-b): add SCSS token blocks for built-in theme presets

New file src/styles/_theme-presets.scss defines .vm-theme-native and
.vm-theme-vaultman var blocks with six --vm-* custom properties each
(popup bg opacity/blur/tint, row height/padding/icon size).

main.scss includes the new file after _elastic. Cascade resolves
tokens from whichever vm-theme-{id} class is active on .vm-root.

Custom presets continue to inject their own block via ThemeService at
runtime (T9).
EOF
)"
```

## Task 11 — Migrate `_islands.scss` to token-driven chrome

**Files:**
- Modify: `src/styles/popup/_islands.scss`

- [ ] **Step 1: Read current state**

Run: `grep -n "vm-glass-blur\|vm-theme-default\|vm-theme-native\|vm-theme-polish\|vm-theme-glass" src/styles/popup/_islands.scss`
Note all line numbers that reference legacy theme blocks or
`--vm-glass-blur`.

- [ ] **Step 2: Replace the four theme blocks with one token-driven block**

Open `src/styles/popup/_islands.scss`. Find the four legacy blocks
(approximately lines 446-475 per pre-0-B state). They look like:

```scss
.vm-theme-default,
.vm-theme-native {
  .vm-explorer-popup { ... }
  .vm-squircle { ... }
}

.vm-theme-polish { ... }
.vm-theme-glass { ... }
```

Replace ALL FOUR blocks with the single token-driven block from
[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/05-scss-and-dom-binding|spec shard 05 §"File 3"]]:

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

Run: `pnpm run build:plugin`
Expected: build passes.

- [ ] **Step 4: Verify legacy references removed**

Run: `grep -n "vm-theme-default\|vm-theme-polish\|vm-theme-glass\|vm-glass-blur" src/styles/popup/_islands.scss`
Expected: empty output.

Run: `grep -rn "vm-glass-blur" src/styles/`
Expected: empty output (any other file still using `--vm-glass-blur`
must be updated to `--vm-popup-backdrop-blur` — investigate matches).

- [ ] **Step 5: Live visual smoke (optional but recommended)**

Run: `pnpm run build` (or whichever script syncs to `plugin-dev`).
Reload Vaultman in Obsidian. Open a popup; confirm it renders. Switch
preset via:

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

Identify rules that hardcode row height, vertical padding, or icon
size. These are the migration targets.

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

The exact rules depend on current file content; the migration pattern is
the same.

- [ ] **Step 3: Run build**

Run: `pnpm run build:plugin`
Expected: build passes.

- [ ] **Step 4: Live visual smoke**

Reload Vaultman. Switch presets and confirm row height changes between
native (~26px) and vaultman (~32px). If TanStack virtualizer
measureElement reflows show visible jank during switch, it is the known
R5 risk — acceptable.

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

When Phase 5 is complete, proceed to
[[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-6-legacy-cleanup|Phase 6]].
