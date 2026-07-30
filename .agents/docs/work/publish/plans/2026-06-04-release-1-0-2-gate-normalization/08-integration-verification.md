---
title: Release 1.0.2 Plan - integration verification
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

# Task 08: Integration Verification

**Files:**
- Modify: none unless a verification failure requires returning to an earlier task.
- Depends on: Tasks 02-07.

- [ ] **Step 1: Install exactly as CI will install**

Run:

```powershell
corepack enable
corepack prepare pnpm@11.1.2 --activate
pnpm install --frozen-lockfile
```

Expected: exit 0.

- [ ] **Step 2: Run individual gates**

Run:

```powershell
pnpm run lint
pnpm run check
pnpm run format:check
pnpm run stylelint
pnpm run build:plugin
pnpm run test:scorecard
pnpm run security:audit
```

Expected: every command exits 0.

- [ ] **Step 3: Run aggregate gate**

Run:

```powershell
pnpm run verify
```

Expected: exit 0, including lint, check, format, stylelint, build, and Scorecard scan.

- [ ] **Step 4: Verify release assets**

Run:

```powershell
Test-Path main.js
Test-Path manifest.json
Test-Path styles.css
Get-Item main.js, manifest.json, styles.css | Select-Object Name,Length
```

Expected: all `Test-Path` calls return `True`; each asset length is greater than 0.

- [ ] **Step 5: Verify no AI files in stable candidate**

Run:

```powershell
git ls-files AGENTS.md CLAUDE.md .agents .claude .codex
```

Expected: no output.

- [ ] **Step 6: Verify no release tag was created**

Run:

```powershell
git tag --points-at HEAD
```

Expected: no `1.0.2` tag unless the maintainer explicitly approved release tagging after this plan.

- [ ] **Step 7: Check whitespace and status**

Run:

```powershell
git diff --check
git status --short --branch
```

Expected: `git diff --check` exits 0. Status shows only intentional committed or uncommitted release-candidate changes.

- [ ] **Step 8: Recheck GitHub remote gates before release**

Run:

```powershell
gh api repos/Meibbo/Vaultman/dependabot/alerts --paginate -q '[.[] | select(.state=="open")] | length'
gh api repos/Meibbo/Vaultman/code-scanning/alerts --paginate -q '[.[] | select(.state=="open")] | map({number,tool:.tool.name,rule:.rule.id,severity:.rule.severity})'
gh pr list --repo Meibbo/Vaultman --state open --json number,title,headRefName,baseRefName,mergeStateStatus --limit 30
```

Expected: Dependabot alerts count is `0`; CodeQL #64 should close only after GitHub analyzes the PR/default branch; Scorecard admin/maturity alerts may remain and must be listed separately.

- [ ] **Step 9: Commit verification record if docs are updated**

If a verification record is added under `docs/work/publish/items/`, commit it:

```powershell
git add .agents/docs/work/publish/items
git commit -m "docs(release): record 1.0.2 gate verification"
```

Do not create a tag or publish a release.
