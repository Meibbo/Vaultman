---
title: Architecture
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B serviceTheme + token layer]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - explorer/theme
---

# Architecture

## Single deep module — Ousterhout shape

0-B replaces the current two-service split with one runes class — `ThemeService` in `src/services/serviceTheme.svelte.ts` — holding:

- complete theme state (active preset id, custom preset registry, legacy orthogonal axes);
- a small public read surface (`activePreset`, `useNativeDom`, `rootClasses`, `availablePresets`);
- a focused write surface (`setPreset`, `registerCustomPreset`, `unregisterCustomPreset`, `updateCustomPreset`);
- private internals (settings normalization, runtime `<style>` injection for custom presets, css-id sanitization, built-in resolution).

The depth is in the implementation, not in the file count. Consumers import one module, read 1-2 fields, and never reach for internals.

```text
┌─ ThemeService (src/services/serviceTheme.svelte.ts) ──────────────────┐
│                                                                       │
│  Public reads:                                                        │
│    activePreset       ThemePreset (derived)                           │
│    useNativeDom       boolean (shortcut)                              │
│    rootClasses        string[] (composed; consumed by frameVaultman) │
│    availablePresets   readonly ThemePreset[] (builtins + customs)     │
│    faintActive        boolean (preserved)                             │
│    useUtilities       boolean (preserved)                             │
│                                                                       │
│  Public writes:                                                       │
│    setPreset(id)                                                      │
│    registerCustomPreset(p)                                            │
│    unregisterCustomPreset(id)                                         │
│    updateCustomPreset(id, partial)                                    │
│    hydrate(settings)                                                  │
│                                                                       │
│  Public state (runes — touched by Settings UI and frame focus):       │
│    activePresetId      ThemePresetId                                  │
│    customPresets       ThemePreset[]                                  │
│    mode                VaultmanUiMode      (orthogonal, preserved)    │
│    identity            VaultmanUiIdentity  (orthogonal, preserved)    │
│    faintModeEnabled    boolean             (preserved)                │
│    reducedMotion       boolean             (preserved)                │
│    windowFocused       boolean             (preserved)                │
│    foulDetection       boolean             (preserved)                │
│                                                                       │
│  Private internals:                                                   │
│    #styleEl           HTMLStyleElement | null                         │
│    #syncCustomStyles()                                                │
│    #cssEscape(id)                                                     │
│    #sanitizeCssValue(value, kind)                                     │
└───────────────────────────────────────────────────────────────────────┘
```

## Layered components

```text
┌──────────────────────────────────────────────────────────────────────┐
│  Layer 1 — Type contract (no runtime, no side effects)              │
│                                                                      │
│    src/types/typeThemePreset.ts                                      │
│      ThemePreset, ThemePresetId, ThemePresetSource                   │
│      ChromeTokens, DensityTokens                                     │
│      NodeElementVisibility                                           │
│      DockSettings, TabsSettings, ToolbarSettings                     │
│      ColorKnobMap, LayoutPlacementMap                                │
│      normalizeCustomPreset(raw): ThemePreset | null                  │
│      isBuiltInPreset(p): boolean                                     │
└──────────────────────────────────────────────────────────────────────┘
                          │ imported by
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Layer 2 — Built-in preset constants                                 │
│                                                                      │
│    src/config/themePresetsBuiltin.ts                                 │
│      PRESET_NATIVE: ThemePreset       (as const)                     │
│      PRESET_VAULTMAN: ThemePreset     (as const)                     │
│      BUILT_IN_PRESETS: readonly ThemePreset[]                        │
└──────────────────────────────────────────────────────────────────────┘
                          │ imported by
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Layer 3 — Runes service                                             │
│                                                                      │
│    src/services/serviceTheme.svelte.ts                               │
│      ThemeService class (see top of this shard)                      │
└──────────────────────────────────────────────────────────────────────┘
                          │ instantiated by
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Layer 4 — Plugin orchestrator                                       │
│                                                                      │
│    src/main.ts                                                       │
│      this.themeService = new ThemeService();                         │
│      this.themeService.hydrate(this.settings.elasticUi);             │
│                                                                      │
│      saveSettings() syncs activePresetId + customPresets back        │
│      into settings.elasticUi before saveData().                      │
└──────────────────────────────────────────────────────────────────────┘
                          │ passes themeService prop to
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Layer 5 — Consumers                                                 │
│                                                                      │
│    frameVaultman.svelte:619                                          │
│      elasticRootClasses = themeService.rootClasses.join(' ')         │
│      → <div class={elasticRootClasses}> ... </div>  // .vm-root      │
│                                                                      │
│    View components (Tree, Table, Cards, Grid, Outline):              │
│      useNativeDom = themeService?.useNativeDom ?? false              │
│      → class:nav-file={useNativeDom} arbitration unchanged           │
│                                                                      │
│    Settings UI (post-0-B, future sub-system):                        │
│      themeService.availablePresets → preset selector                 │
│      themeService.setPreset(id) on user pick                         │
└──────────────────────────────────────────────────────────────────────┘
                          │ DOM gains .vm-theme-{id} class
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Layer 6 — UnoCSS preset-theme + SCSS cascade                        │
│                                                                      │
│    uno.config.ts (MODIFIED)                                          │
│      presetTheme({                                                   │
│        prefix: '--vm',                                               │
│        theme: {                                                      │
│          native:   { 'popup-bg-opacity': '1',  'row-height': '26px', ... },│
│          vaultman: { 'popup-bg-opacity': '0.92','row-height': '32px', ... },│
│        },                                                            │
│        selectors: {                                                  │
│          native:   '.vm-theme-native',                               │
│          vaultman: '.vm-theme-vaultman',                             │
│        },                                                            │
│      })                                                              │
│    Build output (UnoCSS-emitted CSS):                                │
│      .vm-theme-native   { --vm-popup-bg-opacity: 1; ... }            │
│      .vm-theme-vaultman { --vm-popup-bg-opacity: 0.92; ... }         │
│                                                                      │
│    _islands.scss (modified)                                          │
│      .vm-root .vm-explorer-popup {                                   │
│        background: color-mix(... var(--vm-popup-bg-opacity) ...);    │
│        backdrop-filter: blur(var(--vm-popup-backdrop-blur, 0px));    │
│      }                                                               │
│                                                                      │
│    _virtual-list.scss, _tree.scss (modified)                         │
│      row-height: var(--vm-row-height, 32px);                         │
└──────────────────────────────────────────────────────────────────────┘
                          │ runtime additions
                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Layer 7 — Runtime custom preset injection                           │
│                                                                      │
│    ThemeService.#syncCustomStyles()                                  │
│      <style data-vm-theme-presets="custom">                          │
│        .vm-theme-{customId} { --vm-popup-bg-opacity: ...; ... }      │
│      </style>                                                        │
│                                                                      │
│      Appended to document.head once; updated in-place on             │
│      register/unregister/update; removed if customPresets empties.   │
└──────────────────────────────────────────────────────────────────────┘
```

## Why one component, not three

An alternative decomposition (the brainstorm's earlier Approach 2) would split this into:

- `serviceTheme.svelte.ts` — runes state only.
- `serviceThemeRegistry.svelte.ts` — built-in + custom preset registry.
- `serviceThemeTokens.ts` — token defaults, normalizers, sanitization.

That split optimizes for module-level SOLID and "one job per file." It trades navigational simplicity for an artificial seam between things that are read together. The post-0-H architecture handoff explicitly cautions against this trade-off:

> Do not force SOLID as a checklist. Use deeper modules with small
> interfaces and high leverage.

The data and operations co-locate naturally:

- `activePreset` reads from `activePresetId` + `customPresets` + built-in constants in one derivation;
- `setPreset(id)` validates against `availablePresets` which is built-in
  + custom;
- `registerCustomPreset(p)` mutates `customPresets` then triggers `#syncCustomStyles()` which reads the same `customPresets` array.

In a three-module split each of these is a cross-module call. In the single-module shape each is a self-contained method or getter.

If the class grows past ~300 LOC (it should land near 100), splitting later is cheap: extract methods to private modules, keep the public API.
Pre-splitting is premature.

## Net file diff

| Path | Change |
|---|---|
| `src/types/typeThemePreset.ts` | NEW. Type contract + `normalizeCustomPreset` + `isBuiltInPreset`. ~150 LOC. |
| `src/config/themePresetsBuiltin.ts` | NEW. `PRESET_NATIVE`, `PRESET_VAULTMAN`, `BUILT_IN_PRESETS`. ~90 LOC. |
| `src/services/serviceTheme.svelte.ts` | MODIFIED. ~80 LOC growth (preset registry + #syncCustomStyles). Total ~120 LOC. |
| `src/services/serviceTheme.ts` | DELETED. (49 LOC removed.) |
| `uno.config.ts` | MODIFIED. Adds `unocss-preset-theme` plugin import + config block (~30 LOC added). |
| `package.json` | MODIFIED. Adds `@unocss/preset-theme` dependency. |
| `src/styles/popup/_islands.scss` | MODIFIED. `--vm-glass-blur` → `--vm-popup-backdrop-blur`; chrome opacity via `--vm-popup-bg-opacity`; legacy `.vm-theme-{default,polish,glass}` blocks deleted. |
| `src/styles/explorer/_virtual-list.scss` | MODIFIED. Row-height reads `var(--vm-row-height, 32px)`. |
| `src/styles/explorer/_tree.scss` | MODIFIED. Same. |
| `src/types/typeElasticUi.ts` | MODIFIED. `themePresetId` + `customPresets` added; `DEFAULT_ELASTIC_UI_SETTINGS` updated; `normalizeElasticUiSettings` extended. |
| `src/types/typeSettings.ts` | MODIFIED. `layoutTheme`, `glassBlurIntensity`, `islandBackdropBlur` deleted; `elasticUi` becomes required; `updateGlassBlur(): void` method declaration removed. |
| `src/main.ts` | MODIFIED. `applyVaultmanTheme` import + call removed; `updateGlassBlur()` method deleted; `normalizeLayoutTheme` import + call removed; `saveSettings()` syncs runes state. |
| `src/components/settings/SettingsUI.svelte` | MODIFIED. Legacy `layoutTheme` dropdown + glass blur slider + island backdrop toggle removed. |
| `test/unit/services/serviceTheme.test.ts` | DELETED (legacy `applyVaultmanTheme` tests). |
| `test/unit/services/serviceThemeRunes.test.ts` | MODIFIED. Existing tests preserved; ~12-15 new tests added. |
| `test/unit/types/typeThemePreset.test.ts` | NEW. ~8-10 tests. |
| `test/unit/config/themePresetsBuiltin.test.ts` | NEW. ~6-8 tests. |
| `test/component/themeServiceCustomStyleInjection.test.ts` | NEW. ~4-6 tests. |
| `test/component/frameVaultmanRootClasses.test.ts` | NEW. ~3-4 tests. |
| `test/component/settingsUI.test.ts` | MODIFIED. `updateGlassBlur` mock + related tests removed. |

Net (counted from table above): 8 new files (4 spec/doc + 4 test), 11 modified files, 2 deleted files. Type contract and test files account for the majority of net new lines. The `architecture.canvas` JSON Canvas at the spec root is an additional doc artifact (not in the table).
