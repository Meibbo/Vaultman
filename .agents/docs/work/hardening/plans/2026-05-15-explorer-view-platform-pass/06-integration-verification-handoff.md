---
title: Integration, verification, and handoff
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass implementation plan]]"
created: 2026-05-15T18:00:10.0199112-05:00
updated: 2026-05-15T18:00:10.0199112-05:00
tags:
  - agent/plan
  - explorer/verification
created_by: codex
updated_by: codex
---

# Integration, Verification, And Handoff

### Task 17: Focused Platform Gate

**Files:**
- Modify: `.agents/docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/perf-baseline.md`

- [ ] **Step 1: Run focused unit gates**

Run:
`pnpm exec vitest run --project unit --config vitest.config.ts test/unit/performance/explorerPlatformSynthetic.test.ts test/unit/services/serviceExplorerProjection.test.ts test/unit/services/serviceExplorerViewContract.test.ts test/unit/services/serviceExplorerScrollGeometry.test.ts test/unit/services/serviceExplorerMediaDescriptor.test.ts --fileParallelism=false`

Expected: pass.

- [ ] **Step 2: Run focused component gates**

Run:
`pnpm exec vitest run --project component --config vitest.config.ts test/component/viewTreeVisualContract.test.ts test/component/viewTreeSelection.test.ts test/component/viewTreeScrollFallback.test.ts test/component/overlayViewMenu.test.ts test/component/ViewNodeList.test.ts --fileParallelism=false`

Expected: pass.

- [ ] **Step 3: Record results**

Create `perf-baseline.md` with command, date, counts, and key perfProbe snapshot fields.

- [ ] **Step 4: Commit**

Commit message: `test: verify explorer platform focused gates`.

### Task 18: Full Local Verification

**Files:**
- No product files.

- [ ] **Step 1: Run Svelte check**

Run: `pnpm check` Expected: 0 errors.

- [ ] **Step 2: Run build**

Run: `pnpm run build` Expected: pass and plugin bundle generated.

- [ ] **Step 3: Run full gate**

Run: `pnpm verify` Expected: pass.

- [ ] **Step 4: Run diff hygiene**

Run: `git diff --check` Expected: no whitespace errors.

### Task 19: Live Obsidian CLI PerfProbe

**Files:**
- Modify: `.agents/docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/perf-baseline.md`

- [ ] **Step 1: Sync and reload plugin-dev**

Use the established Obsidian CLI workflow for `vault=plugin-dev`. Run commands sequentially.

- [ ] **Step 2: Execute scenarios**

Run live scenarios through `window.__vaultmanPerfProbe`:

- `files-list-10k-scroll-jump`;
- `files-tree-10k-scroll-jump`;
- `files-tree-50k-scroll-jump`;
- `projection-50k-build-or-refresh`;
- `projection-100k-proof`;
- `tree-box-selection`;
- `tree-filtered-highlight`;
- `node-media-hidden-cost`.

- [ ] **Step 3: Capture errors**

Run `dev:errors` and record any captured error. A clean run is required before handoff.

- [ ] **Step 4: Commit**

Commit message: `test: record live explorer platform perf probe`.

### Task 20: Docs And Handoff

**Files:**
- Modify: `.agents/docs/current/status.md`
- Modify: `.agents/docs/current/handoff.md`
- Modify: `.agents/docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index.md`

- [ ] **Step 1: Update plan status**

Set plan status to active during execution and completed after all gates pass.

- [ ] **Step 2: Update current docs**

Keep current docs compact. Link the spec, plan, perf baseline, commits, and remaining residuals.

- [ ] **Step 3: Final sanity check**

Run:
`git status --short`

Verify only intended files are changed.

- [ ] **Step 4: Commit**

Commit message: `docs: hand off explorer view platform pass`.
