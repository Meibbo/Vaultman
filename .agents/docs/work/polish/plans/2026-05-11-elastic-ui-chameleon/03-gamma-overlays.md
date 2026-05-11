---
title: GAMMA Overlays
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/index|elastic-ui-chameleon]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - gamma
created_by: codex
updated_by: codex
---

# GAMMA Overlays

## Ownership

GAMMA owns Bits UI integration, accessible overlay wrappers, and multi-window
portal safety. It must not alter table/grid virtualizer behavior or node alias
resolution except through wrapper props.

## Files

- Modify: `package.json`
- Modify: `src/components/layout/overlays/layoutOverlay.svelte`
- Modify: `src/components/layout/overlays/overlayIsland.svelte`
- Modify: `src/components/layout/overlays/overlayViewMenu.svelte`
- Modify: `src/components/layout/overlays/overlaySortMenu.svelte`
- Modify: `src/components/layout/overlays/tabViewMenuDetach.svelte`
- Modify: `src/services/serviceOverlayState.svelte.ts`
- Create: `src/components/overlays/BitsPortalTarget.svelte`
- Create: `src/components/overlays/VmDialog.svelte`
- Create: `src/components/overlays/VmPopover.svelte`
- Create: `test/component/overlayPortalTarget.test.ts`
- Create: `test/component/overlayEscapeFocus.test.ts`
- Create: `test/unit/services/serviceOverlayStateBits.test.ts`

## Shards

- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/03-gamma-dependency-portal|GAMMA Dependency And Portal]]
- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/03-gamma-dialog-popover|GAMMA Dialog And Popover]]
- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/03-gamma-migration-smoke|GAMMA Migration And Smoke]]

## Shard Verification

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceOverlayStateBits.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/overlayPortalTarget.test.ts test/component/overlayEscapeFocus.test.ts test/component/overlayViewMenu.test.ts test/component/overlaySortMenu.test.ts test/component/popupIsland.test.ts --fileParallelism=false
pnpm run check
pnpm run build:plugin
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev eval code="(() => Array.from(activeDocument.querySelectorAll('.vm-dialog-content,.vm-popover-content')).every(el => el.closest('.vm-root')))()"
obsidian vault=plugin-dev dev:errors
```

Expected: tests pass, overlays stay inside `.vm-root`, and no Vaultman error is
captured.
