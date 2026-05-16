---
title: OpenSSF scorecard repository settings
type: plan-shard
status: active
parent: "[[docs/work/hardening/plans/2026-05-16-openssf-osps-baseline/index|OpenSSF OSPS baseline implementation plan]]"
created: 2026-05-16T04:42:00
updated: 2026-05-16T04:42:00
tags:
  - agent/plan
  - initiative/hardening
  - security
  - openssf
created_by: codex
updated_by: codex
---

# Scorecard And Repository Settings

## Task 3: OpenSSF Scorecard Measurement

- [x] **Step 1: Verify pinned action SHAs**

Run:

```powershell
git ls-remote https://github.com/actions/checkout refs/tags/v4
git ls-remote https://github.com/ossf/scorecard-action refs/tags/v2.4.3 refs/tags/v2.4.3^{}
git ls-remote https://github.com/github/codeql-action refs/tags/v4
```

Expected pinned refs captured on 2026-05-16:

- `actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5`
- `ossf/scorecard-action@4eaacf0543bb3f2c246792bd56e8cdeffafb205a`
- `github/codeql-action/upload-sarif@7c1e4cf0b20d7c1872b26569c00ba908797a59bf`

If the implementation date is not 2026-05-16, re-check the official
`ossf/scorecard-action` repository before deciding whether to use these pins or
a newer verified release.

Execution note, 2026-05-16: refs were re-verified before creating the workflow:
`actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5`,
`ossf/scorecard-action@4eaacf0543bb3f2c246792bd56e8cdeffafb205a`, and
`github/codeql-action/upload-sarif@7c1e4cf0b20d7c1872b26569c00ba908797a59bf`.

- [x] **Step 2: Create `.github/workflows/scorecard.yml`**

Use this structure:

```yaml
name: OpenSSF Scorecard

on:
  schedule:
    - cron: '30 4 * * 1'
  push:
    branches: [main, hardening]

permissions: read-all

jobs:
  scorecard:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      actions: read
      security-events: write
      id-token: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
        with:
          persist-credentials: false
      - name: Run OpenSSF Scorecard
        uses: ossf/scorecard-action@4eaacf0543bb3f2c246792bd56e8cdeffafb205a
        with:
          results_file: scorecard-results.sarif
          results_format: sarif
          publish_results: true
      - name: Upload Scorecard SARIF
        uses: github/codeql-action/upload-sarif@7c1e4cf0b20d7c1872b26569c00ba908797a59bf
        with:
          sarif_file: scorecard-results.sarif
```

Expected: Scorecard publishes results and uploads SARIF with minimal
permissions.

- [x] **Step 3: Add README badge only after first successful run**

Use the official badge URL from the repository's Scorecard result page after
the workflow has completed successfully.

Expected: README does not advertise a stale or failing score.

Execution note, 2026-05-16: the user explicitly requested adding the badge now,
before the first GitHub run. The README uses the official Scorecard badge URL
shape with `publish_results: true`; the badge may not display a fresh project
score until the workflow has run on GitHub.

## Task 4: Repository Settings Checklist

- [ ] **Step 1: Enable or repair main protection**

Required state:

- `main` accepts changes through PRs.
- Required checks include CI and CodeQL.
- Stale reviews are dismissed when relevant.
- Force pushes and deletions are blocked.
- The disabled `Main branch protection` ruleset is either enabled or replaced
  with an equivalent active rule.

Expected: settings are verified by GitHub UI/API and recorded in the plan log.

- [ ] **Step 2: Enable vulnerability and Dependabot alerts**

Required state:

- Dependency graph enabled.
- Dependabot alerts enabled.
- Dependabot security updates enabled if acceptable for the repository.
- Private vulnerability reporting enabled if available.

Expected: OSPS and Scorecard no longer flag missing dependency/security alert
basics.
