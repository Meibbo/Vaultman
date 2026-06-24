---
title: Release 1.0.2 Plan - Coordinator setup
type: plan-step
status: pending
parent: "[[docs/work/publish/plans/2026-06-04-release-1-0-2-gate-normalization/index|Release 1.0.2 gate normalization implementation plan]]"
created: 2026-06-04T05:11:57
updated: 2026-06-04T05:11:57
tags:
  - agent/plan
  - release/1-0-2
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Task 01: Coordinator Setup

**Files:**
- Read: repository status and worktree metadata.
- Modify: none.

- [ ] **Step 1: Confirm the stable worktree**

Run:

```powershell
git -C "C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard" status --short --branch
git -C "C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard" log -1 --oneline
```

Expected:

```text
## hotfix/1.0.2-css-scorecard...
6b49f8c fix(scorecard): remove CSS lint warnings
```

If the branch has changed, record the new commit before continuing.

- [ ] **Step 2: Confirm stable has no AI workflow files**

Run:

```powershell
git -C "C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard" ls-files AGENTS.md CLAUDE.md .agents .claude .codex
```

Expected: no output.

- [ ] **Step 3: Snapshot gate files before edits**

Run:

```powershell
git -C "C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard" ls-files package.json package-lock.json pnpm-lock.yaml pnpm-workspace.yaml .node-version svelte.config.js stylelint.config.mjs .github/workflows/ci.yml .github/workflows/release.yml
```

Expected: `package.json`, `package-lock.json`, `.github/workflows/ci.yml`, and
`.github/workflows/release.yml` exist; pnpm/stylelint/svelte config files do not
exist yet.

- [ ] **Step 4: Commit boundary**

No commit in this task. The first implementation commit is after Task 02.
