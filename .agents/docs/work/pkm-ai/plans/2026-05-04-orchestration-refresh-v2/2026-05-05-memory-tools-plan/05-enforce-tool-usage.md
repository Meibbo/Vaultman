---
title: Memory tools plan task 5 - Enforce Tool Usage in Docs and Skills
type: plan-shard
status: active
parent: "[[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/2026-05-05-memory-tools-plan|memory-tools-plan]]"
created: 2026-05-05T22:06:42
updated: 2026-05-05T22:34:47
tags:
  - agent/plan
  - pkm-ai/tools
---

### Task 5: Enforce Tool Usage in Docs and Skills

**Files:**
- Modify: `docs/start.md:14-22` (approx)
- Modify: `skills/diagnose/SKILL.md`
- Modify: `skills/improve-codebase-architecture/SKILL.md`

- [ ] **Step 1: Update `docs/start.md`**

Add these lines to the `Always read:` section instructions:

```markdown
- For large code files, use `tools/pkm-ai/analyze-code.mjs` instead of reading the whole file.
- To archive long context, use `tools/pkm-ai/manage-memory.mjs archive`.
```

- [ ] **Step 2: Update `diagnose/SKILL.md`**

In the "Execution" or "Process" section, add:
```markdown
- You MUST use `tools/pkm-ai/analyze-logs.mjs` to read error logs before attempting to guess the failure.
```

- [ ] **Step 3: Update `improve-codebase-architecture/SKILL.md`**

In the "Discovery" section, add:
```markdown
- You MUST use `tools/pkm-ai/traverse-graph.mjs` to understand file dependencies before moving or refactoring code.
```

- [ ] **Step 4: Commit**

```bash
git add docs/start.md skills/diagnose/SKILL.md skills/improve-codebase-architecture/SKILL.md
git commit -m "docs(pkm-ai): enforce usage of new analysis tools in base docs and skills"
```
