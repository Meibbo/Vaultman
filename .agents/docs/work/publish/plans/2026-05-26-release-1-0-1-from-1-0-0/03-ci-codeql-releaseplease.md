---
title: Release 1.0.1 Plan - CI, CodeQL, And Release Please
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

# CI, CodeQL, And Release Please

## Task 3: Port npm-Adapted CI And Release-Please Setup

**Files:**

- Create: `.github/dependabot.yml`
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/codeql.yml`
- Create: `.github/workflows/release-please.yml`
- Create: `.github/workflows/scorecard.yml`
- Create: `.github/codeql/codeql-config.yml`
- Create: `release-please-config.json`
- Create: `.release-please-manifest.json`

- [ ] **Step 1: Copy workflow support files**

Run from `.claude/worktrees/release-1.0.1-from-1.0.0`:

```powershell
New-Item -ItemType Directory -Force .github\workflows | Out-Null
New-Item -ItemType Directory -Force .github\codeql | Out-Null
Copy-Item ..\release-pr-24-beta2\.github\dependabot.yml .github\dependabot.yml
Copy-Item ..\release-pr-24-beta2\.github\workflows\codeql.yml .github\workflows\codeql.yml
Copy-Item ..\release-pr-24-beta2\.github\workflows\release-please.yml .github\workflows\release-please.yml
Copy-Item ..\release-pr-24-beta2\.github\workflows\scorecard.yml .github\workflows\scorecard.yml
Copy-Item ..\release-pr-24-beta2\.github\codeql\codeql-config.yml .github\codeql\codeql-config.yml
Copy-Item ..\release-pr-24-beta2\release-please-config.json release-please-config.json
```

- [ ] **Step 2: Simplify CodeQL if custom query files are not copied**

Replace `.github/codeql/codeql-config.yml` with:

```yaml
name: Vaultman CodeQL configuration

queries:
  - uses: security-extended
  - uses: security-and-quality
```

Remove the `query-tests` job from `.github/workflows/codeql.yml`, leaving only the `analyze` job.

- [ ] **Step 3: Create npm-adapted CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, sandbox, hardening]
  pull_request:
    branches: [main, sandbox, hardening]

permissions:
  contents: read
  pull-requests: read

jobs:
  guard-ai-files:
    name: Guard main against AI workflow files
    if: github.event_name == 'pull_request' && github.base_ref == 'main'
    runs-on: ubuntu-latest
    steps:
      - name: Detect AI workflow files
        id: ai
        uses: dorny/paths-filter@fbd0ab8f3e69293af611ebaee6363fc25e6d187d
        with:
          token: ${{ github.token }}
          list-files: shell
          filters: |
            ai:
              - 'AGENTS.md'
              - 'CLAUDE.md'
              - '.agents/**'
              - '.claude/**'
      - name: Fail if AI workflow files target main
        if: steps.ai.outputs.ai == 'true'
        env:
          AI_FILES: ${{ steps.ai.outputs.ai_files }}
        shell: bash
        run: |
          echo "::error::PRs to main must not include AI workflow files."
          printf 'Blocked files:\n%s\n' "${AI_FILES}"
          exit 1

  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd
        with:
          persist-credentials: false
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
        with:
          node-version: '24'
          cache: npm
      - run: npm ci
      - run: npm run verify
      - run: npm run security:audit
      - run: npm run test:integrity
```

- [ ] **Step 4: Initialize release-please files**

Ensure `release-please-config.json` contains `manifest.json` and `versions.json` in `extra-files`.

Create `.release-please-manifest.json`:

```json
{
  ".": "1.0.1"
}
```

- [ ] **Step 5: Commit CI and release-please setup after adding release workflow**

Do not commit yet; continue to [[docs/work/publish/plans/2026-05-26-release-1-0-1-from-1-0-0/04-release-workflow|Release Workflow]] so workflow setup lands in one commit.
