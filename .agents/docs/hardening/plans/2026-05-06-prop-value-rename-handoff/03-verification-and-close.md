---
title: Verification and close
type: implementation-plan-shard
status: active
parent: "[[docs/work/hardening/plans/2026-05-06-prop-value-rename-handoff/index|prop-value-rename-handoff]]"
created: 2026-05-06T03:30:00
updated: 2026-05-06T03:30:00
tags:
  - agent/plan
  - testing
---

# Verification And Close

## Focused Commands

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceFnR.test.ts test/unit/components/explorerProps.test.ts
```

If component coverage is added:

```powershell
pnpm run test:component -- test/component/pageFiltersChooseMode.test.ts
```

Run after Svelte edits:

```powershell
pnpm run check
```

## Closeout

- Mark this plan completed after focused tests and `check` pass.
- Update current handoff/status with A1 result and next slice A2.
- Mention any unrelated doc-health line-limit failures separately.
