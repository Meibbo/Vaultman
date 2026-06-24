---
title: Final verification
type: plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-05-performance-diagnosis-loop/index|performance-diagnosis-loop-plan]]"
created: 2026-05-05T20:58:26
updated: 2026-05-05T21:45:00
tags:
  - agent/plan
  - performance
---

# Final Verification

## Task 5: Verify Probe Safety and Handoff

**Files:**

- Modify: `docs/current/handoff.md` only if the user asks for handoff.

- [x] **Step 1: Run focused tests**

Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/dev/perfProbe.test.ts test/unit/services/serviceViews.test.ts
pnpm exec vp test run --project component --config vitest.config.ts --fileParallelism=false test/component/perfProbeDom.test.ts test/component/reactiveExplorers.test.ts
```

Expected: all tests pass.

- [x] **Step 2: Run Svelte and build checks**

Run commands one at a time:

```powershell
pnpm run check
pnpm run build
```

Expected: `svelte-check found 0 errors and 0 warnings`; build succeeds and syncs artifacts.

- [x] **Step 3: Run live Obsidian safety checks**

Run:

```powershell
obsidian plugin:reload id=vaultman
obsidian command id=vaultman:open
obsidian dev:console level=error
obsidian dev:errors
```

Expected: no console errors. A known ResizeObserver loop notice can be recorded as existing Obsidian noise if it appears without a stack or plugin error.

- [x] **Step 4: Confirm no architecture rewrite slipped in**

Run:

```powershell
git diff --stat
git diff -- src/dev/perfProbe.ts src/main.ts src/services/serviceViews.svelte.ts src/services/serviceDecorate.ts src/components/containers/panelExplorer.svelte src/components/views/viewTree.svelte
```

Expected: changes are limited to probe installation and instrumentation. No TanStack dependencies, DnD dependency, CodeQL workflow, or context-menu rewrite appears in this slice.

- [x] **Step 5: State the measured conclusion**

Final implementation response must include:

- Which scenarios were measured.
- Which one or two hot paths ranked highest.
- Which metrics were missing or weak.
- Whether the next plan should optimize `serviceViews`, `serviceDecorate`, `PanelExplorer`, `ViewTree`, or selection notification batching.
