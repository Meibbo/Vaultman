---
title: Release 1.0.2 inline execution verification
type: verification-record
status: complete
parent: "[[docs/work/publish/index|Publish]]"
created: 2026-06-04T00:00:00
updated: 2026-06-04T00:00:00
tags:
  - agent/verification
  - initiative/publish
  - release/1-0-2
  - release/gate
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Release 1.0.2 Inline Execution Verification

## Scope

Inline execution of the accepted [[docs/work/publish/specs/2026-06-04-release-1-0-2-gate-normalization-design|Release 1.0.2 gate normalization design]] and [[docs/work/publish/plans/2026-06-04-release-1-0-2-gate-normalization/index|implementation plan]] in the stable hotfix worktree:

`C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard`

Branch: `hotfix/1.0.2-css-scorecard`.

No push, tag, merge, or GitHub Release mutation was performed.

## Local Commits

Current hotfix HEAD after execution:

- `ec50aaf chore(format): format vaultman frame`
- `daef546 ci(release): run stable gates with pnpm`
- `f94fdea docs(release): prepare 1.0.2 metadata`
- `6fbcdcd fix(security): remove codeql dead guard and add policy`
- `a705ef1 chore(release): normalize stable gate tooling`
- Previous base worktree commit: `6b49f8c fix(scorecard): remove CSS lint warnings`

The branch is `ahead 6` over `origin/main` and the worktree status was clean at close:

```text
## hotfix/1.0.2-css-scorecard...origin/main [ahead 6]
```

## Implemented Gate Changes

- Replaced npm lock/install path with `pnpm@11.1.2`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and `.node-version` Node 24 baseline.
- Removed `package-lock.json`.
- Pinned the stable dependency graph instead of allowing broad range drift:
  `obsidian@1.12.3`, WebdriverIO gate packages, Svelte, Vitest, and gate tooling.
- Added `svelte-check` with `svelte.config.js` and `verbatimModuleSyntax`.
- Added release-blocking `format:check`, `stylelint`, and aggregate `verify` scripts.
- Added Prettier Svelte baseline and formatted Svelte files.
- Added stylelint config for `styles.css`; `no-duplicate-selectors` is disabled because stable CSS still uses cascade-layered iteration overrides. The release-risk rules for `!important`, `display: contents`, and ignored declarations remain blocking.
- Extended `scripts/scorecard-regression-check.mjs` to assert `format:check`, `stylelint`, and `svelte-check` are present in the gate.
- Removed the CodeQL dead guard in `src/modals/modalQueueDetails.ts`.
- Added `SECURITY.md`.
- Added `CHANGELOG.md` entry for `1.0.2`.
- Updated CI and release workflows to use Corepack + pnpm with Node 24 and `cache: pnpm`.

## Verification Evidence

Fresh post-commit gates:

```text
pnpm run verify
exit 0
svelte-check found 0 errors and 0 warnings
All matched files use Prettier code style!
Scorecard regression scan passed (17 checks).
```

```text
pnpm run security:audit
exit 0
No known vulnerabilities found
```

Additional checks:

```text
pnpm install --frozen-lockfile
exit 0
```

`corepack enable pnpm` emitted a local Windows `EPERM` against `C:\Program Files\nodejs\pnpm`; `corepack prepare pnpm@11.1.2 --activate` and `pnpm install --frozen-lockfile` still completed with exit 0. This is a local machine permission artifact, not a CI workflow blocker.

```text
git diff --check
exit 0

git ls-files AGENTS.md CLAUDE.md .agents .claude .codex
no output

git tag --points-at HEAD
no output
```

Release assets exist and are non-empty:

```text
main.js        227206
manifest.json    293
styles.css      99745
```

Manifest/version compatibility was verified and left unchanged:

```json
"version": "1.0.2",
"minAppVersion": "1.12.0"
```

```json
"1.0.2": "1.12.0"
```

## Remote Gate Snapshot

GitHub CLI checks on 2026-06-04:

```text
Dependabot open alerts: 0
```

Open code-scanning alerts:

- CodeQL `#64`, `js/unneeded-defensive-code`, severity `note`; expected to close only after GitHub analyzes the branch/PR/default branch containing the `modalQueueDetails.ts` fix.
- Scorecard administrative/maturity alerts remain open: branch protection, token permissions, code review, maintained, security policy, CII best practices, fuzzing, SAST, CI tests. The new `SECURITY.md` should address the local security-policy file gap, but Scorecard must rerun remotely.

Open PRs targeting `main` remain blocked dependabot/release automation PRs:

- `#31` mocha `10.8.2 -> 11.7.6`
- `#30` esbuild `0.25.12 -> 0.28.0`
- `#29` `@wdio/local-runner 9.27.1 -> 9.27.2`
- `#28` `actions/setup-node 4.4.0 -> 6.4.0`
- `#27` `github/codeql-action 4.35.5 -> 4.36.0`
- `#26` `googleapis/release-please-action` pin update
- `#24` release-please `1.1.0`
- `#19` globals `14.0.0 -> 17.6.0`
- `#18` `@eslint/js 9.30.1 -> 10.0.1`

## Residual Risks

- `obsidian-integration-testing@4.1.6` has a non-fatal postinstall patch-package script. The stable graph remains pinned to the prior npm-lock version; latest npm version is `4.2.0`, but upgrading it was intentionally left out of the `1.0.2` hotfix because it changes the integration-test graph.
- `stylelint-config-recommended` initially flagged many duplicate selectors in stable CSS. Those are not fixed in this hotfix because merging them can change cascade order. CSS consolidation belongs to a later style architecture item.
- No release tag was created. `1.0.2` is release-ready for maintainer review, not published.
