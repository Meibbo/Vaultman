---
title: Consumer wiring scope
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B serviceTheme + token layer]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - explorer/theme
---

# Consumer Wiring Scope

Explicit table separating preset fields wired in 0-B (consumers read
effectively) vs declare-only (field exists, no consumer reads yet).

## Wired in 0-B

### `activePreset.useNativeDom`

Consumers that already read it (no wiring changes; only the derivation
source within `ThemeService` changes):

| File | Line | Code |
|---|---|---|
| `src/components/views/viewTree.svelte` | 167 | `const useNativeDom = $derived(themeService?.useNativeDom ?? false);` |
| `src/components/views/ViewNodeTable.svelte` | 117 | same |
| `src/components/views/ViewNodeCards.svelte` | 118 | same |
| `src/components/views/ViewNodeGrid.svelte` | 155 | same |
| `src/components/views/viewOutlineExplorer.svelte` | 14 | `const useNativeDom = $derived(themeService.useNativeDom);` |

Internally, the `ThemeService.useNativeDom` getter changes from:

```typescript
get useNativeDom(): boolean {
  return this.mode === 'thin' || this.identity === 'native';
}
```

to:

```typescript
get useNativeDom(): boolean {
  return this.activePreset.useNativeDom;
}
```

The getter signature is preserved; view component consumers do not
change. **However**, the default fresh-install behavior changes: pre-0-B
defaults (`mode='thin'`, `identity='native'`) produced
`useNativeDom = true`; post-0-B default (`themePresetId='vaultman'`)
produces `useNativeDom = false` because `PRESET_VAULTMAN.useNativeDom`
is `false`.

This is the **intentional** "install plugin → see plugin" UX. The
`native` preset is opt-in for users seeking core-equivalent disguise.
Documented as accepted behavior change in
[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/09-risks-and-open-items|Sec 9 R7]].

### `activePreset.chrome.*` — via CSS vars

Consumer: `src/styles/popup/_islands.scss` after modifications in
[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/05-scss-and-dom-binding|Sec 5]].

Reads `--vm-popup-bg-opacity`, `--vm-popup-backdrop-blur`,
`--vm-popup-bg-tint` from the cascade. No TS code reads `chrome.*`
directly.

### `activePreset.density.*` — via CSS vars

Consumers: `_virtual-list.scss`, `_tree.scss` after modifications.

Read `--vm-row-height`, `--vm-row-padding-y`, `--vm-icon-size` from the
cascade. No TS code reads `density.*` directly.

### `activePreset.id` — via `rootClasses`

Consumer: `src/components/frame/frameVaultman.svelte:619`.

```typescript
const elasticRootClasses = $derived(plugin.themeService.rootClasses.join(' '));
```

Already in place. The string array now contains an additional element
(`vm-theme-{id}`) but the consumer is byte-identical.

### `preset.source` — via `registerCustomPreset` validation

Used internally by `ThemeService.registerCustomPreset` to reject
`source !== 'custom'` registrations. Test-asserted.

## Declare-only in 0-B

These fields exist in `ThemePreset`. They have values in built-ins. No
runtime code consumes them in 0-B. Each row identifies the future
sub-system that will wire the consumer.

| Field | Future consumer | Sub-system |
|---|---|---|
| `dock.visible`, `dock.presentation` | `frameVaultman.svelte` + `serviceLayout` | "Layout extension" |
| `tabs.visible`, `tabs.presentation`, `tabs.kind` | `frameVaultman.svelte` + `serviceLayout` | "Layout extension" |
| `toolbar.buttons` | `frameVaultman.svelte`, `pageTools.svelte` | "Toolbar contract" |
| `viewModes` | `panelExplorer.svelte` view-mode switch + `overlayViewMenu.svelte` | 0-A View Feature Contract |
| `nodeElements.icon/label/detail/media/badges/actions` | View component row anatomy + Explorer Decoration Module | 0-A + Explorer Platform Pass |
| `lockNodeElementVisibility` | `overlayViewMenu.svelte` btnMultiSelection visibility | 0-A |
| `unload` | `serviceUnload` instance + `main.ts` onload sequencing | J (Phase 3) |
| `colors` | Color governance render layer | "Color governance" |
| `layout` | Theme Builder placement engine | "Theme Builder" |
| `workspaceId` | `explorerWorkspaces` provider + activation hook | "Workspaces provider" |
| `extends` | Theme Builder UI (informational) | "Theme Builder" |
| `displayName` | Settings UI preset selector | "Settings UI refresh" |

## User-visible behavior matrix

For each combination of (active preset, wiring state), what does the user
see?

### Fresh install — default preset `vaultman`

| Aspect | Behavior |
|---|---|
| DOM emission | `.vm-*` only (matches pre-0-B default behavior). |
| Popup chrome | semi-translucent (0.92 opacity), 4px backdrop blur. Visually similar to old `polish` theme. |
| Row density | 32px, 4px padding, 16px icons. Similar to pre-0-B. |
| Dock | visible (no consumer wired; preset says `visible: true` but irrelevant). |
| Tabs | visible (same). |
| Toolbar | full vm buttons (same; `toolbar.buttons: 'full'` not consumed yet). |
| View modes available | 5 in view menu (markmap excluded by 0-H). `viewModes: [...]` not consumed yet. |
| Node element visibility | full row anatomy visible; media slot off by default (already today). |

### User switches to `native`

| Aspect | Behavior |
|---|---|
| DOM emission | `.nav-file`, `.tree-item`, `.metadata-property`, etc. emit (community snippets paint Vaultman rows). |
| Popup chrome | opaque, no blur. Matches Obsidian core. |
| Row density | 26px, 2px padding, 14px icons. Compact. |
| Dock | STILL visible (consumer not wired in 0-B). |
| Tabs | STILL visible. |
| Toolbar | STILL full vm buttons (declare-only `'core'`). |
| View modes available | STILL 5 in view menu (not filtered by `preset.viewModes: ['tree']`). |
| Node element visibility | STILL shows actions/details/badges (declare-only `nodeElements: {…}`). |
| btnMultiSelection | STILL visible (declare-only `lockNodeElementVisibility: true`). |

The disguise is **partial** in 0-B. The most user-facing parts (DOM, chrome,
density) work; the structural cuts (dock/tabs/toolbar/viewMode/element
visibility) require Sub-system 0-A and Layout/Toolbar extensions.

This is the intentional foundation→ladder shape. 0-B does not over-deliver
to keep diff size manageable and 0-A's surface area predictable.

## Dataflow diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  data.json                                                       │
│    elasticUi.themePresetId = 'vaultman'                          │
│    elasticUi.customPresets[] = []                                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼ hydrate(settings)
┌─────────────────────────────────────────────────────────────────┐
│  ThemeService                                                    │
│    activePresetId = 'vaultman'                                   │
│    customPresets = []                                            │
│    activePreset → PRESET_VAULTMAN                                │
│    useNativeDom → false                                          │
│    rootClasses → ['vm-root','vm-mode-thin','vm-id-native',       │
│                   'vm-theme-vaultman']                           │
└─────────────────────────────────────────────────────────────────┘
       │                       │                         │
       ▼ via prop drilling     ▼ via rootClasses         ▼ on register/update
┌─────────────────┐  ┌───────────────────────┐  ┌────────────────────────┐
│ View components │  │ frameVaultman.svelte  │  │ #syncCustomStyles      │
│  read           │  │   :619                │  │   appends <style data- │
│  useNativeDom   │  │   class={elasticRoot- │  │   vm-theme-presets=    │
│  shortcut       │  │   Classes}            │  │   "custom"> to <head>  │
│                 │  │   → DOM .vm-root      │  │                        │
│ Conditional     │  │   .vm-theme-vaultman  │  │ Body element receives  │
│ emit nav-file,  │  │                       │  │ runtime tokens for     │
│ tree-item, etc. │  │                       │  │ each custom preset id  │
└─────────────────┘  └───────────────────────┘  └────────────────────────┘
                                │
                                ▼ SCSS cascade resolves vars
┌─────────────────────────────────────────────────────────────────┐
│  _theme-presets.scss (built-in)                                  │
│    .vm-theme-vaultman { --vm-popup-bg-opacity: 0.92; … }         │
│                                                                  │
│  _islands.scss reads vars via var() → paint                      │
│  _virtual-list.scss reads var(--vm-row-height) → row height      │
└─────────────────────────────────────────────────────────────────┘
```

## Tests assert the wiring

[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/08-testing-strategy|Sec 8]]
details. Quick summary of what is asserted:

- `useNativeDom` returns `false` after `setPreset('vaultman')` and
  `true` after `setPreset('native')`.
- `rootClasses` contains `vm-theme-vaultman` after switching to vaultman,
  and contains `vm-theme-native` (without vaultman) after switching to
  native.
- Custom preset registration injects a `<style data-vm-theme-presets="custom">`
  element with the encoded id selector.
- Built-in preset constants are validated against invariants.

No test asserts that the dock/tabs/toolbar/viewMode filter applies, since
0-B does not wire those consumers.
