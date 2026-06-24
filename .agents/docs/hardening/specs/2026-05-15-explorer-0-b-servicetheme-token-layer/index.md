---
title: Explorer Phase 0 sub-system B — serviceTheme unification and theme preset registry
type: spec-index
status: draft
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - initiative/hardening
  - explorer/theme
  - explorer/presets
---

# Explorer Phase 0 Sub-System B — serviceTheme Unification And Theme Preset Registry

Second of three Phase 0 foundation specs derived from the
[[docs/work/hardening/research/2026-05-14-explorer-libraries-and-parity-research/index|explorer libraries and parity worldview research]]
§4 (serviceTheme + service-unload) and the
[[docs/work/hardening/research/2026-05-14-explorer-libraries-and-parity-research/brainstorm-handoff|brainstorm handoff]],
with additional inputs from the post-0-H
[[docs/work/hardening/research/2026-05-15-explorer-view-platform-infinite-canvas/02-architecture-execution-handoff|view platform architecture handoff]]
(node-element visibility contract + media slot defaults).

The three Phase 0 specs were chosen in dependency order during the brainstorm
session on 2026-05-14:

1. **0-H** (completed) — virtualizer consolidation and `list` view-mode wiring.
2. **0-B** (this spec) — `serviceTheme` unification, theme preset registry,
   built-in `native` and `vaultman` presets, runtime custom preset registry,
   SCSS-only token layer.
3. **0-A** (next session) — native-DOM parity contract, View Feature Contract,
   view-host extraction, in-editor class vocabulary, node-element
   `btnNodeElementsVisibility` wiring.

## Decision summary

- Unify the two disconnected theme services (`src/services/serviceTheme.ts`
  legacy class-list toggler + `src/services/serviceTheme.svelte.ts` runes class)
  into one deep-module runes class (Approach 1 — Ousterhout "deep modules with
  small interfaces" per the post-0-H architecture handoff).
- Define an exhaustive `ThemePreset` type covering every dimension a preset
  may vary across — including dimensions only wired by future sub-systems
  (dock, tabs, toolbar, viewModes, nodeElements, unload, colors, layout,
  workspaceId). 0-B wires only `useNativeDom` + `chrome` + `density`;
  remaining fields are declare-only.
- Ship two built-in presets:
  - `native` — chameleon disguise (useNativeDom=true, single tree view, no
    dock, no tabs, locked node-element visibility, compact density).
  - `vaultman` — full plugin layout (useNativeDom=false, all 5 view modes
    excluding markmap, dock and tabs visible, comfortable density, slight
    chrome polish, unlocked node-element visibility).
- Ship a runtime custom preset registry: `register`, `unregister`, `update`,
  with persistence to `data.json` (`elasticUi.customPresets[]`). No UI editor
  in 0-B; user authors customs by editing `data.json` until the future Theme
  Builder sub-system lands.
- Theme is **layout/structure preset, not paint palette**. Colors continue
  to delegate to Obsidian core CSS variables via the existing `_tokens.scss`
  indirection.
- `unocss-preset-theme` IS adopted in 0-B. Built-in preset tokens are
  declared in `uno.config.ts` and UnoCSS emits the `.vm-theme-{id}`
  CSS-var blocks at build time. This anticipates the upcoming
  SCSS-to-UnoCSS migration (Sub-system N) where UnoCSS becomes the
  primary styling source (~90% target). Custom presets continue to be
  runtime-injected by `ThemeService` via a `<style>` element because
  preset-theme is build-time only.
- DOM binding: `vm-theme-{id}` class lives on `.vm-root` via the existing
  `themeService.rootClasses` getter (which `frameVaultman.svelte:619` already
  consumes). The legacy `<body>` class binding via `applyVaultmanTheme` is
  deleted.
- Built-in preset tokens are declared in `uno.config.ts` via
  `unocss-preset-theme`; UnoCSS emits the `.vm-theme-native` and
  `.vm-theme-vaultman` CSS-var blocks into the build output. Custom
  preset tokens are injected at runtime by `ThemeService` via a
  `<style data-vm-theme-presets="custom">` element appended to `<head>`.
- Settings shape: clean break, no legacy migration code, no downgrade
  safety. `layoutTheme`, `glassBlurIntensity`, `islandBackdropBlur` settings
  are deleted; `elasticUi` becomes required and gains `themePresetId` and
  `customPresets` fields.
- Default fresh-install preset: `vaultman` (install plugin → see plugin).
  `native` is opt-in for users seeking core-equivalent disguise.

## Shards

1. [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/01-context-and-motivation|Context and motivation]]
2. [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/02-architecture|Architecture]]
3. [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/03-api-contract|`ThemePreset` type and `ThemeService` API contract]]
4. [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/04-built-in-presets|Built-in preset values]]
5. [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/05-scss-and-dom-binding|SCSS token layer and DOM binding]]
6. [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/06-settings-shape|Settings shape (clean break)]]
7. [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/07-consumer-wiring-scope|Consumer wiring scope]]
8. [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/08-testing-strategy|Testing strategy]]
9. [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/09-risks-and-open-items|Risks and open items]]

## Non-goals

- Do not change paint palette / colors. Vaultman continues to delegate
  `--text-accent`, `--text-normal`, `--background-primary`, etc. to whatever
  Obsidian theme + community snippets are active. The theme preset governs
  layout/structure and a small set of chrome+density tokens — not colors.
- Do not migrate existing SCSS files (other than `_islands.scss`,
  `_virtual-list.scss`, `_tree.scss` chrome/density consumers) to
  UnoCSS in 0-B. The wholesale SCSS→UnoCSS migration is **Sub-system N**
  — a separate initiative with high priority post-0-B. 0-B only
  introduces `unocss-preset-theme` for the small token surface and
  leaves the rest of SCSS as-is.
- Do not modify the four view components (`viewTree.svelte`,
  `ViewNodeTable.svelte`, `ViewNodeCards.svelte`, `ViewNodeGrid.svelte`) or
  `viewOutlineExplorer.svelte` for native-class emission. They already read
  `themeService.useNativeDom`; only its derivation source changes.
- Do not implement the Settings UI selector for choosing presets. The legacy
  `layoutTheme` dropdown is hidden; users edit `data.json` until the future
  `Sub-system "Settings UI refresh"` ships.
- Do not implement the Theme Builder editor (DnD layout, variant pickers,
  color governance UI). All future sub-system territory.
- Do not implement `serviceUnload`. The `preset.unload?` field is declared
  in the type for future Phase 3 Sub-system J consumption only.
- Do not wire `preset.dock`, `preset.tabs`, `preset.toolbar.buttons`,
  `preset.viewModes`, `preset.nodeElements`, or
  `preset.lockNodeElementVisibility` against real consumers in 0-B. They are
  declare-only fields with built-in defaults; future sub-systems
  (0-A, Layout extension, Toolbar contract) will read them.
- Do not refactor `frameVaultman.svelte`. The 867-LOC god component is
  registered as `Sub-system O — frameVaultman decomposition` for a separate
  spec.
- Do not preserve legacy `layoutTheme`, `glassBlurIntensity`, or
  `islandBackdropBlur` settings. Clean break — no migration code, no
  downgrade safety, no `@deprecated` markers (user has no pre-0-B userbase).
- Do not add color governance (zebra rows, rainbow nodes, accent overrides).
  Declared as `preset.colors?` field for future sub-system; not wired.

## Locked brainstorm answers

For traceability — resolved during the 2026-05-15 brainstorm and are inputs
to this spec rather than open questions:

- **Theme set:** `native | vaultman` only as built-ins. `custom` is an
  extension slot for user-defined presets; `polish` and `glass` are dropped
  (a user who wants those creates custom presets).
- **Theme semantic:** preset compuesto — decides `useNativeDom` + features
  visible + chrome + density. **Not** a paint palette; colors stay
  Obsidian-delegated.
- **Custom registry scope in 0-B:** type/shape + persistencia. No UI editor
  (deferred to Theme Builder sub-system).
- **Type contract:** exhaustive — all target final fields declared
  (including `unload?`, `colors?`, `layout?`, `workspaceId?`). 0-B wires
  only `useNativeDom`, `chrome`, `density`.
- **Density disposition:** density tokens live in theme presets (per-theme).
  `vm-id-*` axis survives as optional per-provider density overlay (not
  eliminated, contrary to earlier brainstorm misread).
- **Service shape (Approach):** single deep-module runes class. One
  `ThemeService`, public API ~5 reads + 4 writes; rich internals hidden.
- **Token transport:** Option B — `unocss-preset-theme` plugin
  configured in `uno.config.ts` emits the built-in `.vm-theme-{id}`
  CSS-var blocks at build time. Custom preset tokens are runtime-injected
  by `ThemeService` via `<style>` element since preset-theme is
  build-time only. **Decision reversed mid-brainstorm**: the project
  pivots to UnoCSS-dominant styling (Sub-system N flips from removal to
  migration), so 0-B anticipates the target state.
- **UnoCSS fate:** expanded, NOT removed. Sub-system N (SCSS→UnoCSS
  migration, target ~90% UnoCSS) registered for post-0-B execution with
  high priority — recommended before bits-ui adoption.
- **Settings migration:** clean break, no legacy compat.
- **`glassBlurIntensity`, `islandBackdropBlur`:** both deleted from
  settings.
- **Workspace seam:** `workspaceId?` declare-only field in `ThemePreset`.
  `Sub-system "Workspaces provider"` registered in backlog.
- **Native preset ambition:** absolute chameleon disguise (no dock, no
  tabs, no extras). 0-B declares it; future sub-systems wire the
  visibility filters.
- **Default fresh-install preset:** `vaultman` (install plugin → see
  plugin). `native` is opt-in.
- **Spec path:** Vaultman convention
  (`.agents/docs/work/hardening/specs/...`).

## Source notes

- Authored on the `claude/explorer` branch (worktree
  `.claude/worktrees/jovial-wilson-f81c67`). `claude/explorer` is the
  canonical Explorer development branch per the brainstorm handoff.
- Re-verification on 2026-05-15 against `claude/explorer` confirmed:
  - `serviceTheme.ts` (49 LOC, class-list toggler) and
    `serviceTheme.svelte.ts` (43 LOC, runes class) coexist disconnected;
    `main.ts:144` constructs the runes service, `main.ts:393` calls the
    class-list toggler.
  - `_elastic.scss` defines `.vm-root` CSS-var contract; `_islands.scss`
    has `vm-theme-default|native|polish|glass` blocks consuming
    `--vm-glass-blur`.
  - `uno.config.ts` does not include `unocss-preset-theme`.
  - 5 view components read `themeService.useNativeDom` via prop
    arbitration.
  - `frameVaultman.svelte:619` already derives `elasticRootClasses` from
    `themeService.rootClasses.join(' ')`.
  - `serviceLayout.ts` already exists with `LayoutTabSurface`,
    `LayoutDockPresentationMode`, `LayoutSurfaceContent` types — `dock`
    and `tabs` Settings have an existing home for future wiring.
- The
  [[docs/work/hardening/research/2026-05-15-explorer-view-platform-infinite-canvas/02-architecture-execution-handoff|post-0-H architecture handoff]]
  added a critical input: the view menu / preset / element contract,
  including the rule that node `media` slot defaults off in every preset
  and is exposed only via `btnNodeElementsVisibility` when the preset is not the
  native Obsidian preset. This shapes the `nodeElements` field and the
  `lockNodeElementVisibility` flag.
- The same handoff prescribes "deep modules with small interfaces" over
  strict SOLID checklists — the rationale for choosing Approach 1
  (single deep `ThemeService` class) over Approach 2 (split
  service/registry/tokens trio).
- `Map` (`markmap` view mode) is deferred per the same handoff and is
  deliberately excluded from `viewModes` of built-in presets in this
  spec.
