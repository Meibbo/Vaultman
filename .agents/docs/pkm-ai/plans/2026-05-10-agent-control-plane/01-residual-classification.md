---
title: Residual classification
type: plan-slice
status: draft
parent: "[[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index|Agent Control Plane Implementation Plan]]"
created: 2026-05-10T03:29:53
updated: 2026-05-10T03:29:53
created_by: codex
updated_by: codex
tags:
  - agent/plan
  - initiative/pkm-ai
  - agent/workflow
---

# Residual Classification

## Task

Create the residual classifier source record that prevents recurring caveats
from ending as "pre-existing" prose in chat, status, or handoff.

## Files

- Create:
  `.agents/docs/work/pkm-ai/research/2026-05-10-residual-classification.md`
- Modify:
  `.agents/docs/work/pkm-ai/index.md`
- Read:
  `.agents/docs/work/research/2026-05-10-agent-failure-taxonomy/02-urgencies-and-repair-order.md`
- Read:
  `.agents/docs/current/handoff.md`
- Read:
  `.agents/docs/current/status.md`

## Steps

- [x] **Step 1: Create the residual classification record**

Write `.agents/docs/work/pkm-ai/research/2026-05-10-residual-classification.md`
with frontmatter:

```yaml
---
title: Residual classification
type: research
status: active
parent: "[[docs/work/pkm-ai/index|PKM-AI]]"
created: 2026-05-10T03:29:53
updated: 2026-05-10T03:29:53
created_by: codex
updated_by: codex
tags:
  - agent/research
  - initiative/pkm-ai
  - agent/workflow
---
```

- [x] **Step 2: Add the classifier table**

Add this table exactly, then append evidence rows below it:

```markdown
| Class | Meaning | Required record |
|---|---|---|
| fix-now | In scope and blocking the current claim | Link the fix or command evidence |
| backlog | Real but outside current slice | Link a backlog/source record with reproduction |
| accepted-noise | Known and tolerated for now | Owner, expiration, and reason |
| blocked-by-environment | Tooling/environment prevents proof | Tool, environment, fallback, next check |
| not-reproducible-yet | Reported but unproven | Repro steps attempted and next probe |
```

- [x] **Step 3: Seed current residuals**

Add rows for these exact residuals:

- full doc health failure;
- stale `serviceFnR.svelte` import-path class from handoff if still present;
- documented `pageFiltersRenameHandoff` failure if still present;
- full `git diff --check` trailing-whitespace noise;
- Vite/Svelte resolver transient;
- CodeQL/Java worker cleanup requirement;
- accidental package-manager drift.

- [x] **Step 4: Link the record from PKM-AI index**

Add one bullet under `Current Work` in `.agents/docs/work/pkm-ai/index.md`:

```markdown
- Research: [[docs/work/pkm-ai/research/2026-05-10-residual-classification|residual-classification]]
```

- [x] **Step 5: Verify the slice**

Run:

```powershell
node .agents\tools\pkm-ai\check-doc-health.mjs | Select-String -Pattern 'residual-classification|doc health'
```

Expected:

- the command may still report global `doc health: FAIL`;
- no `residual-classification` path appears as a failure.

Then run:

```powershell
Select-String -Path '.agents/docs/work/pkm-ai/research/2026-05-10-residual-classification.md','.agents/docs/work/pkm-ai/index.md' -Pattern '[ \t]+$'
```

Expected: no output.
