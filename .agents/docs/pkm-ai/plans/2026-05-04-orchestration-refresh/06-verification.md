---
title: Verification
type: plan-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T00:00:00
updated: 2026-05-04T00:00:00
tags:
  - agent/plan
---

# Verification

## Task 1: Run Doc Health

**Files:**
- Run: `tools/pkm-ai/check-doc-health.mjs`

- [ ] Expected: no line limit failures.
- [ ] Expected: no timezone-offset timestamps.
- [ ] Expected: no `parent_path`.
- [ ] Expected: no active agent docs in public `docs/**`.

## Task 2: Run Git Visibility Check

**Files:**
- Check: `.gitignore`, `docs/**`, `skills/**`, `tools/**`

- [ ] Run:

```powershell
git status --short -- .agents AGENTS.md CLAUDE.md docs .gitignore
```

- [ ] Expected: intended agent docs are visible to Git on this branch.

## Task 3: Run Project Verification

**Files:**
- Run project command from root.

- [ ] Run:

```powershell
pnpm run build
```

- [ ] Expected: build passes. This protects against accidental product file
damage during migration.

## Task 4: Final Review

- [ ] Confirm no generated AI docs are meant for `main`.
- [ ] Confirm public docs needing developer selection are flagged.
- [ ] Confirm implementation summary links spec and plan.

