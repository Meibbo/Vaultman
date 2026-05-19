---
title: Risks and open items
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B serviceTheme + token layer]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - explorer/theme
---

# Risks And Open Items

## Risks

### R1 — Obsidian native class names not verbatim-verified

Status: OPEN, inherits from pre-0-B.

The `class:nav-file`, `class:tree-item`, `class:metadata-property`,
`class:tag-pane-tag*` etc. emissions in view components were reconstructed
from community CSS snippets and theme repos per
[[docs/work/hardening/research/2026-05-14-explorer-libraries-and-parity-research/index|the parity research]]
§3. The research itself flags these as "high-confidence but not
verbatim-confirmed" (§6 open question 4) and recommends verification
against a live `app.css` before pixel-1:1 pursuit.

**0-B impact**: zero. 0-B does not change the class emissions. It only
changes the derivation source of the `useNativeDom` flag. Risk hereda.

**Mitigation in 0-A**: live DOM inspection in Obsidian DevTools +
`obsidian-typings` cross-reference + Notebook Navigator emission
comparison. Flag in 0-A spec as a pre-implementation verification step.

### R2 — Runtime `<style>` injection — CSS injection vector

Status: ACTIONABLE in 0-B.

`ThemeService.#syncCustomStyles()` injects user-controlled strings
(`customPreset.chrome.popupBackdropBlur`, etc.) into `document.head`. A
malicious custom preset (e.g., one downloaded from internet) could craft
values like `'}; body { display:none } /*'` to inject arbitrary CSS into
the Obsidian document.

**Mitigation**: `#sanitizeCssLength()` and `#sanitizeNumber01()` validate
each token value against strict regex patterns before injection. Any
value not matching is replaced with `'0'`. The `#cssEscape()` method also
sanitizes the preset id used in the selector.

**Coverage**: `themeServiceCustomStyleInjection.test.ts` includes the
"sanitizes malicious CSS values" test.

### R3 — Preset id collision with built-ins

Status: ACTIONABLE in 0-B.

A `data.json` custom preset with `id: 'native'` or `id: 'vaultman'` would
collide with built-ins. `availablePresets` getter returns built-ins first
(`[...BUILT_IN_PRESETS, ...this.customPresets]`), so `activePreset`
resolution honors built-ins; the custom is unreachable but persists in
state.

**Mitigation**: `registerCustomPreset` and `normalizeCustomPreset` reject
ids in `BUILT_IN_IDS` set (`'native'`, `'vaultman'`). Test asserts both
paths.

### R4 — CSS-var inheritance leakage outside `.vm-root`

Status: ACCEPTED (no action).

The `--vm-*` tokens defined on `.vm-root.vm-theme-{id}` cascade through
DOM descendants. If a future Obsidian re-parents an element into the
`.vm-root` subtree by accident (workspace layout edge cases), that
element inherits the vars. Risk is bounded by the `--vm-*` prefix —
Obsidian's own CSS does not reference `--vm-*`, so the leak is inert.

### R5 — TanStack virtualizer ignores dynamic `--vm-row-height`

Status: ACCEPTED in 0-B, flagged for Explorer Platform Pass.

View components currently set `estimateSize: () => 32` as a constant in
the TanStack virtualizer configuration. After 0-B, the CSS paint reflects
`--vm-row-height` (26px in native, 32px in vaultman) but the
virtualizer's initial estimate stays at 32. TanStack's `measureElement`
reflows post-mount; first-paint after preset switch may show row gap or
overlap for a few frames.

**Mitigation**: TanStack `measureElement` reconciles. The discrepancy is
visible only during first paint after switch — acceptable. Migrating
`estimateSize` to read `getComputedStyle(rootEl).getPropertyValue('--vm-row-height')`
is **out of 0-B scope** and belongs to the Explorer Platform Pass
sub-system.

### R6 — Body class binding removed but orthogonal SCSS may still target body

Status: KNOWN, flagged for cleanup.

`applyVaultmanTheme` toggled four body classes beyond theme name:
`vm-island-backdrop-enabled`, `vm-faint-accents-workspace-focus`,
`vm-node-backgrounds-off`, `vm-node-borders-off`. 0-B deletes the
function, so these classes no longer reach `<body>`.

- `vm-island-backdrop-enabled`: tied to deleted `islandBackdropBlur`
  setting → toggle goes away entirely, SCSS rules using it become dead.
- `vm-faint-accents-workspace-focus`: tied to preserved
  `faintAccentsWhenWorkspaceFocused` setting → SCSS rules using
  `body.vm-faint-accents-workspace-focus` silently no-op until re-bound.
- `vm-node-backgrounds-off`, `vm-node-borders-off`: tied to preserved
  `explorerNodeBackgrounds`/`explorerNodeBorders` settings → same
  problem.

**Mitigation**: A small follow-up after 0-B re-binds these on `.vm-root`
via either inclusion in `themeService.rootClasses` (extending the
getter with computed booleans) or via a thin separate binding effect in
`frameVaultman.svelte`. **Out of 0-B scope** — flagged for a small
follow-up sub-system or a 0-B implementation-task addendum if discovered
to be visually regressive during live smoke.

Verification query post-0-B:
```bash
grep -rn "body\.vm-island\|body\.vm-faint\|body\.vm-node" src/styles/
```

If matches exist, those rules are dead until re-binding lands.

### R7 — Behavior change at fresh install: `useNativeDom` flip

Status: ACCEPTED.

Pre-0-B default (`mode='thin'`, `identity='native'`,
`layoutTheme='default'`) made `useNativeDom = true` via the legacy
getter formula. Post-0-B default (`themePresetId='vaultman'`,
`PRESET_VAULTMAN.useNativeDom = false`) makes `useNativeDom = false`.

**Implication**: fresh install renders with `.vm-*` classes (NOT
`.nav-file`/`.tree-item`). Community snippets/themes targeting native
classes do not paint Vaultman rows by default. Users seeking
chameleon disguise opt into the `native` preset explicitly.

**Rationale**: per brainstorm, "install plugin → see plugin." This is
the intended UX. The native preset is opt-in for the disguise scenario.

### R8 — UI degradation without preset selector

Status: ACCEPTED with timeline dependency.

0-B deletes three UI controls from Settings (legacy `layoutTheme`
dropdown, glass blur slider, island backdrop toggle). It does **not**
add a new preset selector. Until Sub-system "Settings UI refresh"
ships, users switch presets only by editing `data.json` and reloading
the plugin.

**Mitigation**: register Sub-system "Settings UI refresh" in backlog;
prioritize after 0-A. Document in CHANGELOG and any in-app
"What's New" surface if/when one exists.

### R9 — Glass blur fine-tune lost

Status: ACCEPTED.

Deleting `glassBlurIntensity` setting (Sec 6) removes the user's ability
to fine-tune blur via a slider. Tune now happens via a custom preset's
`chrome.popupBackdropBlur` value. Until Theme Builder UI ships, this is
data.json hand-editing.

**Rationale**: clean break, no legacy dial. Built-in `vaultman` preset
provides a sensible default (`'4px'`).

## Open items deferred to other specs

### O1 — Settings UI selector for theme presets

Sub-system: **"Settings UI refresh"** (new, registered to backlog).

Builds a preset selector listing `themeService.availablePresets` with
built-in badge for built-ins, edit/delete affordances for customs.

### O2 — Theme Builder UI

Sub-system: **"Theme Builder"** (registered to backlog).

Editor for creating and editing custom presets — field-by-field UI, DnD
layout placement, variant pickers, color governance hooks.

### O3 — Sub-system 0-A — View Feature Contract + native DOM contract

Wires `preset.nodeElements`, `preset.lockNodeElementVisibility`,
`preset.viewModes` from 0-B's shape against `panelExplorer.svelte`,
`overlayViewMenu.svelte`, and view components. Also delivers the
`btnNodeElementsVisibility` granular element-toggle control.

### O4 — Sub-system "Layout extension"

Wires `preset.dock.*`, `preset.tabs.*` against `serviceLayout` and
`frameVaultman.svelte`. Adds modal-as-tab and status-bar-island surface
kinds.

### O5 — Sub-system "Toolbar contract"

Defines what `toolbar.buttons: 'core' | 'full' | string[]` means
concretely; wires consumers in `frameVaultman.svelte` and
`pageTools.svelte`.

### O6 — Sub-system J (serviceUnload)

Phase 3. Wires `preset.unload[]`. Heavy risk surface (internal-plugin
disable, workspace.onLayoutReady gating, capture-phase interception).

### O7 — Sub-system "Color governance"

Wires `preset.colors?`. Zebra rows, rainbow nodes, accent override UI
with HSV/RGB color picker; output is generated snippet `.css` file.

### O8 — Sub-system "Snippet provider UX"

Enhanced `explorerSnippets`: child nodes per CSS class, on/off per
class, color picker per CSS var. Independent of preset shape but uses
the same color-knob mental model.

### O9 — Sub-system "Workspaces provider"

`explorerWorkspaces` provider with consumer/index/logic. 2:1 ambition
over core Obsidian Workspaces (adds node-notes/media/tags/search/bulk).
Wires `preset.workspaceId?`.

### O10 — ~~Sub-system M — SCSS hygiene pass~~ (DROPPED)

Dropped during mid-brainstorm pivot. With Sub-system N migrating ~90%
of SCSS to UnoCSS, the hygiene goal is achieved naturally: what
migrates leaves SCSS; what stays gets cleaned as part of N's residual
audit at completion. No standalone spec.

### O11 — Sub-system N — SCSS-to-UnoCSS migration (HIGH PRIORITY)

Invert the styling source. Migrate the ~7934 LOC across 40 SCSS files
to UnoCSS shortcuts and utility classes. Target ~90% UnoCSS, ~10% SCSS
reserved for complex functions (color-mix patterns, deep cascades,
mixins that don't translate cleanly to utilities).

**Priority:** HIGH. Recommended order:
- After 0-B lands (which already adopts `unocss-preset-theme` for the
  small token surface).
- Recommended before Sub-system 12 (Bits-ui adoption preset) so the
  new components use UnoCSS-first composition.
- May run in parallel with Sub-system O (frameVaultman decomposition)
  if engineer capacity allows, but coordination required because the
  same files (`frameVaultman.svelte`, child shells) are touched in
  both.

**Scope:**
- Audit all 40 SCSS files. Categorize each rule as
  (a) translatable to existing UnoCSS utilities, (b) translatable to
  new shortcuts, (c) must stay SCSS (complex function).
- For (a) + (b): rewrite consumers in `.svelte` files to apply
  UnoCSS classes; delete corresponding SCSS rules.
- For (c): keep in SCSS, document why translation is not viable.
- Output: `src/styles/` shrinks to ~10% original size. New shortcuts
  emerge in `uno.config.ts`. Consumers apply utilities + shortcuts
  inline.

**Esfuerzo:** large initiative — multi-day. Brainstorm + spec + plan
recommended; do not execute ad-hoc.

### O12 — Sub-system O — frameVaultman decomposition

Split the 867-LOC god component (~13 mixed responsibilities) into
focused services/components before Sub-system Layout extension and
Toolbar contract add more preset consumption.

### O13 — Sub-system "Bits-ui adoption preset"

Custom built-in preset that swaps VM components for bits-ui equivalents
(Popover, Dialog, Combobox, etc.). Built atop 0-B's preset registry.

### O14 — Body-class re-binding cleanup (R6)

Small follow-up sub-system to re-bind
`vm-faint-accents-workspace-focus`, `vm-node-backgrounds-off`,
`vm-node-borders-off` on `.vm-root` (or fold them into
`ThemeService.rootClasses`).

### O15 — Map (markmap view) iteration

Currently deferred per
[[docs/work/hardening/research/2026-05-15-explorer-view-platform-infinite-canvas/02-architecture-execution-handoff|view platform architecture handoff]].
Future spec adds `'markmap'` back to relevant presets' `viewModes` once
the lifecycle/infinite-canvas runtime is built.

## Open verification items

### V1 — Live verification of native DOM classes

Before 0-A pursues pixel-1:1 disguise, verify each emitted class
(`nav-file`, `nav-file-title`, `nav-folder`, `nav-folder-children`,
`tree-item`, `tree-item-self`, `tree-item-inner`, `is-collapsed`,
`mod-collapsible`, `tag-pane-tag`, `tag-pane-tag-text`,
`tag-pane-tag-count`, `metadata-property`, `metadata-property-key`,
`search-result-*`, `outline`, `collapse-icon`) against:

1. Live Obsidian DOM via DevTools inspector.
2. `obsidian-typings` GitHub repo source.
3. Notebook Navigator emission patterns.

Flag any mismatches; update view component arbitration. **0-A's
responsibility.**

### V2 — Post-implementation greps

After 0-B implementation, run:

- `grep -rn "applyVaultmanTheme" src/ test/` → zero matches.
- `grep -rn "vm-glass-blur" src/` → zero matches.
- `grep -rn "body\.vm-theme\|body \.vm-theme" src/styles/` → zero matches.
- `grep -rn "normalizeLayoutTheme\|LAYOUT_THEME_OPTIONS\|LayoutTheme" src/` → zero matches (the legacy type and helpers are gone).
- `grep -rn "updateGlassBlur" src/ test/` → zero matches.

### V3 — Live `.vm-root` carries `vm-theme-vaultman` by default

Plugin-dev smoke:

```javascript
document.querySelector('.vm-root.vm-theme-vaultman')
// → HTMLElement, not null
```

### V4 — Preset switch reflects in DOM and paint

Plugin-dev smoke:

```javascript
const root = document.querySelector('.vm-root');
const before = root.className;
plugin.themeService.setPreset('native');
// next frame
console.log(root.className);
// includes 'vm-theme-native', excludes 'vm-theme-vaultman'
// visual: popup chrome opaque, row heights compact
```

## Risks that are not risks

These items resembled risks but resolved during brainstorm:

- **"Custom presets persisted across plugin downgrade"** — user has no
  pre-0-B userbase; clean-break shape is safe.
- **"Built-in presets edited at runtime accidentally"** — `as const` at
  compile time + `registerCustomPreset`/`updateCustomPreset` reject any
  `source !== 'custom'` operation at runtime.
- **"Bits-ui requires UnoCSS"** — bits-ui is headless; no UnoCSS
  requirement. Sub-system N (UnoCSS removal) can ship without bits-ui
  changes.
- **"`obsidian-web` integration tests blocked by 0-B"** — 0-B does not
  modify any code path `obsidian-web` exercises (chrome opacity and DOM
  class emission do not break the renderer).

## Open product decisions

None. All product-level forks were resolved during brainstorm. The 0-B
implementation plan can proceed without further decisions; remaining
choices are inside individual sub-system specs (0-A onwards).
