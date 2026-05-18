---
title: ThemePreset type and ThemeService API contract
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B serviceTheme + token layer]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - explorer/theme
---

# `ThemePreset` Type And `ThemeService` API Contract

## ThemePreset type — exhaustive contract

Every dimension a preset may eventually vary across is declared here, even
the ones 0-B does not wire. Future sub-systems extend consumers, not the
shape.

```typescript
// src/types/typeThemePreset.ts

export type ThemePresetId = string;
export type ThemePresetSource = 'built-in' | 'custom';

/**
 * View modes a preset may expose. 'markmap' is deliberately absent —
 * Map is deferred to a future dedicated spec per the view platform
 * architecture handoff.
 */
export type ExplorerViewMode = 'tree' | 'table' | 'grid' | 'cards' | 'list';

export interface ChromeTokens {
  /** 0..1. Native preset = 1 (opaque). Vaultman = 0.92 (slight transparency). */
  popupBgOpacity: number;
  /** CSS length. Native = '0px'. Glass-like presets = '12px' typical. */
  popupBackdropBlur: string;
  /** Background tint mix (0..1 as a multiplier). Default 0 (no tint). */
  popupBgTint: number;
}

export interface DensityTokens {
  /** CSS length. Row height base. Native ≈ 26px, Vaultman ≈ 32px. */
  rowHeight: string;
  /** CSS length. Vertical padding inside row. */
  rowPaddingY: string;
  /** CSS length. Leading icon/visual size. */
  iconSize: string;
}

export interface NodeElementVisibility {
  icon: boolean;
  label: boolean;
  detail: boolean;
  /**
   * Primary image/media slot. Defaults false in every built-in preset per
   * the view platform architecture handoff — nodes already have icons.
   * Custom presets MAY set true, but `normalizeCustomPreset` enforces
   * `false` on import unless the future Theme Builder explicitly opts in.
   */
  media: boolean;
  badges: {
    ops: boolean;
    filters: boolean;
    warnings: boolean;
    inherited: boolean;
    counts: boolean;
  };
  actions: boolean;
}

export type DockPresentation =
  | 'bar'
  | 'drawer'
  | 'pill-fab'
  | 'accordion'
  | 'hidden';

export type TabsPresentation =
  | 'top-tabs'
  | 'drawer'
  | 'overlay'
  | 'island'
  | 'hidden';

export type TabsKind =
  | 'workspace'
  | 'modal'
  | 'status-bar-island'
  | 'embedded';

export type ToolbarButtonSet = 'core' | 'full' | readonly string[];

export interface DockSettings {
  visible: boolean;
  presentation: DockPresentation;
}

export interface TabsSettings {
  visible: boolean;
  presentation: TabsPresentation;
  kind: TabsKind;
}

export interface ToolbarSettings {
  buttons: ToolbarButtonSet;
}

/**
 * Color governance knobs. Defer to future sub-system "Color governance"
 * which generates a snippet `.css` file as output. Built-ins do not
 * populate this field.
 */
export interface ColorKnobMap {
  zebraRows?: boolean;
  rainbowNodes?: 'off' | 'manual' | 'auto-hsv';
  accentOverride?: string; // CSS color
  custom?: Record<string, string>; // free-form CSS-var overrides
}

/**
 * Layout placement map. Defer to future sub-system "Theme Builder" which
 * provides DnD-driven editor. Built-ins do not populate.
 */
export interface LayoutPlacementMap {
  mode?: 'fixed' | 'squared-grid' | 'free-drag';
  placements?: Record<
    string,
    {
      region: string;
      width?: number;
      height?: number;
      order?: number;
    }
  >;
}

export interface ThemePreset {
  // ===== Identity =====

  source: ThemePresetSource;
  id: ThemePresetId;
  displayName: string;
  /** Informational only; custom presets that started from a built-in
   *  template record the template id here. Not enforced. */
  extends?: ThemePresetId;

  // ===== Wired in 0-B =====

  /** Forces native DOM class emission. Read by view components via
   *  `themeService.useNativeDom` shortcut. */
  useNativeDom: boolean;

  /** Popup chrome tokens. Consumed by `_islands.scss` via CSS vars. */
  chrome: ChromeTokens;

  /** Row density tokens. Consumed by `_virtual-list.scss`,
   *  `_tree.scss` via CSS vars. */
  density: DensityTokens;

  // ===== Declared in 0-B, declare-only (consumers wire later) =====

  /** Dock surface settings. Sub-system Layout extension wires. */
  dock: DockSettings;

  /** Tabs surface settings. Sub-system Layout extension wires. */
  tabs: TabsSettings;

  /** Toolbar button set. Sub-system Toolbar contract wires. */
  toolbar: ToolbarSettings;

  /** Which view modes the preset exposes. Sub-system 0-A View Feature
   *  Contract wires (filters panelExplorer + overlayViewMenu). */
  viewModes: readonly ExplorerViewMode[];

  /** Per-element visibility defaults. Sub-system 0-A wires. */
  nodeElements: NodeElementVisibility;

  /** If true, user's btnMultiSelection control cannot override
   *  nodeElements (native preset = true; vaultman = false).
   *  Sub-system 0-A wires. */
  lockNodeElementVisibility: boolean;

  // ===== Future seams — declare-only, undefined in built-ins =====

  /** Internal/community plugin ids to unload while preset active.
   *  Sub-system J (Phase 3) wires. */
  unload?: readonly string[];

  /** Color governance overrides. Generates snippet on save.
   *  Sub-system "Color governance" wires. */
  colors?: ColorKnobMap;

  /** Theme builder placement engine map.
   *  Sub-system "Theme Builder" wires. */
  layout?: LayoutPlacementMap;

  /** Workspace name to load on preset activate.
   *  Sub-system "Workspaces provider" wires. */
  workspaceId?: string;
}
```

## Invariants

1. `source === 'built-in'` presets are `as const` constants in code. They
   are never serialized, persisted, or edited. Runtime register API
   rejects attempts.
2. `source === 'custom'` presets are persisted in
   `data.json` under `elasticUi.customPresets[]`. They are fully editable
   field-by-field by the user (manually today; via Theme Builder UI
   later).
3. `nodeElements.media === false` in every built-in preset (media
   defaults off per view platform architecture handoff).
4. `viewModes` never includes `'markmap'` in built-in presets (Map
   deferred). Customs may include it once a future Map iteration ships
   and re-enables it.
5. `lockNodeElementVisibility === true` in `PRESET_NATIVE` (rigid
   disguise). `false` in `PRESET_VAULTMAN`.
6. Optional fields (`unload`, `colors`, `layout`, `workspaceId`,
   `extends`) are undefined in built-ins.
7. Built-in preset ids (`'native'`, `'vaultman'`) are reserved. Custom
   presets MUST NOT use these ids; `registerCustomPreset` rejects.

## Type guards and normalizers

```typescript
// src/types/typeThemePreset.ts (continued)

const BUILT_IN_IDS: ReadonlySet<ThemePresetId> = new Set(['native', 'vaultman']);

export function isBuiltInPreset(p: ThemePreset): boolean {
  return p.source === 'built-in';
}

/**
 * Validates a raw value as a custom preset. Returns null on any failure.
 * Enforces invariants — `media: false`, no `'markmap'` in `viewModes`,
 * `source === 'custom'`, id not in BUILT_IN_IDS.
 *
 * Defaults are filled for any missing optional field; required fields
 * with invalid types cause rejection (null return).
 */
export function normalizeCustomPreset(raw: unknown): ThemePreset | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  if (r.source !== 'custom') return null;
  if (typeof r.id !== 'string' || r.id.length === 0) return null;
  if (BUILT_IN_IDS.has(r.id)) return null;
  if (typeof r.displayName !== 'string') return null;

  if (typeof r.useNativeDom !== 'boolean') return null;

  const chrome = normalizeChrome(r.chrome);
  if (!chrome) return null;

  const density = normalizeDensity(r.density);
  if (!density) return null;

  const dock = normalizeDock(r.dock);
  const tabs = normalizeTabs(r.tabs);
  const toolbar = normalizeToolbar(r.toolbar);
  const viewModes = normalizeViewModes(r.viewModes);
  const nodeElements = normalizeNodeElements(r.nodeElements);

  return {
    source: 'custom',
    id: r.id,
    displayName: r.displayName,
    extends: typeof r.extends === 'string' ? r.extends : undefined,

    useNativeDom: r.useNativeDom,
    chrome,
    density,

    dock,
    tabs,
    toolbar,
    viewModes,
    nodeElements,
    lockNodeElementVisibility: r.lockNodeElementVisibility === true,

    unload: Array.isArray(r.unload)
      ? r.unload.filter((x): x is string => typeof x === 'string')
      : undefined,
    colors: normalizeColors(r.colors),
    layout: normalizeLayout(r.layout),
    workspaceId: typeof r.workspaceId === 'string' ? r.workspaceId : undefined,
  };
}

// Helpers `normalizeChrome`, `normalizeDensity`, etc. apply defaults and
// reject invalid CSS values. `normalizeViewModes` strips 'markmap'
// silently. `normalizeNodeElements` forces media=false.
```

## ThemeService API

```typescript
// src/services/serviceTheme.svelte.ts

import type {
  ThemePreset,
  ThemePresetId,
} from '../types/typeThemePreset';
import type {
  ElasticUiSettings,
  VaultmanUiMode,
  VaultmanUiIdentity,
} from '../types/typeElasticUi';
import {
  PRESET_NATIVE,
  PRESET_VAULTMAN,
  BUILT_IN_PRESETS,
} from '../config/themePresetsBuiltin';
import { normalizeCustomPreset } from '../types/typeThemePreset';

const BUILT_IN_IDS = new Set<ThemePresetId>(['native', 'vaultman']);

export class ThemeService {
  // ===== Runes state =====

  activePresetId = $state<ThemePresetId>('vaultman');
  customPresets = $state<readonly ThemePreset[]>([]);

  /** Legacy orthogonal axes — survive 0-B unchanged. */
  mode = $state<VaultmanUiMode>('thin');
  identity = $state<VaultmanUiIdentity>('native');
  faintModeEnabled = $state(false);
  reducedMotion = $state(false);
  windowFocused = $state(true);
  foulDetection = $state(false);

  // ===== Derived public reads =====

  get activePreset(): ThemePreset {
    if (this.activePresetId === 'native') return PRESET_NATIVE;
    if (this.activePresetId === 'vaultman') return PRESET_VAULTMAN;
    const custom = this.customPresets.find(p => p.id === this.activePresetId);
    return custom ?? PRESET_VAULTMAN;
  }

  get availablePresets(): readonly ThemePreset[] {
    return [...BUILT_IN_PRESETS, ...this.customPresets];
  }

  get useNativeDom(): boolean {
    return this.activePreset.useNativeDom;
  }

  get faintActive(): boolean {
    return this.faintModeEnabled && !this.windowFocused;
  }

  get useUtilities(): boolean {
    return this.mode !== 'thin';
  }

  /** Root classes for `.vm-root` container. Consumed by
   *  `frameVaultman.svelte:619`.
   *
   *  The active preset id is css-escaped to match the selector emitted
   *  by `#syncCustomStyles()` for custom presets. Built-in ids
   *  ('native', 'vaultman') are already CSS-safe; only custom ids with
   *  special characters need encoding. */
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

  // ===== Writes =====

  setPreset(id: ThemePresetId): void {
    if (!this.availablePresets.some(p => p.id === id)) {
      this.activePresetId = 'native';
      return;
    }
    this.activePresetId = id;
  }

  registerCustomPreset(preset: ThemePreset): void {
    if (preset.source !== 'custom') return;
    if (BUILT_IN_IDS.has(preset.id)) return;
    const next = this.customPresets.filter(p => p.id !== preset.id);
    this.customPresets = [...next, preset];
    this.#syncCustomStyles();
  }

  unregisterCustomPreset(id: ThemePresetId): void {
    const before = this.customPresets.length;
    this.customPresets = this.customPresets.filter(p => p.id !== id);
    if (this.customPresets.length === before) return;
    if (this.activePresetId === id) this.activePresetId = 'native';
    this.#syncCustomStyles();
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
    this.#syncCustomStyles();
  }

  hydrate(settings: ElasticUiSettings): void {
    this.mode = settings.mode;
    this.identity = settings.identity;
    this.faintModeEnabled = settings.faintModeEnabled;
    this.reducedMotion = settings.reducedMotion;
    this.foulDetection = settings.foulDetection;

    this.activePresetId = settings.themePresetId ?? 'vaultman';
    this.customPresets = (settings.customPresets ?? [])
      .map(normalizeCustomPreset)
      .filter((p): p is ThemePreset => p !== null);

    this.#syncCustomStyles();
  }

  // Called by main.ts on plugin unload — DOM cleanup.
  dispose(): void {
    this.#styleEl?.remove();
    this.#styleEl = null;
  }

  // ===== Private =====

  #styleEl: HTMLStyleElement | null = null;

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

  #cssEscape(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '-');
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
}
```

## Public surface size

- Reads: 6 getters (`activePreset`, `availablePresets`, `useNativeDom`,
  `faintActive`, `useUtilities`, `rootClasses`).
- Writes: 5 methods (`setPreset`, `registerCustomPreset`,
  `unregisterCustomPreset`, `updateCustomPreset`, `hydrate`) plus
  `dispose()` for unload cleanup.
- Mutable runes state: 8 fields (4 new for 0-B, 4 preserved).

This is the entire public API. Internals — including the runtime style
element and CSS sanitization — are private fields/methods.
