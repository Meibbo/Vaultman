---
title: Final verification
type: plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-05-bases-import-choose-mode/index|bases-import-plan]]"
created: 2026-05-05T02:36:37
updated: 2026-05-05T16:11:11
tags:
  - agent/plan
  - bases/import
---

# Final Verification

## Steps

- [x] Run filter and interop unit tests:

```powershell
pnpm run test:unit -- --run test/unit/utils/filter-evaluator.test.ts test/unit/services/serviceFilter.test.ts test/unit/services/serviceBasesInterop.test.ts test/unit/index/indexBasesImportTargets.test.ts
```

Expected: all listed unit tests pass.

- [x] Run component tests touched by the slice:

```powershell
pnpm run test:component -- --run test/component/viewEmptyLanding.test.ts test/component/viewList.test.ts
```

Expected: all listed component tests pass.

- [x] Run Svelte/type validation:

```powershell
pnpm run check
```

Expected: exit 0.

- [x] Run build:

```powershell
pnpm run build
```

Expected: exit 0.

- [x] Run full focused verification without parallel Vite/Svelte commands:

```powershell
pnpm run lint
pnpm run test:unit -- --fileParallelism=false
pnpm run test:component
```

Expected: all pass. Do not run these in parallel with `build` or another Vite/Svelte command.

- [x] If runtime verification is available, run:

```powershell
obsidian plugin:reload id=vaultman
obsidian dev:errors
```

Expected: reload succeeds and `dev:errors` reports no captured runtime errors.

## Completion Notes

- Summarize applied files, tests run, and any unsupported Bases expressions still intentionally report-only.
- Do not commit unless the user explicitly asks.
