---
title: Built-in preset values
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B serviceTheme + token layer]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - explorer/theme
---

# Built-in Preset Values

Two `as const` constants in `src/config/themePresetsBuiltin.ts`. Inmutable at compile time and at runtime. Custom presets reference these as their `extends` template origin.

## File contents

```typescript
// src/config/themePresetsBuiltin.ts

import type { ThemePreset } from '../types/typeThemePreset';

/**
 * Native preset — chameleon disguise.
 * Mimics Obsidian core File Explorer surface:
 * - DOM emits native classes (nav-file, tree-item, metadata-property…)
 * - Single tree view only
 * - No dock, no top-tabs, no extra vm buttons
 * - Compact density matching core
 * - Element visibility locked (user btnNodeElementsVisibility hidden)
 *
 * Not the fresh-install default. Users opt in for core-equivalent
 * disguise.
 */
export const PRESET_NATIVE: ThemePreset = {
  source: 'built-in',
  id: 'native',
  displayName: 'Native',

  useNativeDom: true,

  chrome: {
    popupBgOpacity: 1,
    popupBackdropBlur: '0px',
    popupBgTint: 0,
  },

  density: {
    rowHeight: '26px',
    rowPaddingY: '2px',
    iconSize: '14px',
  },

  dock: {
    visible: false,
    presentation: 'hidden',
  },

  tabs: {
    visible: false,
    presentation: 'hidden',
    kind: 'workspace',
  },

  toolbar: {
    buttons: 'core',
  },

  viewModes: ['tree'],

  nodeElements: {
    icon: true,
    label: true,
    detail: false,
    media: false,
    badges: {
      ops: false,
      filters: false,
      warnings: true,
      inherited: false,
      counts: false,
    },
    actions: false,
  },

  lockNodeElementVisibility: true,

  // Future fields (undefined per built-in invariant):
  // unload, colors, layout, workspaceId, extends
} as const;

/**
 * Vaultman preset — full plugin layout.
 * The current rich Vaultman experience:
 * - VM-namespaced DOM classes (.vm-*)
 * - All 5 view modes (markmap deferred)
 * - Dock + top-tabs + full toolbar
 * - Comfortable density
 * - User btnNodeElementsVisibility unlocked (granular element toggles enabled)
 * - Slight chrome polish (semi-transparent + small blur)
 *
 * Fresh-install default. Install plugin → see plugin.
 */
export const PRESET_VAULTMAN: ThemePreset = {
  source: 'built-in',
  id: 'vaultman',
  displayName: 'Vaultman',

  useNativeDom: false,

  chrome: {
    popupBgOpacity: 0.92,
    popupBackdropBlur: '4px',
    popupBgTint: 0,
  },

  density: {
    rowHeight: '32px',
    rowPaddingY: '4px',
    iconSize: '16px',
  },

  dock: {
    visible: true,
    presentation: 'bar',
  },

  tabs: {
    visible: true,
    presentation: 'top-tabs',
    kind: 'embedded',
  },

  toolbar: {
    buttons: 'full',
  },

  viewModes: ['tree', 'table', 'grid', 'cards', 'list'],

  nodeElements: {
    icon: true,
    label: true,
    detail: true,
    media: false,
    badges: {
      ops: true,
      filters: true,
      warnings: true,
      inherited: true,
      counts: true,
    },
    actions: true,
  },

  lockNodeElementVisibility: false,
} as const;

export const BUILT_IN_PRESETS = [PRESET_NATIVE, PRESET_VAULTMAN] as const;
```

## Field-by-field justification — `PRESET_NATIVE`

| Field | Value | Rationale |
|---|---|---|
| `source` | `'built-in'` | Inmutable constant; runtime register API rejects modifications. |
| `id` | `'native'` | Reserved id; `registerCustomPreset` rejects collisions. |
| `displayName` | `'Native'` | Settings UI label (future sub-system). |
| `useNativeDom` | `true` | Community snippets/themes targeting `.nav-file` etc. paint Vaultman rows; the disguise primitive. |
| `chrome.popupBgOpacity` | `1` | Core Obsidian popups are opaque. |
| `chrome.popupBackdropBlur` | `'0px'` | Core does not use backdrop blur. |
| `chrome.popupBgTint` | `0` | No background tint. |
| `density.rowHeight` | `'26px'` | Approximate match to Obsidian File Explorer row height. |
| `density.rowPaddingY` | `'2px'` | Compact. |
| `density.iconSize` | `'14px'` | Core File Explorer icon size. |
| `dock.visible` | `false` | Core File Explorer has no dock. |
| `dock.presentation` | `'hidden'` | Sub-system Layout extension will read this. |
| `tabs.visible` | `false` | Core has no top-tabs vm surface. |
| `tabs.presentation` | `'hidden'` | Idem. |
| `tabs.kind` | `'workspace'` | Default kind; irrelevant when hidden. |
| `toolbar.buttons` | `'core'` | Only core-equivalent buttons (collapse-all, new-file, new-folder, sort). |
| `viewModes` | `['tree']` | Core File Explorer is tree-only. |
| `nodeElements.icon` | `true` | Core shows folder/file icon. |
| `nodeElements.label` | `true` | Core shows name. |
| `nodeElements.detail` | `false` | Core does not show metadata below title. |
| `nodeElements.media` | `false` | Defaults-off invariant per view platform handoff. |
| `nodeElements.badges.ops` | `false` | Core has no operation-pending badge. |
| `nodeElements.badges.filters` | `false` | Core has no filter system. |
| `nodeElements.badges.warnings` | `true` | Safety: critical warnings remain visible even under disguise. |
| `nodeElements.badges.inherited` | `false` | Core has no inherited-property concept. |
| `nodeElements.badges.counts` | `false` | Core does not show counts. |
| `nodeElements.actions` | `false` | Core has no inline action buttons. |
| `lockNodeElementVisibility` | `true` | User's `btnNodeElementsVisibility` is hidden — the disguise cannot be broken from the view menu. |

## Field-by-field justification — `PRESET_VAULTMAN`

| Field | Value | Rationale |
|---|---|---|
| `source` | `'built-in'` | Inmutable. |
| `id` | `'vaultman'` | Reserved id; fresh-install default. |
| `displayName` | `'Vaultman'` | Settings UI label. |
| `useNativeDom` | `false` | Emit `.vm-*` so Vaultman is identifiable in DOM. Community snippets targeting native classes do not paint Vaultman rows (expected — user picked vm aesthetic). |
| `chrome.popupBgOpacity` | `0.92` | Preserves the existing "polish"-flavored slight transparency. |
| `chrome.popupBackdropBlur` | `'4px'` | Light polish blur (less than legacy "glass" 12px). |
| `chrome.popupBgTint` | `0` | No tint (user theme controls colors). |
| `density.rowHeight` | `'32px'` | Comfortable; room for detail line + badges. |
| `density.rowPaddingY` | `'4px'` | Air around content. |
| `density.iconSize` | `'16px'` | Larger; better visibility. |
| `dock.visible` | `true` | Current vm dock visible. |
| `dock.presentation` | `'bar'` | Current vm dock bar presentation. |
| `tabs.visible` | `true` | Current vm top-tabs visible. |
| `tabs.presentation` | `'top-tabs'` | Current. |
| `tabs.kind` | `'embedded'` | Tabs render embedded in frame (vs modal/island). |
| `toolbar.buttons` | `'full'` | All vm toolbar buttons. |
| `viewModes` | `['tree', 'table', 'grid', 'cards', 'list']` | All 5 modes. `'markmap'` deliberately excluded (Map deferred). |
| `nodeElements.icon`/`label`/`detail` | all `true` | Full vm row anatomy. |
| `nodeElements.media` | `false` | Defaults-off invariant; user opt-in via btnNodeElementsVisibility. |
| `nodeElements.badges.*` | all `true` | Full vm badge set visible. |
| `nodeElements.actions` | `true` | Inline action buttons visible. |
| `lockNodeElementVisibility` | `false` | `btnNodeElementsVisibility` exposes granular element toggles to user. |

## Notes on values

- Density numbers (26/32 px row height, 14/16 px icon size) are educated guesses. Tests assert valid CSS-length format and ordering invariants (`PRESET_NATIVE.density.rowHeight < PRESET_VAULTMAN.density.rowHeight` numerically) but do not pin specific pixels — those tune during implementation against live `plugin-dev` visual inspection.
- `toolbar.buttons: 'core'` is declare-only in 0-B. Which buttons map to `'core'` vs `'full'` is defined by future Sub-system Toolbar contract;
  here we just lock the discriminator value.
- `dock`/`tabs` `visible: false` are likewise declare-only in 0-B; the dock and tabs remain visible at runtime until Sub-system Layout extension wires the filter. This is documented in [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/07-consumer-wiring-scope|Sec 7]].

## User-visible behavior in 0-B with default settings

Fresh install → `themePresetId = 'vaultman'`:

- ⚠️ `useNativeDom = false` → views emit `.vm-*` classes only.
  **Behavior change from pre-0-B**: pre-0-B fresh install had `useNativeDom = true` via the legacy `mode || identity` formula;
  post-0-B has it `false` per `PRESET_VAULTMAN.useNativeDom`. Intentional:
  install plugin → see plugin. See [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/09-risks-and-open-items|Sec 9 R7]].
- ✅ Chrome `popupBgOpacity: 0.92` + `popupBackdropBlur: '4px'` → popups semi-translucent with light blur.
- ✅ Density `rowHeight: '32px'` → comfortable rows.
- ⚠️ Dock visible (no behavior change vs today; consumer not wired).
- ⚠️ Tabs visible (no behavior change vs today; consumer not wired).
- ⚠️ All vm toolbar buttons visible (no behavior change).
- ⚠️ 5 view modes in view menu (no behavior change; markmap already excluded by 0-H).

User switches to `themePresetId = 'native'`:

- ✅ `useNativeDom = true` → views emit `.nav-file`, `.tree-item`, `.metadata-property`, etc. Community snippets/themes paint Vaultman rows.
- ✅ Chrome opaque, no blur.
- ✅ Density compact (26px rows, 14px icons).
- ❌ Dock still visible (consumer not wired in 0-B).
- ❌ Tabs still visible.
- ❌ vm toolbar buttons still visible.
- ❌ 5 view modes still in menu (no filter via `preset.viewModes` yet).

Partial disguise in 0-B is intentional. DOM emission + density + chrome land here; the structural/cosmetic cuts (dock/tabs/toolbar/viewMode filter) land in 0-A and subsequent sub-systems.
