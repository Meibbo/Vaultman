---
title: Verification and slice close
type: implementation-plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-06-cmenu-queue-repair/index|cmenu-queue-repair]]"
created: 2026-05-06T03:00:09
updated: 2026-05-06T05:12:35
tags:
  - agent/plan
  - initiative/hardening
  - testing
---

# Verification And Slice Close

## Focused Commands

Run red/green commands one behavior at a time:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/components/explorerTags.test.ts
```

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/components/explorerFiles.test.ts
```

After queue contract changes:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceQueue.test.ts test/unit/services/serviceOperationsIndex.test.ts
```

Before claiming A0 complete:

```powershell
pnpm run check
```

If Svelte files were edited, also run `svelte-autofixer` on each changed Svelte
component before `pnpm run check`.

## Documentation Closeout

1. Mark this plan `status: completed` only after focused tests pass.
2. Update `docs/current/handoff.md` with:
   - files changed;
   - tests run;
   - A0 result;
   - next slice named as A1 prop/value rename handoff.
3. Keep `docs/current/status.md` under 200 lines by linking to this
   plan if more detail is needed.
4. Run:

```powershell
node tools/pkm-ai/check-doc-health.mjs
```

## Slice Completion Message

Tell the user explicitly:

- `A0 CMenu Queue Repair` is complete or blocked.
- What was verified.
- The next slice is `A1 Prop/Value Rename Handoff`.
