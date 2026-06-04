---
title: Release 1.0.2 Plan - CI and release workflows
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

# Task 07: CI And Release Workflows

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/release.yml`
- Depends on: final `package.json` scripts from Tasks 02-04

- [ ] **Step 1: Update CI setup-node cache**

In `.github/workflows/ci.yml`, change setup-node to:

```yaml
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
        with:
          node-version: '24'
          cache: pnpm
```

- [ ] **Step 2: Update CI install and gates**

Replace:

```yaml
      - run: npm ci
      - run: npm run verify
      - run: npm run security:audit
```

with:

```yaml
      - name: Enable Corepack
        run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm run verify
      - run: pnpm run security:audit
```

- [ ] **Step 3: Update release setup-node cache**

In `.github/workflows/release.yml`, change setup-node to:

```yaml
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
        with:
          node-version: '24'
          cache: pnpm
```

- [ ] **Step 4: Update release install and gates**

Replace release commands:

```yaml
      - run: npm ci
      - run: npm run verify
      - run: npm run security:audit
      - run: npm run build:plugin
```

with:

```yaml
      - name: Enable Corepack
        run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm run verify
      - run: pnpm run security:audit
      - run: pnpm run build:plugin
```

- [ ] **Step 5: Keep release publishing behavior unchanged**

Verify `release.yml` still:

```yaml
    tags:
      - '[0-9]*.[0-9]*.[0-9]*'
```

and still uses:

```bash
--title "${GITHUB_REF_NAME}"
```

Do not add prerelease behavior or change tag patterns in this plan.

- [ ] **Step 6: Run workflow text checks**

Run:

```powershell
rg "npm ci|npm run" .github/workflows/ci.yml .github/workflows/release.yml
rg "cache: pnpm|pnpm install --frozen-lockfile|pnpm run verify" .github/workflows/ci.yml .github/workflows/release.yml
```

Expected: first command has no output; second command finds both workflows.

- [ ] **Step 7: Commit**

Run:

```powershell
git add .github/workflows/ci.yml .github/workflows/release.yml
git commit -m "ci(release): run stable gates with pnpm"
```
