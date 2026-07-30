---
title: OpenSSF scope docs workflow permissions
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

# Scope, Public Docs, And Workflow Permissions

## Task 0: Isolate Scope

- [x] **Step 1: Record current dirty root files**

Run:

```powershell
git status --short --branch
git status --porcelain=v1 -- README.md CONTRIBUTING.md package.json manifest.json .github/workflows/ci.yml .github/workflows/codeql.yml LICENSE SECURITY.md CODE_OF_CONDUCT.md
```

Expected: root files may be dirty before this plan starts. Do not stage or restore existing dirty files unless they are intentionally owned by the current slice.

- [x] **Step 2: Choose the first executable slice**

Use this order:

1. Local security docs and workflow permissions.
2. Scorecard measurement.
3. Repository settings.
4. Dependency audit response.
5. Release provenance.

Expected: each slice can be reviewed and committed independently.

Execution note, 2026-05-16: root files for this slice started clean. Unrelated Explorer files were dirty and were not touched. The first executable slice was local security docs plus workflow permissions.

## Task 1: Public Security And Community Files

- [x] **Step 1: Create `SECURITY.md`**

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

- [x] **Step 2: Reconcile `LICENSE` and `CONTRIBUTING.md`**

Run:

```powershell
git show HEAD:CONTRIBUTING.md
git ls-tree -r --name-only origin/main 2>$null | rg "^(LICENSE|CONTRIBUTING.md)$"
```

Expected: determine whether the local deletion of `CONTRIBUTING.md` is intentional. If it is not intentional, restore the current desired content in a separate commit. If it is intentional, document why before release work.

Execution note, 2026-05-16: the user confirmed `CONTRIBUTING.md` was removed because it was very outdated. It remains absent. OpenSSF OSPS Baseline v2026.02.19 requires Level 1 projects to document an explanation of the contribution process, and recommends `CONTRIBUTING.md`; the file name is not itself mandatory. A minimal contribution process was added to `README.md`.
The user clarified that `origin/main:LICENSE` is canonical, so `LICENSE` was restored from `origin/main`; `README.md` and `package.json` were aligned to Apache-2.0.

- [x] **Step 3: Update README security links**

Add visible links only after the files exist:

```markdown
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [License](LICENSE)
```

Expected: README links resolve locally.

Execution note, 2026-05-16: README now links `SECURITY.md`, includes a minimal `Contributing` section, and links `LICENSE` as Apache License 2.0.

## Task 2: Workflow Token Permissions

- [x] **Step 1: Add default read-only permissions to CI**

Modify `.github/workflows/ci.yml` near the top:

```yaml
permissions:
  contents: read
```

Expected: CI uses the least privileged token needed for checkout, install, lint, build, coverage, and artifact upload. If artifact upload requires another permission in this repository, add only that permission and record why.

- [x] **Step 2: Add permissions to CodeQL query tests**

Modify `.github/workflows/codeql.yml` in the `query-tests` job:

```yaml
permissions:
  contents: read
```

Expected: the job has explicit permissions instead of inheriting repository defaults.

- [x] **Step 3: Verify workflow syntax through local checks**

Run:

```powershell
pnpm exec prettier --check ".github/workflows/*.yml"
git diff --check -- .github/workflows/ci.yml .github/workflows/codeql.yml
```

Expected: formatting and diff hygiene pass.

Execution note, 2026-05-16: `pnpm exec prettier --check ".github/workflows/*.yml"` passed after formatting the workflows, and `git diff --check -- SECURITY.md README.md .github/workflows/ci.yml .github/workflows/codeql.yml` passed.
