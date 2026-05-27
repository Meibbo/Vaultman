---
title: Release 1.0.1 Plan - Verification And Remote Release Handling
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

# Verification And Remote Release Handling

## Task 9: Run Local Verification Gates

**Files:** no code edits expected.

- [ ] **Step 1: Verify package installation**

Run in `.claude/worktrees/release-1.0.1-from-1.0.0`:

```powershell
npm ci
```

Expected: exit 0.

- [ ] **Step 2: Run full local verify**

Run:

```powershell
npm run verify
```

Expected: `lint`, `check`, `build:plugin`, and `test:scorecard` exit 0.

- [ ] **Step 3: Verify integration tests**

Run:

```powershell
npm run test:integrity
```

Expected: exit 0. If Obsidian integration setup fails for an environment reason, capture the exact error and rerun `npm run check`, `npm run build:plugin`, and `npm run test:scorecard`.

- [ ] **Step 4: Run security audit**

Run:

```powershell
npm run security:audit
```

Expected: exit 0. If audit reports moderate-only dev advisories, stop and ask whether to proceed with a documented exception or patch dependencies.

- [ ] **Step 5: Verify release asset staging manually**

Run:

```powershell
npm run build:plugin
Remove-Item -Recurse -Force dist\release -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force dist\release | Out-Null
Copy-Item main.js dist\release\main.js
Copy-Item styles.css dist\release\styles.css
Copy-Item manifest.json dist\release\manifest.json
Get-Item dist\release\main.js, dist\release\styles.css, dist\release\manifest.json | Select-Object Name,Length
```

Expected: all three files exist and `Length` is greater than 0.

- [ ] **Step 6: Verify workflow attestation subjects**

Run:

```powershell
Select-String -Path .github\workflows\release.yml -Pattern 'dist/release/main.js|dist/release/styles.css|actions/attest' -Context 1,1
```

Expected: `actions/attest` is present and the subject path includes both `dist/release/main.js` and `dist/release/styles.css`.

- [ ] **Step 7: Verify no AI files are in the release branch**

Run:

```powershell
Get-ChildItem -Force | Where-Object { $_.Name -in @('AGENTS.md','CLAUDE.md','.agents','.claude','.codex') }
```

Expected: no output.

- [ ] **Step 8: Verify branch diff scope and whitespace**

Run:

```powershell
git diff --name-status 1.0.0..HEAD
git diff --check 1.0.0..HEAD
```

Expected: no AI files, no unrelated product files, and `git diff --check` exit 0.

## Task 10: Record Verification In Publish Docs

**Files:** create `.agents/docs/work/publish/items/2026-05-26-release-1-0-1-candidate-verification.md`

- [ ] **Step 1: Create the verification record in the main sandbox docs worktree**

The record must include the branch, base tag, exact command outcomes, release asset sizes, attestation scan evidence, AI-file check result, and the statement that no remote push/tag/merge/release edit was performed.

- [ ] **Step 2: Link verification record from publish index**

In `.agents/docs/work/publish/index.md`, add:

```markdown
- [[docs/work/publish/items/2026-05-26-release-1-0-1-candidate-verification|Release 1.0.1 candidate verification]]
```

- [ ] **Step 3: Commit verification docs**

Run from the main sandbox worktree:

```powershell
git add .agents/docs/work/publish/index.md .agents/docs/work/publish/items/2026-05-26-release-1-0-1-candidate-verification.md
git commit -m "docs(publish): record 1.0.1 candidate verification"
```

## Task 11: Prepare Remote Release Actions For User Approval

**Files:** no local code edits.

- [ ] **Step 1: Summarize the candidate branch**

Run:

```powershell
git -C .claude/worktrees/release-1.0.1-from-1.0.0 log --oneline --decorate 1.0.0..HEAD
git -C .claude/worktrees/release-1.0.1-from-1.0.0 diff --stat 1.0.0..HEAD
```

- [ ] **Step 2: Ask before push, PR, PR #24 closure, or GitHub Release edits**

Do not push, open a PR, close PR #24, tag, publish, mark `1.1.0` prerelease, or delete `1.1.0` without explicit user approval.

If the user approves push:

```powershell
git -C .claude/worktrees/release-1.0.1-from-1.0.0 push -u origin release/1.0.1-from-1.0.0
```

If the user approves closing PR #24, comment:

```text
Superseded by the 1.0.1 stable patch plan. We are restoring the 1.0.x stable line for new users instead of publishing 1.1.1 from the regressed 1.1.0 line.
```

If the user approves marking `1.1.0` as superseded after `1.0.1` is published and verified:

```powershell
gh release edit 1.1.0 --repo Meibbo/Vaultman --prerelease --notes "Superseded by Vaultman 1.0.1. This release is retained for history but should not be installed by new users."
```
