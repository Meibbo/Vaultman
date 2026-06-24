---
title: TanStack node table verification and docs
type: implementation-plan
status: active
parent: "[[docs/work/polish/plans/2026-05-07-tanstack-node-table/index|tanstack-node-table-plan]]"
created: 2026-05-07T08:26:53
updated: 2026-05-07T08:26:53
tags:
  - agent/plan
  - initiative/polish
  - verification
  - table
created_by: codex
updated_by: codex
---

# Verification And Docs

## Purpose

Prove the table cut is complete, keep docs compact, and leave a clear next
action for follow-up table capabilities.

## Files

- Modify: `.agents/docs/work/polish/specs/2026-05-07-tanstack-node-table/index.md`
- Modify: `.agents/docs/work/polish/index.md`
- Modify: `.agents/docs/current/status.md`
- Review: `package.json`, `pnpm-lock.yaml`, `styles.css`, and all touched
  source/test files.

## Task 5: Full Verification

- [ ] **Step 1: Run focused unit tests**

Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceViewTableAdapter.test.ts
```

Expected: adapter tests pass.

- [ ] **Step 2: Run focused component tests sequentially**

Run:

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTableSelection.test.ts test/component/panelExplorerSelection.test.ts test/component/panelExplorerEmpty.test.ts --fileParallelism=false
```

Expected: table, panel selection, and empty-state component tests pass.

- [ ] **Step 3: Run Svelte and TypeScript checks**

Run:

```powershell
pnpm run check
```

Expected: `svelte-check` exits 0.

- [ ] **Step 4: Run lint**

Run:

```powershell
pnpm run lint
```

Expected: lint exits 0 errors. If warnings appear in unrelated files, record
the exact files and do not edit unrelated code.

- [ ] **Step 5: Run build**

Run:

```powershell
pnpm run build
```

Expected: build exits 0 and regenerates `styles.css`. If the known transient
Svelte resolver issue appears, rerun once sequentially without code changes and
record both outputs.

- [ ] **Step 6: Run scoped whitespace verification**

Run:

```powershell
git diff --check -- package.json pnpm-lock.yaml src/services/serviceViewTableAdapter.ts src/components/views/ViewNodeTable.svelte src/components/containers/panelExplorer.svelte src/styles/data/_table.scss src/main.scss styles.css test/unit/services/serviceViewTableAdapter.test.ts test/component/viewTableSelection.test.ts test/component/panelExplorerSelection.test.ts test/component/panelExplorerEmpty.test.ts .agents/docs/work/polish .agents/docs/current/status.md
```

Expected: exits 0. If unrelated whitespace failures appear outside this list,
do not fix them in this cut.

- [ ] **Step 7: Update source records**

Update the TanStack node table spec index status line with a compact completion
note:

```markdown
## Implementation Status

- MVP table implementation completed and verified in the current worktree.
```

Update `.agents/docs/work/polish/index.md` with an active plan link if it is not
already present:

```markdown
## Active Plans

- [[docs/work/polish/plans/2026-05-07-tanstack-node-table/index|TanStack node table implementation plan]]
```

Update `.agents/docs/current/status.md` with one compact current-verification
bullet and keep the file under 200 lines.

- [ ] **Step 8: Final git status review**

Run:

```powershell
git status --short
git diff --stat
```

Expected: only planned files are modified or created. Do not commit unless the
active user request explicitly allows commits.

## Post-MVP Follow-Ups

Record these as future work, not part of this cut:

- provider-specific table columns;
- inline cell edit;
- copy/paste;
- rectangular cell range selection;
- persisted column resize and reorder;
- Bases summaries;
- formulas.
