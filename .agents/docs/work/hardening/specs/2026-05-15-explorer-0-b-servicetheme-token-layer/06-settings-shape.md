---
title: Settings shape (clean break)
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B serviceTheme + token layer]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - explorer/theme
---

# Settings Shape (Clean Break)

The user confirmed during brainstorm: no pre-0-B userbase exists. 0-B adopts a clean-break shape — no migration code, no downgrade safety, no `@deprecated` markers, no legacy normalize fallbacks.

## `ElasticUiSettings` — post-0-B shape

```typescript
// src/types/typeElasticUi.ts

import type { ThemePresetId, ThemePreset } from './typeThemePreset';

export type VaultmanUiMode = 'thin' | 'balanced' | 'thick';
export type VaultmanUiIdentity = 'native' | 'bases' | 'outline' | 'bookmarks';

export interface ElasticUiSettings {
  mode: VaultmanUiMode;
  identity: VaultmanUiIdentity;
  faintModeEnabled: boolean;
  reducedMotion: boolean;
  foulDetection: boolean;

  /** Active theme preset id. Default 'vaultman'. */
  themePresetId: ThemePresetId;

  /** User-defined preset registry. Persisted. */
  customPresets: ThemePreset[];
}

export const DEFAULT_ELASTIC_UI_SETTINGS: ElasticUiSettings = {
  mode: 'thin',
  identity: 'native',
  faintModeEnabled: false,
  reducedMotion: false,
  foulDetection: false,
  themePresetId: 'vaultman',
  customPresets: [],
};

function normalizeMode(value: unknown): VaultmanUiMode {
  return value === 'balanced' || value === 'thick' || value === 'thin'
    ? value
    : 'thin';
}

function normalizeIdentity(value: unknown): VaultmanUiIdentity {
  return value === 'bases' ||
    value === 'outline' ||
    value === 'bookmarks' ||
    value === 'native'
    ? value
    : 'native';
}

function normalizeThemePresetId(value: unknown): ThemePresetId {
  return typeof value === 'string' && value.length > 0 ? value : 'vaultman';
}

function normalizeCustomPresetsArray(value: unknown): ThemePreset[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeCustomPreset)
    .filter((p): p is ThemePreset => p !== null);
}

export function normalizeElasticUiSettings(raw: unknown): ElasticUiSettings {
  const src =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    mode: normalizeMode(src.mode),
    identity: normalizeIdentity(src.identity),
    faintModeEnabled: src.faintModeEnabled === true,
    reducedMotion: src.reducedMotion === true,
    foulDetection: src.foulDetection === true,
    themePresetId: normalizeThemePresetId(src.themePresetId),
    customPresets: normalizeCustomPresetsArray(src.customPresets),
  };
}
```

`themePresetId` and `customPresets` are required interface fields with defaults provided by `DEFAULT_ELASTIC_UI_SETTINGS`. The normalizer fills defaults for missing or invalid input.

## `VaultmanSettings` — fields removed in 0-B

```typescript
// src/types/typeSettings.ts (post-0-B excerpt)

export interface VaultmanSettings {
  // REMOVED in 0-B:
  // - layoutTheme: LayoutTheme;
  // - islandBackdropBlur: boolean;
  // - glassBlurIntensity: number;

  toolbarSearchMode: 'island' | 'inline';
  islandDismissOnOutsideClick: boolean;
  faintAccentsWhenWorkspaceFocused: boolean;

  /** REQUIRED (was optional). */
  elasticUi: ElasticUiSettings;

  // … other unchanged fields (defaultPropertyType, filterTemplates,
  //   sessionFilePath, explorer*, mouseGestures, etc.) …
}
```

`updateGlassBlur(): void` method declaration is also removed from the interface (was at `typeSettings.ts:141`).

```typescript
// DEFAULT_SETTINGS excerpt
export const DEFAULT_SETTINGS: VaultmanSettings = {
  // legacy theme defaults REMOVED:
  // layoutTheme: 'default',
  // islandBackdropBlur: false,
  // glassBlurIntensity: 15,

  toolbarSearchMode: 'island',
  islandDismissOnOutsideClick: true,
  faintAccentsWhenWorkspaceFocused: false,
  elasticUi: { ...DEFAULT_ELASTIC_UI_SETTINGS },

  // … other unchanged defaults …
};
```

## `main.ts` — load/save changes

### `loadSettings()`

```typescript
async loadSettings(): Promise<void> {
  const saved = (await this.loadData()) ?? {};
  this.settings = { ...DEFAULT_SETTINGS, ...saved };
  this.settings.elasticUi = normalizeElasticUiSettings(saved.elasticUi);
  // Other normalizations preserved as-is.

  // REMOVED:
  // this.settings.layoutTheme = normalizeLayoutTheme(saved.layoutTheme);
}
```

### `saveSettings()`

```typescript
async saveSettings(): Promise<void> {
  if (this.themeService) {
    this.settings.elasticUi.themePresetId = this.themeService.activePresetId;
    this.settings.elasticUi.customPresets = [...this.themeService.customPresets];
  }
  await this.saveData(this.settings);
}
```

### `onload` / construct

```typescript
async onload(): Promise<void> {
  await this.loadSettings();
  this.themeService = new ThemeService();
  this.themeService.hydrate(this.settings.elasticUi);

  // REMOVED:
  // this.updateGlassBlur();

  // … rest of onload unchanged …
}
```

### `onunload`

```typescript
async onunload(): Promise<void> {
  this.themeService?.dispose();   // NEW — removes runtime <style> element
  // … rest unchanged …
}
```

### `updateGlassBlur()` method

DELETED in its entirety. The method was:

```typescript
updateGlassBlur(): void {
  const intensity: number = this.settings.glassBlurIntensity ?? 60;
  const px = (intensity / 100) * 20;
  const body = activeDocument.body;
  body.style.setProperty('--vm-glass-blur', `${px}px`);
  applyVaultmanTheme(body, this.settings);
}
```

Its consumers also lose their calls:

- `main.ts:147` `this.updateGlassBlur()` after hydrate — removed.
- `SettingsUI.svelte:97` `plugin.updateGlassBlur()` — removed (along with the glass slider UI).

## `SettingsUI.svelte` — controls removed

- Legacy `layoutTheme` dropdown — removed.
- Glass blur slider — removed.
- Island backdrop toggle — removed.
- Any mock or test references in `test/component/settingsUI.test.ts` are cleaned up correspondingly.

The Settings UI loses three controls. The new preset selector that replaces them is **out of scope** for 0-B (sub-system "Settings UI refresh"). Until that lands, users switch presets by editing `data.json`.
This is documented as known UI degradation in [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/09-risks-and-open-items|Sec 9 O1]].

## `data.json` — before and after

### Before (pre-0-B)

```jsonc
{
  "layoutTheme": "polish",
  "glassBlurIntensity": 15,
  "islandBackdropBlur": false,
  "faintAccentsWhenWorkspaceFocused": false,
  "elasticUi": {
    "mode": "thin",
    "identity": "native",
    "faintModeEnabled": false,
    "reducedMotion": false,
    "foulDetection": false
  },
  // … other settings …
}
```

### After (post-0-B)

```jsonc
{
  "faintAccentsWhenWorkspaceFocused": false,
  "elasticUi": {
    "mode": "thin",
    "identity": "native",
    "faintModeEnabled": false,
    "reducedMotion": false,
    "foulDetection": false,
    "themePresetId": "vaultman",
    "customPresets": []
  },
  // … other settings …
}
```

Three keys removed at top level (`layoutTheme`, `glassBlurIntensity`, `islandBackdropBlur`). Two keys added inside `elasticUi` (`themePresetId`, `customPresets`).

### Custom preset example (user authors manually)

```jsonc
{
  "elasticUi": {
    "mode": "thin",
    "identity": "native",
    "faintModeEnabled": false,
    "reducedMotion": false,
    "foulDetection": false,
    "themePresetId": "native-with-dock",
    "customPresets": [
      {
        "source": "custom",
        "id": "native-with-dock",
        "displayName": "Native + dock",
        "extends": "native",
        "useNativeDom": true,
        "chrome": {
          "popupBgOpacity": 1,
          "popupBackdropBlur": "0px",
          "popupBgTint": 0
        },
        "density": {
          "rowHeight": "26px",
          "rowPaddingY": "2px",
          "iconSize": "14px"
        },
        "dock": { "visible": true, "presentation": "drawer" },
        "tabs": { "visible": false, "presentation": "hidden", "kind": "workspace" },
        "toolbar": { "buttons": "core" },
        "viewModes": ["tree", "list"],
        "nodeElements": {
          "icon": true, "label": true, "detail": false, "media": false,
          "badges": {
            "ops": false, "filters": false, "warnings": true,
            "inherited": false, "counts": false
          },
          "actions": false
        },
        "lockNodeElementVisibility": false
      }
    ]
  }
}
```

This custom preset:

- Starts from `native` (records via `extends`).
- Same DOM emission (`useNativeDom: true`) and chrome/density as native.
- BUT enables the dock (`dock.visible: true`, presentation `'drawer'`).
- Unlocks node-element visibility so user can toggle via `btnNodeElementsVisibility` (once Sub-system 0-A wires it).

The user activates by setting `themePresetId: "native-with-dock"` at top of `elasticUi`.
