---
title: BETA Engine
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/index|elastic-ui-chameleon]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - beta
created_by: codex
updated_by: codex
---

# BETA Engine

## Ownership

BETA owns node surface virtualization, dynamic measurement, table/grid/card rendering contracts, and view-level mode-aware classes. It must not install style dependencies or change overlay portal behavior.

## Files

- Modify: `src/components/views/ViewNodeTable.svelte`
- Modify: `src/components/views/ViewNodeGrid.svelte`
- Modify: `src/components/views/ViewNodeCards.svelte`
- Modify: `src/components/views/viewTree.svelte`
- Modify: `src/services/serviceTextMeasure.ts`
- Create: `src/services/serviceNodeRowMeasure.ts`
- Create: `test/unit/services/serviceNodeRowMeasure.test.ts`
- Modify or create focused component tests:
  `test/component/viewTableStress.test.ts`, `test/component/viewTableSelection.test.ts`, `test/component/viewGridSelection.test.ts`, `test/component/viewNodeCards.test.ts`

## Shards

- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/02-beta-measurement|BETA Measurement]]
- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/02-beta-table-grid|BETA Table And Grid]]
- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/02-beta-snippets-smoke|BETA Snippets And Smoke]]

## Shard Verification

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTextMeasure.test.ts test/unit/services/serviceNodeRowMeasure.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTableStress.test.ts test/component/viewTableSelection.test.ts test/component/viewGridSelection.test.ts test/component/viewGridHoverBadges.test.ts test/component/viewNodeCards.test.ts --fileParallelism=false
pnpm run check
pnpm run build:plugin
obsidian vault=plugin-dev eval code="window.__vaultmanPerfProbe.run('tree-scroll',{steps:24}).then(r=>JSON.stringify(r))"
obsidian vault=plugin-dev dev:errors
```

Expected: focused tests pass, no Svelte errors, build exits 0, performance probe returns JSON, and no Vaultman stack appears.
