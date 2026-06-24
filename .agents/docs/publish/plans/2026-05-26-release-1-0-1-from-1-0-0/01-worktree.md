---
title: Release 1.0.1 Plan - Worktree Setup
type: implementation-plan-shard
status: active
parent: "[[docs/work/publish/plans/2026-05-26-release-1-0-1-from-1-0-0/index|Release 1.0.1 From 1.0.0 Implementation Plan]]"
created: 2026-05-26T22:07:55
updated: 2026-05-26T22:07:55
tags:
  - agent/plan
  - initiative/publish
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Worktree Setup

## Task 1: Create The Correct Release Worktree

**Files:**

- No product files changed in this task.
- Worktree path: `.claude/worktrees/release-1.0.1-from-1.0.0`

- [ ] **Step 1: Inspect existing release worktrees**

Run from `C:\Users\vic_A\Desktop\vaultman`:

```powershell
git worktree list | Select-String -Pattern 'release-1.0.1-from-1.0.0|release-1.1.1-from-1.0.0|release/1.0.1-from-1.0.0|release/1.1.1-from-1.0.0'
```

Expected: it may show the interrupted `.claude/worktrees/release-1.1.1-from-1.0.0` worktree. Do not reuse that path for `1.0.1`.

- [ ] **Step 2: Remove the interrupted `1.1.1` worktree only if it is clean**

Run:

```powershell
git -C .claude/worktrees/release-1.1.1-from-1.0.0 status --short --branch
```

If output shows only `## release/1.1.1-from-1.0.0`, run:

```powershell
git worktree remove .claude/worktrees/release-1.1.1-from-1.0.0
git branch -D release/1.1.1-from-1.0.0
```

If any modified or untracked file appears, stop and report the dirty paths before removing anything.

- [ ] **Step 3: Create the `1.0.1` worktree from tag `1.0.0`**

Run:

```powershell
git worktree add -b release/1.0.1-from-1.0.0 .claude/worktrees/release-1.0.1-from-1.0.0 1.0.0
git -C .claude/worktrees/release-1.0.1-from-1.0.0 status --short --branch
```

Expected status:

```text
## release/1.0.1-from-1.0.0
```

- [ ] **Step 4: Verify the base contains no AI workflow files**

Run:

```powershell
Get-ChildItem -Force .claude/worktrees/release-1.0.1-from-1.0.0 | Where-Object { $_.Name -in @('AGENTS.md','CLAUDE.md','.agents','.claude','.codex') }
```

Expected: no output.
