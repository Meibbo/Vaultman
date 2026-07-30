---
title: DELTA Interaction
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/index|elastic-ui-chameleon]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - delta
created_by: codex
updated_by: codex
---

# DELTA Interaction

## Ownership

DELTA owns mouse grammar, DnD adapter decisions, native-surface interception, node-note alias expansion, and i18n attribute helpers. It must not alter ALPHA style setup, BETA measurement internals, or GAMMA portal wrappers.

## Files

- Modify: `src/services/serviceMouse.ts`
- Modify: `src/services/serviceDnd.ts`
- Modify: `src/services/serviceDndSvelteAdapter.ts`
- Modify: `src/services/serviceNativeSurfaceBinding.ts`
- Modify: `src/services/serviceNodeBinding.ts`
- Modify: `src/index/i18n/en.ts`
- Modify: `src/index/i18n/es.ts`
- Create: `src/services/serviceI18nAttrs.ts`
- Create: `test/unit/services/serviceI18nAttrs.test.ts`
- Modify or create tests for mouse, DnD, native surfaces, node binding, and binding-note component routes.

## Shards

- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/04-delta-mouse-i18n|DELTA Mouse And i18n]]
- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/04-delta-native-alias|DELTA Native Alias]]
- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/04-delta-dnd-mainview|DELTA DnD And Main View]]

## Shard Verification

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceMouse.test.ts test/unit/services/serviceI18nAttrs.test.ts test/unit/services/serviceNativeSurfaceBinding.test.ts test/unit/services/serviceNodeBinding.test.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/cmenuCreateBindingNote.test.ts test/component/framePages.test.ts test/component/frameOverlaysCommandHooks.test.ts --fileParallelism=false
pnpm run check
pnpm run build:plugin
obsidian vault=plugin-dev eval code="(() => { const svc=app.plugins.plugins.vaultman?.nodeBindingService; return !!svc; })()"
obsidian vault=plugin-dev dev:errors
```

Expected: service/component tests pass, build exits 0, node binding service is available in Obsidian, and no Vaultman stack appears.
