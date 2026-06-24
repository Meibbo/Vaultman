---
title: Context and motivation
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B serviceTheme + token layer]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - explorer/theme
---

# Context And Motivation

## Why this spec exists

Vaultman ships two parallel, disconnected theme systems. They were captured
in the research record as the single highest-leverage Phase 0 foundation
deliverable because every subsequent sub-system depends on a coherent theme
state.

`src/services/serviceTheme.ts` (49 LOC) is a pure-function module that
defines `LayoutTheme = 'default' | 'polish' | 'glass' | 'custom'`,
`LAYOUT_THEME_OPTIONS`, `normalizeLayoutTheme(value)`, and
`applyVaultmanTheme(body, settings)`. The function toggles
`vm-theme-{default|native|polish|glass|custom}` and four orthogonal flags
(`vm-island-backdrop-enabled`, `vm-faint-accents-workspace-focus`,
`vm-node-backgrounds-off`, `vm-node-borders-off`) on `<body>`. It is called
exactly once at `main.ts:393` from inside `updateGlassBlur()`, after
writing `--vm-glass-blur` to the body inline style.

`src/services/serviceTheme.svelte.ts` (43 LOC) is a runes class
`ThemeService` with `mode`/`identity` state, `useUtilities`,
`useNativeDom`, `rootClasses`, and a `hydrate(settings)` method. It writes
classes via `frameVaultman.svelte:619` consuming
`themeService.rootClasses.join(' ')` on a `.vm-root` container. The runes
class never writes to `<body>`; the legacy class-list toggler never writes
to `.vm-root`. The two are constructed and used independently in
`main.ts:144` and `main.ts:393`.

The split creates three coupled problems:

1. **No source of truth for theme state.** Settings UI mutates
   `settings.layoutTheme` (consumed by the legacy toggler) and may also
   mutate `settings.elasticUi.mode|identity` (consumed by the runes
   service). These can diverge — for example, `layoutTheme: 'polish'` plus
   `identity: 'native'` is internally inconsistent (polish chrome on a
   native-disguise identity).
2. **`useNativeDom` derives from the wrong axis.** Today's getter
   (`mode === 'thin' || identity === 'native'`) ties native-DOM emission to
   density/identity axes that are conceptually orthogonal. A user who picks
   `mode: 'balanced'` and `identity: 'bases'` accidentally loses native-DOM
   emission. The capital-letter views' `class:nav-file={useNativeDom}` etc.
   arbitration silently flips off.
3. **`unocss-preset-theme` token layer is unbuilt.** The research called
   for adding `unocss-preset-theme` to give themes a declarative CSS-var
   contract. This sub-spec replaces that recommendation with a simpler
   SCSS-only token layer (see §5) appropriate for the small token surface
   and the SCSS-heavy codebase (~7934 LOC across 40 SCSS files).

## What changed since the research

Three inputs after the research record was authored re-shape the design:

### Input 1 — post-0-H view platform architecture handoff

[[docs/work/hardening/research/2026-05-15-explorer-view-platform-infinite-canvas/02-architecture-execution-handoff|This handoff]]
introduced two cross-cutting requirements that touch theme contract:

- **Node-element visibility contract.** When the native Obsidian preset is
  active, node-element visibility (icon, label, detail, media slot, badges,
  actions) follows the preset rigidly. When NOT native, the view menu
  `btnNodeElementsVisibility` control exposes granular per-element toggles. The
  preset must encode both the per-element visibility map and a flag that
  determines whether `btnNodeElementsVisibility` is offered. This shapes
  `ThemePreset.nodeElements` and `ThemePreset.lockNodeElementVisibility`
  fields.
- **Map (markmap view) deferred.** The current `ViewMarkmap.svelte`
  freezes Obsidian on large trees and is removed from the selectable
  view-mode menu until a dedicated future spec lands. 0-B encodes this by
  excluding `'markmap'` from built-in presets' `viewModes`.

### Input 2 — "deep modules with small interfaces"

The same handoff prescribes:

> Do not force SOLID as a checklist. Use deeper modules with small
> interfaces and high leverage.

This re-orients the service-shape choice. An earlier brainstorm pass
considered splitting into a service + registry + tokens trio (Approach 2).
The post-handoff direction favors one rich class behind a small public
API (Approach 1 — Ousterhout). This spec adopts Approach 1.

### Input 3 — clean-break settings shape

The user confirmed during brainstorm: no pre-0-B userbase exists. Legacy
fields (`layoutTheme`, `glassBlurIntensity`, `islandBackdropBlur`) are
deleted outright with no migration code, no downgrade safety, no
`@deprecated` markers. `elasticUi` becomes a required interface field and
gains `themePresetId` + `customPresets`.

## How 0-B fits in the Phase 0 ladder

```
0-H ✅ (virtualizer + list mode, completed and audited)
0-B ← THIS SPEC. serviceTheme unification + theme preset registry.
0-A    Native-DOM parity contract + View Feature Contract + in-editor
       vocabulary + node-element btnNodeElementsVisibility wiring. Reads
       preset.nodeElements, preset.lockNodeElementVisibility,
       preset.viewModes from 0-B's ThemePreset shape.
Phase 1+: Provider parity, capability depth, layout extension, theme
          builder, color governance, serviceUnload, etc.
```

0-B is the **shape-locking** spec for the Phase 0 cycle. After 0-B, every
later sub-system that needs to describe "what does this preset do" reads
from a single `ThemePreset` shape and a single `ThemeService` instance.
Adding a new preset dimension is a matter of extending the shape (one
file) and wiring one new consumer. Adding a new built-in preset is a
matter of one new `as const` object plus one SCSS block.

## Sub-systems registered to backlog from this brainstorm

The brainstorm surfaced several adjacent ambitions out of scope for 0-B
but worth preserving as separate spec candidates. Each is appended to
[[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index|explorer-ui-vision]]
during 0-B spec authorship:

- **Sub-system N — SCSS-to-UnoCSS migration (HIGH PRIORITY).** Invert
  the styling source: migrate the ~7934 LOC across 40 SCSS files to
  UnoCSS shortcuts and utility classes. Target ~90% UnoCSS, ~10% SCSS
  reserved for complex functions (color-mix patterns, geometry
  calculations, mixins that don't translate to utilities). Recommended
  to run before Bits-ui adoption (item 12) so the new components use
  UnoCSS-first composition.
- ~~Sub-system M — SCSS hygiene pass.~~ DROPPED. With ~90% of SCSS
  migrating to UnoCSS, the hygiene work is performed naturally during
  Sub-system N — what gets migrated leaves SCSS, what stays gets
  cleaned during the residual audit at N's tail.
- **Sub-system O — frameVaultman decomposition.** Split the 867-LOC god
  component (~13 mixed responsibilities) into focused
  services/components before Layout extension / Toolbar contract /
  Theme Builder sub-systems add more preset consumption to it.
- **Settings UI refresh.** Replace the deleted legacy theme controls
  with a new preset selector reading from `themeService.availablePresets`.
- **Layout extension.** Wire `preset.dock`, `preset.tabs` against
  `serviceLayout`; add modal-as-tab and status-bar-island surface kinds.
- **Toolbar contract.** Define and wire `preset.toolbar.buttons` against
  `frameVaultman.svelte` / `pageTools.svelte`.
- **Color governance.** Zebra rows, rainbow nodes, accent override UI;
  generates snippet `.css` files as output. Wires
  `preset.colors?`.
- **Snippet provider UX.** `explorerSnippets` enriched: child nodes per
  CSS class, on/off toggle per class, HSV/RGB color picker per var.
- **Workspaces provider.** `explorerWorkspaces` as a Vaultman provider
  with consumer/index/logic; wires `preset.workspaceId?`. 2:1 ambition
  over core Obsidian Workspaces (adds node-notes/media/tags/etc.).
- **Theme Builder.** UI editor for custom presets; supports duplicate
  from built-in, element-by-element edit, DnD layout placement.
- **Bits-ui adoption preset.** Custom built-in preset that swaps VM
  components for bits-ui equivalents (Popover, Dialog, Combobox, etc.).
