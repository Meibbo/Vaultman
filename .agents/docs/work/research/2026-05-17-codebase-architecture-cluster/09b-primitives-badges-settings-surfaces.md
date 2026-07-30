---
title: Primitives badges settings surfaces
type: research-shard
status: complete
parent: "[[09-residual-src-support-layer|Residual src support layer]]"
created: 2026-05-17T18:55:00
updated: 2026-05-17T18:55:00
tags:
  - agent/research
  - architecture
  - primitives
  - badges
  - settings
created_by: codex
updated_by: codex
---

# Primitives Badges Settings Surfaces

## Primitives

| File | Role | Primary consumers |
| --- | --- | --- |
| `Badge.svelte` | Small label badge with CSS variables. | Generic UI. |
| `BtnSquircle.svelte` | Icon-only Obsidian `setIcon` button. | Reusable tool buttons. |
| `Dropdown.svelte` | Bindable select wrapper. | `SettingsUI`. |
| `TextInput.svelte` | Bindable text input wrapper. | `SettingsUI`. |
| `Toggle.svelte` | Bindable checkbox switch. | `SettingsUI`. |
| `HighlightText.svelte` | Text segmentation with `<mark>`. | `viewTree.svelte`. |
| `IndicatorOrbitingInk.svelte` | Loading indicator. | `viewEmptyLanding.svelte`. |
| `PrimitiveFab.svelte` | Nav FAB with mouse gesture service and count badge. | `navbarDock`, component FAB tests. |
| `boxSearch.svelte` | Legacy popup file/folder search fields. | `layoutOverlay`. |
| `dropDScope.svelte` | Legacy operation-scope popup. | `layoutOverlay`. |

`PrimitiveFab` is the most coupled primitive. It imports i18n, badge descriptors, `FabDef`, and mouse gesture merging. It handles primary, double-click, alt-click, and middle-click routes through `serviceMouse`.

## Badge Service

`src/badges/serviceBadge.ts` defines the badge taxonomy:

- Badge kinds: set, rename, convert, delete, filter, node-note.
- FAB badge kinds: queue and filters.
- Order: set -> rename -> convert -> delete -> filter -> node-note.
- Hover badge visibility skips active badges and collapses to filter when a delete badge is active.
- Delete with set/rename/convert is detected as a warning contradiction.
- Operation and node-badge descriptors can be mapped back into badge kinds.

Consumers include Explorer view hover badges, badge bubbling utilities, `PrimitiveFab`, and component tests around FAB counts/click weights.

## Settings UI

`src/components/settings/SettingsUI.svelte` is the declarative settings tab.

- IN: `iVaultmanPlugin`, `plugin.settings`, `plugin.app`, translation keys, layout normalization, operation-scope normalization, mouse action resolution, elastic UI defaults/normalization, and reusable controls.
- OUT: mutates `plugin.settings` via `Object.assign(...$state.snapshot(s))` and calls `plugin.saveSettings()`.
- Important side effect: toggles `vm-bases-column-separators` on `activeDocument.body`.
- It intentionally uses targeted handlers instead of a blanket autosave effect;
  component tests cover the historical `effect_update_depth_exceeded` regression.

`src/components/settings/settingsLeafToggle.svelte` is a Tools page support control that toggles every `ALL_TAB_IDS` entry through `LeafDetachService`.

## Risk Notes

- General primitives are small, but `PrimitiveFab`, `boxSearch`, and `dropDScope` are app-specific. Treat them as layout primitives, not neutral design-system primitives.
- `SettingsUI` is broad and writes many settings directly. Refactors should be test-first because settings migration, UI mount behavior, and save semantics are already covered by tests.
