---
title: Verification
type: implementation-plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-06-node-selection-service/index|node-selection-service-plan]]"
created: 2026-05-06T07:05:00
updated: 2026-05-06T19:21:11
tags:
  - agent/plan
  - verification
---

# Phase 6: Verification

## Ownership

Recommended subagent: verification worker or parent coordinator.

Write scope:

- test snapshots only if approved by test failures;
- current docs update if the implementation is complete.

Do not refactor production code in this phase unless verification reveals a
root-cause bug and the coordinator approves a targeted fix.

## Focused Commands

Run unit tests:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceSelection.test.ts
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/logic/logicKeyboard.test.ts
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/components/explorerFiles.test.ts test/unit/components/explorerTags.test.ts test/unit/components/explorerProps.test.ts
```

Run component tests sequentially:

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeSelection.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewGridSelection.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTreeDecorations.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/panelExplorerEmpty.test.ts --fileParallelism=false
```

Run broad checks:

```powershell
pnpm run check
pnpm run lint
pnpm run build
```

If `pnpm run build` hits the known transient Svelte resolver issue, rerun once
sequentially and record both outcomes.

## Manual Smoke Checklist

In Obsidian or the available component harness:

- tree file node chevron expands/collapses without changing selection;
- file label primary action still works;
- prop, value, and tag primary actions still route to filter/FnR/add behavior
  according to mode;
- plain row click selects only that node;
- Control/Command click toggles one node;
- Shift click selects a range;
- Control/Command plus Shift click adds a range;
- drag selection selects row slots even through visual gaps;
- right-click selected set opens menu for all selected compatible nodes;
- click outside explorer clears selection;
- Escape clears selection;
- active/focused state is not confused with selected state;
- grid tiles behave like tree rows for selection.

## Completion Record

When verification passes:

- update [[docs/current/status|current status]] with completed phases and
  verification commands;
- update [[docs/current/handoff|current handoff]] with changed files, known
  residuals, and next recommended slice;
- optionally commit docs and code if the user still wants commits enabled for
  this task.
