---
title: Elastic UI Chameleon Implementation Plan
type: implementation-plan
status: draft
parent: "[[docs/work/polish/index|polish]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - initiative/polish
  - elastic-ui
  - svelte5
  - unocss
  - bits-ui
created_by: codex
updated_by: codex
glossary_candidates:
  - Chameleon architecture
  - Elastic UI
  - Faint Mode
---

# Elastic UI Chameleon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` to implement this plan shard-by-shard.
> Steps use checkbox (`- [ ]`) syntax for tracking. Do not commit unless the
> user explicitly asks.

**Goal:** Transition Vaultman from a fixed handmade UI into a mode-aware
Chameleon UI that can mimic Obsidian Core Explorer, Bases, and Outline surfaces
while preserving community CSS snippet compatibility.

**Architecture:** Four independent execution shards own disjoint surfaces:
ALPHA owns style/theming/configuration, BETA owns virtualized node surfaces,
GAMMA owns headless overlays and multi-window portal safety, and DELTA owns
mouse/DnD/i18n/native DOM interception. The shared contract is a polymorphic
component model: every ported component must select Thin, Balanced, or Thick
markup through `serviceTheme` and must preserve native Obsidian class names in
Thin mode.

**Tech Stack:** Svelte 5 runes and snippets, UnoCSS shortcuts/icons, DaisyUI
semantic class layer where compatible, Bits UI v1 headless primitives,
PretextJS through the existing `serviceTextMeasure`, current
`@dnd-kit/svelte@0.4.0` adapter unless the dependency gate explicitly approves
the requested `@thisux/sveltednd` reversal.

---

## Source Intake

Required brain docs consumed:

- `.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/index.md`
- `.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/00-risk-assessment.md`
- `.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/01-shard-alpha-core-bridge.md`
- `.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/02-shard-beta-data-virtualization.md`
- `.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/03-shard-gamma-overlays-portals.md`
- `.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/04-shard-delta-interaction-a11y.md`
- `.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/05-elastic-ui-architecture.md`
- `.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/06-multi-identity-theme-logic.md`
- `.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/07-expansion-dom-interception.md`
- `.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/08-expansion-new-explorers.md`
- `.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/09-expansion-services-dnd.md`
- `.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/10-expansion-visual-logic.md`
- `.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/11-bitsui-mainview-spec.md`

Current code anchors inspected:

- `package.json`
- `vite.config.ts`
- `svelte.config.js`
- `src/pluginEntry.ts`
- `src/main.ts`
- `src/types/typeFrame.ts`
- `src/types/typeSettings.ts`
- `src/services/serviceLayout.ts`
- `src/services/serviceMouse.ts`
- `src/services/serviceDnd.ts`
- `src/services/serviceDndSvelteAdapter.ts`
- `src/services/serviceTextMeasure.ts`
- `src/services/serviceNodeBinding.ts`
- `src/services/serviceNativeSurfaceBinding.ts`
- `src/components/frame/frameVaultman.svelte`
- `src/components/views/ViewNodeTable.svelte`
- `src/components/views/ViewNodeGrid.svelte`
- `src/components/views/ViewNodeCards.svelte`
- `src/components/views/viewTree.svelte`
- `src/components/layout/overlays/layoutOverlay.svelte`
- `src/components/layout/overlays/overlayIsland.svelte`
- `src/components/settings/SettingsUI.svelte`
- `src/styles/_tokens.scss`
- `src/main.scss`

External references verified from official documentation during planning:

- Svelte 5 docs for `.svelte.ts`, `$state`, `$derived`, `$props`, snippets,
  `{@render}`, class arrays/objects, `style:`, `<svelte:window>`, and
  `<svelte:document>`.
- Bits UI docs index and component/portal references.
- DaisyUI docs index: DaisyUI 5 is Tailwind CSS 4 oriented; this plan treats it
  as a semantic class layer and requires an ALPHA dependency gate before any
  Tailwind plugin import enters the Obsidian build.
- UnoCSS official config references for shortcuts, Vite plugin integration,
  and preflight control.

## Non-Negotiable Gates

- Thin mode must emit Obsidian-native mirror classes: `nav-file`,
  `nav-file-title`, `nav-folder`, `tree-item`, `tree-item-self`,
  `tree-item-inner`, `metadata-container`, `metadata-property`, and
  `metadata-property-key` where the surface is mimicking the corresponding
  Obsidian core UI.
- Tailwind or Uno reset/preflight must remain disabled. Vaultman must not reset
  Obsidian global element styles.
- Bits UI portals must resolve to the current Vaultman root in the current
  window, not to the main-window `document.body`.
- `serviceTheme` owns `.vm-root` classes and variables. New components read
  theme state; they do not mutate `activeDocument.body` directly.
- Alias logic remains canonical in `serviceNodeBinding.ts`: tag `#name`,
  snippet `$name`, plugin `%id`, property `[name]`, folder/value/template clean
  labels.
- The current branch uses `@dnd-kit/svelte@0.4.0`. The user prompt requested
  `@thisux/sveltednd`, but current handoff says the old `@thisux/sveltednd`
  package should stay removed. DELTA must resolve this as an explicit dependency
  decision before editing package dependencies.
- All work must preserve unrelated dirty files. Inspect `git status --short`
  before each shard starts and before each shard hands off.

## Shards

- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/00-contracts-and-gates|00 Contracts And Gates]]
- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/01-alpha-foundation|ALPHA Foundation]]
- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/02-beta-engine|BETA Engine]]
- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/03-gamma-overlays|GAMMA Overlays]]
- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/04-delta-interaction|DELTA Interaction]]
- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/05-validation-and-handoff|Validation And Handoff]]

## Parallel Ownership

ALPHA writes configuration, style, theme service, settings schema, and root
classes. BETA writes virtualized view code and text measurement adapters. GAMMA
writes overlay wrappers and Bits UI portal integration. DELTA writes mouse/DnD,
native-surface interception, alias expansion, and i18n helpers. No shard may
edit another shard's files without adding a merge note in its shard file.

## Execution Order

1. Run `00-contracts-and-gates` first. It creates the shared types and resolves
   the DnD dependency gate.
2. Run ALPHA and GAMMA in parallel after gate types exist.
3. Run BETA in parallel after ALPHA exposes mode-aware classes and theme tokens.
4. Run DELTA in parallel after the DnD gate is resolved.
5. Run the cross-shard verification file after all four implementation shards
   report their focused tests and Obsidian smoke checks.

## Global Verification Envelope

Run at every shard handoff:

```bash
pnpm run check
pnpm exec vp test run --project unit --config vitest.config.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts --fileParallelism=false
pnpm run build:plugin
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev dev:errors
```

Expected: `svelte-check found 0 errors and 0 warnings`, focused Vitest files
pass, build exits 0, plugin reload succeeds, Vaultman opens, and Obsidian error
capture contains no Vaultman stack. If this local Obsidian CLI rejects the
`vault=plugin-dev` form, rerun the equivalent command without the vault prefix
and record the fallback in the shard handoff.
