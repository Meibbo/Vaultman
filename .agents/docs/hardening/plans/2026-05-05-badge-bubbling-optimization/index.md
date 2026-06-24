---
title: Badge bubbling optimization implementation plan
type: plan-index
status: completed
parent: "[[docs/work/hardening/research/2026-05-05-performance-baseline/index|performance-baseline]]"
created: 2026-05-05T22:06:42
updated: 2026-05-05T22:34:47
tags:
  - agent/plan
  - initiative/hardening
  - performance
  - explorer/views
---

# Badge Bubbling Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `panelExplorer.bubbleHiddenTreeBadges` time without changing collapsed badge behavior.

**Architecture:** Keep `bubbleHiddenTreeBadges` as the public pure utility, but make it structurally share unchanged nodes and arrays. It should still traverse enough to find hidden descendant badges, but it should clone only branches that actually gain inherited badges or contain changed descendants.

**Tech Stack:** TypeScript, Svelte 5, Vitest unit/component tests, existing perf probe scenarios.

---

## File Map

- Modify `src/utils/utilBadgeBubbling.ts`: add structural sharing and avoid cloning unchanged leaf/expanded branches.
- Modify `test/unit/utils/utilBadgeBubbling.test.ts`: pin semantic behavior and reference reuse.
- Test `test/component/panelExplorerEmpty.test.ts`: ensure instrumentation still records bubbling.
- Update `docs/work/hardening/research/2026-05-05-performance-baseline/index.md`: append comparison notes after live rerun.

## Task 1: Structural Sharing In Badge Bubbling

- [x] **Step 1: Write failing reference-reuse tests**

Add unit tests proving:

- A tree with no descendant badges returns original node references.
- An expanded parent with an unchanged child branch returns the original parent and child references.
- A collapsed parent with a hidden descendant badge clones only the changed parent and preserves unchanged descendant references.

Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/utils/utilBadgeBubbling.test.ts
```

Expected: FAIL because current implementation clones every node.

- [x] **Step 2: Implement minimal structural sharing**

Update the recursive result shape to carry:

- `node`
- `ownAndDescendantBadges`
- `changed`

Rules:

- Leaf nodes with no inherited badges return the original node.
- Expanded parents with unchanged children and no badge changes return the original node.
- Collapsed parents clone only when inherited badges differ from existing badges or at least one child changed.
- Existing inherited badges are ignored when computing direct badges, then replaced by the newly inherited set.

- [x] **Step 3: Verify unit test green**

Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/utils/utilBadgeBubbling.test.ts
```

Expected: PASS.

## Task 2: Component Safety And Baseline Comparison

- [x] **Step 1: Verify component surface**

Run:

```powershell
pnpm exec vp test run --project component --config vitest.config.ts --fileParallelism=false test/component/panelExplorerEmpty.test.ts test/component/viewTreeDecorations.test.ts
```

Expected: PASS.

- [x] **Step 2: Run Svelte check and build**

Run one at a time:

```powershell
pnpm run check
pnpm run build
```

Expected: `svelte-check found 0 errors and 0 warnings`; build succeeds.

- [x] **Step 3: Rerun live perf scenarios**

Run after build:

```powershell
obsidian plugin:reload id=vaultman
obsidian command id=vaultman:open
obsidian eval code="window.__vaultmanPerfProbe.run('filters-search',{query:'status'}).then(r=>JSON.stringify(r))"
obsidian eval code="window.__vaultmanPerfProbe.run('operation-badges').then(r=>JSON.stringify(r))"
```

Expected: JSON includes `panelExplorer.bubbleHiddenTreeBadges`; compare total and max times against the baseline.

- [x] **Step 4: Record comparison**

Append a `## Badge Bubbling Optimization Comparison` section to the baseline report with the new JSON and a concise conclusion.

- [x] **Step 5: Final verification**

Run:

```powershell
pnpm run lint
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/utils/utilBadgeBubbling.test.ts test/unit/dev/perfProbe.test.ts
pnpm exec vp test run --project component --config vitest.config.ts --fileParallelism=false test/component/panelExplorerEmpty.test.ts test/component/viewTreeDecorations.test.ts
pnpm run check
pnpm run build
obsidian plugin:reload id=vaultman
obsidian command id=vaultman:open
obsidian dev:console level=error
obsidian dev:errors
node tools/pkm-ai/check-doc-health.mjs
```

Expected: all commands pass; only known ResizeObserver loop noise may remain in `obsidian dev:errors`.
