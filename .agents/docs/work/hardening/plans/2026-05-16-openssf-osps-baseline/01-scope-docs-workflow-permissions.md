---
title: OpenSSF scope docs workflow permissions
type: plan-shard
status: draft
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

# Scope, Public Docs, And Workflow Permissions

## Task 0: Isolate Scope

- [ ] **Step 1: Record current dirty root files**

Run:

```powershell
git status --short --branch
git status --porcelain=v1 -- README.md CONTRIBUTING.md package.json manifest.json .github/workflows/ci.yml .github/workflows/codeql.yml LICENSE SECURITY.md CODE_OF_CONDUCT.md
```

Expected: root files may be dirty before this plan starts. Do not stage or
restore existing dirty files unless they are intentionally owned by the current
slice.

- [ ] **Step 2: Choose the first executable slice**

Use this order:

1. Local security docs and workflow permissions.
2. Scorecard measurement.
3. Repository settings.
4. Dependency audit response.
5. Release provenance.

Expected: each slice can be reviewed and committed independently.

## Task 1: Public Security And Community Files

- [ ] **Step 1: Create `SECURITY.md`**

Use this initial content:

```markdown
# Security Policy

## Supported Versions

Vaultman is pre-1.0 software. Security fixes are applied to the latest release
line and to unreleased hardening branches when a fix is needed before the next
public release.

## Reporting A Vulnerability

Please report suspected vulnerabilities privately through GitHub Security
Advisories for this repository. Do not open a public issue for a suspected
vulnerability.

If GitHub Security Advisories are unavailable, contact the maintainer through
the repository profile and include:

- affected Vaultman version or commit;
- Obsidian version and platform;
- steps to reproduce;
- impact and affected files or vault data;
- any proof of concept details needed to validate the issue.

The maintainer will acknowledge validated reports, assess impact, and publish a
fix or mitigation when appropriate.

## Scope

Security reports should focus on behavior that can affect user vault data,
plugin execution, release assets, dependencies, or repository supply chain.
```

- [ ] **Step 2: Reconcile `LICENSE` and `CONTRIBUTING.md`**

Run:

```powershell
git show HEAD:CONTRIBUTING.md
git ls-tree -r --name-only origin/main 2>$null | rg "^(LICENSE|CONTRIBUTING.md)$"
```

Expected: determine whether the local deletion of `CONTRIBUTING.md` is
intentional. If it is not intentional, restore the current desired content in a
separate commit. If it is intentional, document why before release work.

- [ ] **Step 3: Update README security links**

Add visible links only after the files exist:

```markdown
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [License](LICENSE)
```

Expected: README links resolve locally.

## Task 2: Workflow Token Permissions

- [ ] **Step 1: Add default read-only permissions to CI**

Modify `.github/workflows/ci.yml` near the top:

```yaml
permissions:
  contents: read
```

Expected: CI uses the least privileged token needed for checkout, install,
lint, build, coverage, and artifact upload. If artifact upload requires another
permission in this repository, add only that permission and record why.

- [ ] **Step 2: Add permissions to CodeQL query tests**

Modify `.github/workflows/codeql.yml` in the `query-tests` job:

```yaml
permissions:
  contents: read
```

Expected: the job has explicit permissions instead of inheriting repository
defaults.

- [ ] **Step 3: Verify workflow syntax through local checks**

Run:

```powershell
pnpm exec prettier --check ".github/workflows/*.yml"
git diff --check -- .github/workflows/ci.yml .github/workflows/codeql.yml
```

Expected: formatting and diff hygiene pass.
