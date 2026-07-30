---
title: Verification and close
type: plan-slice
status: draft
parent: "[[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index|Agent Control Plane Implementation Plan]]"
created: 2026-05-10T03:29:53
updated: 2026-05-10T05:30:51
created_by: codex
updated_by: codex
tags:
  - agent/plan
  - initiative/pkm-ai
  - agent/workflow
---

# Verification And Close

## Task

Verify the first Agent Control Plane slice and record what remains outside scope.

## Files

- Modify:
  `.agents/docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index.md`
- Modify:
  `.agents/docs/work/pkm-ai/index.md`
- Read:
  `.agents/docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/index.md`

## Steps

- [x] **Step 1: Check line counts**

Run:

```powershell
$files = Get-ChildItem -Recurse -Filter '*.md' '.agents/docs/work/pkm-ai/specs/2026-05-10-agent-control-plane','.agents/docs/work/pkm-ai/plans/2026-05-10-agent-control-plane'
foreach ($f in $files) { "$($f.FullName)`t$((Get-Content -LiteralPath $f.FullName).Count)" }
```

Expected: every file is `200` lines or fewer.

- [x] **Step 2: Check banned tokens and whitespace**

Run:

```powershell
$files = Get-ChildItem -Recurse -Filter '*.md' '.agents/docs/work/pkm-ai/specs/2026-05-10-agent-control-plane','.agents/docs/work/pkm-ai/plans/2026-05-10-agent-control-plane'
$bad = @('TB'+'D','TO'+'DO','place'+'holder','fill'+' in','implement'+' later','Similar to '+'Task') -join '|'
Select-String -Path $files.FullName -Pattern $bad
Select-String -Path $files.FullName -Pattern '[ \t]+$'
```

Expected: no output.

- [x] **Step 3: Run doc health**

Run:

```powershell
node .agents\tools\pkm-ai\check-doc-health.mjs | Select-String -Pattern 'agent-control-plane|residual-classification|route-retrieval|tool-contracts|doc health'
```

Expected:

- global doc health may still fail because of pre-existing repo docs;
- no new control-plane path appears as a failure.

- [x] **Step 4: Check git scope**

Run:

```powershell
git status --short -- .agents/docs/work/pkm-ai .agents/docs/architecture/policies/tools.md
```

Expected: changed files are limited to the control-plane docs, PKM-AI index, residual-classification research record, and tools policy if Task 4 executed.

- [x] **Step 5: Record out-of-scope next plans**

Add a `Next Plans` section to this index with bullets for:

- queue contract repair;
- selected/visible scope verification;
- `serviceAPI` read/plan/enqueue design;
- TypeScript AST code-index implementation.

- [x] **Step 6: Final handoff**

Final response must state:

- which docs were created or updated;
- whether doc health still fails globally;
- whether any new control-plane path appears in health failures;
- whether product code changed;
- that no commit was made unless the user explicitly requested one.

## Result

Completed 2026-05-10T05:30:51. The first Agent Control Plane slice now has source records for residual classification, verification matrix, route/retrieval profiles, and tool contracts. The implementation plan index now records next plans for queue contract repair, selected/visible scope verification, `serviceAPI` read/plan/enqueue design, and TypeScript AST code-index implementation. The PKM-AI index links the Agent Control Plane outputs.

Verification:

- All control-plane spec/plan Markdown files are under 200 lines.
- Banned-token and trailing-whitespace checks for the control-plane spec/plan folder returned no output.
- Filtered doc health still reports global `doc health: FAIL (47)`, with no new `agent-control-plane`, `residual-classification`, `route-retrieval`, or `tool-contracts` path failure.
- Scoped git status shows changes limited to PKM-AI control-plane docs, `.agents/docs/work/pkm-ai/index.md`, and `.agents/docs/architecture/policies/tools.md` for this plan's requested documentation scope.
