---
title: ALPHA Foundation
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/index|elastic-ui-chameleon]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - alpha
created_by: codex
updated_by: codex
---

# ALPHA Foundation

## Ownership

ALPHA owns style configuration, theme state, root classes, settings schema, and
SCSS bridge files. It must not edit virtualized view internals, overlay behavior,
or DnD semantics except to consume the shared Elastic UI types.

## Files

- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `src/pluginEntry.ts`
- Modify: `src/main.ts`
- Modify: `src/types/typeFrame.ts`
- Modify: `src/types/typeSettings.ts`
- Modify: `src/components/settings/SettingsUI.svelte`
- Modify: `src/main.scss`
- Modify: `src/styles/_tokens.scss`
- Create: `uno.config.ts`
- Create: `src/services/serviceTheme.svelte.ts`
- Create: `src/styles/_elastic.scss`
- Create: `test/unit/services/serviceTheme.test.ts`
- Create: `test/unit/styles/elasticThemeStyles.test.ts`
- Create: `test/component/settingsElasticUi.test.ts`

## Shards

- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/01-alpha-dependencies-and-unocss|ALPHA Dependencies And UnoCSS]]
- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/01-alpha-theme-service|ALPHA Theme Service]]
- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/01-alpha-css-settings|ALPHA CSS And Settings]]

## Local Contract

- UnoCSS must be scoped to generated utilities and shortcuts. No reset/preflight.
- `src/pluginEntry.ts` imports `uno.css` before `main.scss` so Vaultman SCSS can
  keep final say where specificity overlaps.
- `serviceTheme` owns `.vm-root`, mode classes, identity classes,
  `is-vm-unfocused`, and `vm-reduced-motion`.
- Faint Mode is root-scoped. New code must not add more direct body-level faint
  toggles.
- DaisyUI is gated. If direct DaisyUI cannot be integrated without Tailwind
  preflight or global reset risk, ALPHA implements Daisy-style semantic
  shortcuts through UnoCSS.

## Shard Verification

Run after all ALPHA continuation files are implemented:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTheme.test.ts test/unit/styles/elasticThemeStyles.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/settingsElasticUi.test.ts --fileParallelism=false
pnpm run check
pnpm run build:plugin
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev eval code="(() => !!activeDocument.querySelector('.vm-root.vm-mode-thin.vm-id-native'))()"
obsidian vault=plugin-dev dev:errors
```

Expected: tests pass, check/build exit 0, eval returns `true`, and Obsidian
error capture contains no Vaultman stack.
