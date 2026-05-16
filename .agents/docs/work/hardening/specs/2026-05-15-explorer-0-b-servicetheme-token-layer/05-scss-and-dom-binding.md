---
title: SCSS token layer and DOM binding
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B serviceTheme + token layer]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - explorer/theme
  - explorer/scss
---

# SCSS Token Layer And DOM Binding

## Why no `unocss-preset-theme`

Three observations from the codebase audit shape this decision:

- **The token surface is small.** Built-in presets vary across exactly
  six CSS vars: `--vm-popup-bg-opacity`, `--vm-popup-backdrop-blur`,
  `--vm-popup-bg-tint`, `--vm-row-height`, `--vm-row-padding-y`,
  `--vm-icon-size`. Adding a plugin for six vars is overhead.
- **Colors do not change between themes.** Vaultman delegates colors to
  Obsidian via `_tokens.scss` (`$vm-bg-primary: var(--background-primary)`,
  etc.). The "theme" governs layout/structure, not paint. The primary
  use-case of `unocss-preset-theme` — declarative palette switching — is
  not applicable.
- **Custom presets need runtime injection regardless.** `unocss-preset-theme`
  is a build-time mechanism. User-created custom presets live in
  `data.json` and must inject CSS at runtime. Once that path exists for
  customs, using it for built-ins too is a small extension; using
  `unocss-preset-theme` only for built-ins is dual-path overhead with no
  payoff.

The SCSS-only approach is also consistent with the codebase's center of
mass (40 SCSS files, ~7934 LOC, vs. UnoCSS in ~6 utility-heavy
components).

## File 1 — `src/styles/_theme-presets.scss` (NEW)

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

## File 2 — `src/main.scss` (MODIFIED)

Add the `@use` line in the Settings/Tools section, after `_elastic`:

```scss
// 1. Settings & Tools (ITCSS: Settings -> Tools)
@use './styles/tokens' as *;
@use './styles/mixins' as *;
@use './styles/elastic';
@use './styles/theme-presets';   // NEW
```

## File 3 — `src/styles/popup/_islands.scss` (MODIFIED)

Replace the per-theme-name blocks with a single token-driven block.

### Before

```scss
.vm-theme-default,
.vm-theme-native {
  .vm-explorer-popup {
    background: $vm-bg-primary;
    border-radius: $vm-radius-m;
    box-shadow: none;
  }
  .vm-squircle {
    background: $vm-bg-primary;
    border-radius: $vm-radius-m;
    box-shadow: none;
  }
}

.vm-theme-polish {
  .vm-explorer-popup,
  .vm-squircle {
    background: color-mix(in srgb, $vm-bg-secondary 92%, transparent);
  }
}

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
// Token-driven chrome. Selector targets any vm-theme-* root class because
// the active preset's token block (in _theme-presets.scss or
// runtime-injected) supplies var values.
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

The three legacy theme-name selectors are deleted. The token values
arrive from whichever `.vm-theme-{id}` class is active on `.vm-root`.

## File 4 — `src/styles/explorer/_virtual-list.scss` (MODIFIED)

Find the constant row-height declaration and replace with the var. Exact
selector depends on current file content; the migration pattern is:

```scss
// Before:
.vm-view-list-row {
  height: 32px;
  // ...
}

// After:
.vm-view-list-row {
  height: var(--vm-row-height, 32px);
  // ...
}
```

Similar substitutions for `padding-y` and any `icon-size` constants
present.

## File 5 — `src/styles/explorer/_tree.scss` (MODIFIED)

Same pattern as `_virtual-list.scss`. Audit during implementation; if
no constant row-height exists in this file (rendering depends entirely on
component-level style), this file may not need changes.

## DOM binding flow

```
1. main.ts construct:
     this.themeService = new ThemeService();
     this.themeService.hydrate(this.settings.elasticUi);

2. ThemeService internal state:
     activePresetId = 'vaultman' (default for fresh install)
     customPresets  = [] (default)

3. ThemeService.rootClasses getter (reactive):
     [
       'vm-root',
       'vm-mode-thin',           // from this.mode
       'vm-id-native',           // from this.identity
       'vm-theme-vaultman',      // NEW — from this.activePresetId
     ]
     (+ optional 'vm-faint', 'vm-reduced-motion', 'vm-foul-detect')

4. frameVaultman.svelte:619 (unchanged code, new array content):
     const elasticRootClasses = $derived(
       plugin.themeService.rootClasses.join(' ')
     );

5. frameVaultman renders:
     <div class={elasticRootClasses} ...>
       ...
     </div>

6. DOM result:
     <div class="vm-root vm-mode-thin vm-id-native vm-theme-vaultman ...">

7. SCSS cascade resolves vars from .vm-theme-vaultman block (built-in
   from _theme-presets.scss):
     --vm-popup-bg-opacity: 0.92;
     --vm-popup-backdrop-blur: 4px;
     --vm-row-height: 32px;
     // ...

8. _islands.scss + _virtual-list.scss + _tree.scss read the vars,
   compute computed styles. Browser paints.
```

## Runtime custom preset injection

The `<style>` element model. One `<style data-vm-theme-presets="custom">`
element is appended to `<head>` the first time a custom preset is
registered. Its `textContent` is rebuilt on every register/unregister/
update call.

### Lifecycle

```
hydrate(settings) called  ──▶  customPresets = []
                                 ▼
                               #syncCustomStyles()
                                 ▼
                               customPresets.length === 0
                                 → no <style> element created
                                 → return

hydrate(settings) called  ──▶  customPresets = [p1, p2]
                                 ▼
                               #syncCustomStyles()
                                 ▼
                               render CSS for p1 + p2
                                 ▼
                               create <style data-vm-theme-presets="custom">
                               textContent = `.vm-theme-{p1.id} {...}
                                              .vm-theme-{p2.id} {...}`
                               appendChild(document.head, styleEl)

registerCustomPreset(p3)  ──▶  customPresets = [p1, p2, p3]
                                 ▼
                               #syncCustomStyles()
                                 ▼
                               styleEl.textContent = (rebuilt with p3)

unregisterCustomPreset(p2.id) ▶ customPresets = [p1, p3]
                                 ▼
                               #syncCustomStyles()
                                 ▼
                               styleEl.textContent = (rebuilt without p2)

unregisterCustomPreset(p1.id),
unregisterCustomPreset(p3.id) ▶ customPresets = []
                                 ▼
                               #syncCustomStyles()
                                 ▼
                               styleEl.remove(); styleEl = null

dispose() (plugin unload) ──▶  styleEl?.remove(); styleEl = null
```

### CSS-id encoding

User-defined preset ids may contain spaces, slashes, colons, dots. CSS
class selectors require escaping or alphanumeric/dash/underscore. The
service encodes via:

```typescript
#cssEscape(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-');
}
```

So `id = 'Native + dock'` produces `.vm-theme-Native---dock` in the
emitted block, and `rootClasses` likewise emits `'vm-theme-Native---dock'`
on `.vm-root`. The transformation is deterministic — repeated calls with
the same id produce the same class.

Two ids that differ only in non-encoded characters (e.g., `'a b'` vs
`'a-b'`) collide after encoding. Acceptable since user-authored ids are
expected to be sensible.

### Value sanitization (security)

Each token value is validated before injection. Strings outside
recognized CSS-length/number patterns are replaced with `'0'`:

```typescript
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

A malicious custom preset trying to inject `'}; body { display:none } /*'`
as `popupBackdropBlur` gets sanitized to `'0'`. The injection vector is
closed.

## Body class binding removed

The legacy `<body>` class binding via `applyVaultmanTheme(body, settings)`
is removed entirely. Five body classes were toggled by the legacy
function:

| Body class | Disposition |
|---|---|
| `vm-theme-{default/native/polish/glass/custom}` | DELETED. Replaced by `vm-theme-{id}` on `.vm-root`. |
| `vm-island-backdrop-enabled` | DELETED. The `islandBackdropBlur` setting is deleted in 0-B (see Sec 6). |
| `vm-faint-accents-workspace-focus` | DELETED. The `faintAccentsWhenWorkspaceFocused` setting is preserved as orthogonal; if SCSS rules still target `body.vm-faint-accents-workspace-focus`, migrate them to `.vm-root.vm-faint-accents-workspace-focus` and toggle via `themeService` (out of 0-B scope — flagged for cleanup). |
| `vm-node-backgrounds-off` | DELETED from body binding. `explorerNodeBackgrounds` setting is preserved; needs separate binding logic in a small follow-up (flag). |
| `vm-node-borders-off` | Same pattern. |

The three "orthogonal toggle" body classes were a side-effect of
`applyVaultmanTheme`. After 0-B their settings persist but the body
binding no longer happens. SCSS selectors that depended on
`body.vm-{toggle}` will silently no-op until a future small fix re-binds
them on `.vm-root` (or we move them into `ThemeService.rootClasses`).
The risk is documented in
[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/09-risks-and-open-items|Sec 9 R6]].

## Verification queries

After implementation, these greps must return zero matches in `src/`:

- `grep -rn "applyVaultmanTheme" src/`
- `grep -rn "vm-glass-blur" src/styles/`
- `grep -rn "body\.vm-theme\|body \.vm-theme" src/styles/`

These verify the migration is complete and no stale references remain.
