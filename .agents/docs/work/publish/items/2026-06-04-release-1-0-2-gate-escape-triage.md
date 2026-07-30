---
title: Release 1.0.2 gate escape triage
type: triage-item
status: active
parent: "[[docs/work/publish/index|Publish]]"
created: 2026-06-04T00:47:38
updated: 2026-06-04T03:24:35
tags:
  - agent/item
  - initiative/publish
  - release/1-0-2
  - release/gate
  - tooling
  - security
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Release 1.0.2 Gate Escape Triage

## Purpose

Capture the release-gate work that can escape a narrow `1.0.2` CSS/Scorecard hotfix if stable keeps using the older `npm`/esbuild gate while `sandbox` already proves a broader `pnpm`/format/lint/tooling path.

This item belongs to [[docs/work/publish/index|Publish]] because it changes the stable release gate and public-release discipline. It is not a feature hardening slice, and it must not push, tag, retag, merge, or publish without an explicit release-management instruction.

## User Framing Captured

- Fixing warnings before a tooling migration can create duplicate work. Node.js, package manager, lockfile, bundler, lint, format, and audit versions can all change the result of a release gate.
- The accidental `1.1.0-beta.1` release from `sandbox` indicates the modern tooling path can build and publish assets; the main failure was UI regression, not basic tooling viability.
- `sandbox` already carries `pnpm`, Prettier, and oxc/`vp fmt` style commands.
  That strengthens the case for bringing at least the low-risk gate pieces into stable before `1.0.2`, instead of polishing an obsolete gate.
- The Obsidian lint dependency is essential enough to audit directly. The repo currently uses `eslint-plugin-obsidianmd`, not a package literally named `obsidian-eslint-plugin`.
- No stream currently has a `stylelint` gate, which leaves CSS anti-patterns and Obsidian Scorecard-style CSS issues dependent on custom scans or late manual review.
- Manifest compatibility numbers must stop being guesses. Any `minAppVersion` or `versions.json` change needs source evidence or a compatibility matrix.

## Current Facts To Verify Before Acting

- Current stream authority:
  [[docs/work/hardening/research/2026-05-27-version-streams-distillation/index|version-streams]] maps `main` to stable, `dev` to beta/nightly, and `sandbox` to canary.
- [[docs/architecture/tooling-libraries|tooling-libraries]] says stable adopts beta tooling only after a promotion gate, while also flagging the stable/beta tooling gap as a reconstruction risk.
- Current `sandbox` package facts observed on 2026-06-04:
  - `packageManager` is `pnpm@11.1.2`.
  - `package.json` has `format`, `format:check`, `format:ox`, `format:ox:check`, `format:prettier`, and `format:prettier:check`.
  - `lint` runs `vp lint && eslint .`; `lint:full` runs `eslint .`.
  - `eslint-plugin-obsidianmd` is declared as `^0.2.9`.
  - `prettier` is declared as `^3.8.3`; `prettier-plugin-svelte` as `^3.5.1`.
  - `obsidian` is declared as `1.12.3`.
  - No `stylelint.config.*` file was found in the active workspace.
- npm registry checks on 2026-06-04:
  - `npm view eslint-plugin-obsidianmd version` returned `0.3.0`.
  - `npm view obsidian-eslint-plugin version` returned `404 Not Found`.
  - `npm view stylelint version` returned `17.12.0`.
- `pnpm-workspace.yaml` already has supply-chain controls such as `minimumReleaseAge: 1440`; stable must either adopt or explicitly defer those controls for `1.0.2`.

## Triage Position

Recommended default for `1.0.2`: adopt the low-risk release-gate tooling before publishing the patch, but do not import the full Vite/Vite+ asset pipeline into stable yet.

- Adopt before `1.0.2`: `pnpm`, Node pinning, format check, Obsidian ESLint plugin audit/update decision, CSS/Scorecard scan, security/audit gate, CodeQL/Dependabot status checks, and manifest compatibility evidence.
- Defer to `dev` promotion gate: esbuild to Vite/Vite+, broad CSS architecture changes, large formatting rewrites, and UI behavior changes not required for the maintenance release.
- Use non-release checkpoint tags or branches for internal tooling milestones.
  Do not use bare `X.Y.Z` tags unless the release workflow is intended to publish public assets.

## Work Packages

Delta inventory source:
[[docs/work/publish/items/2026-06-04-release-1-0-2-gate-delta-inventory|Release 1.0.2 gate delta inventory]].

Parallel execution source:
[[docs/work/publish/items/2026-06-04-release-1-0-2-parallel-dispatch|Release 1.0.2 parallel dispatch plan]].

### P0 - Release Gate Delta Inventory

- Compare `main`/the `1.0.2` hotfix worktree against `sandbox` for:
  package manager, lockfile, Node version, CI setup, build command, audit command, lint command, format command, Obsidian ESLint plugin, CSS/style checks, release assets, and artifact attestations.
- Produce a short source-backed delta table before implementation.
- Decide whether `1.0.2` will migrate stable from `npm` to `pnpm`. If deferred, record the release-risk accepted by keeping the old gate.
- Pin the Node version used by local release verification and GitHub Actions so local and hosted gates cannot silently disagree.

### P0 - Obsidian ESLint Gate

- Verify the active package name and latest version. Current observed package is `eslint-plugin-obsidianmd`; literal `obsidian-eslint-plugin` was not found on npm on 2026-06-04.
- Read the `eslint-plugin-obsidianmd` changelog/release notes before updating from `^0.2.9` to `0.3.0` or later.
- Confirm the plugin's rules are actually active in `eslint.config.mts`.
- Add the resulting Obsidian-specific lint command to the release gate, or document exactly why it cannot be release-blocking for `1.0.2`.

### P0 - CSS And Style Gate

- Decide whether `stylelint` becomes a `1.0.2` release-blocking gate or a separate post-release hardening item.
- If included in `1.0.2`, start with a narrow config that blocks release-risk CSS patterns without forcing a full style-system rewrite.
- Preserve the existing custom Scorecard scan for patterns that stylelint does not understand directly.
- At minimum, ensure the gate catches the CSS issues that already reached a stable release: unsafe `!important` usage, `display: contents` when it breaks Obsidian/plugin rendering assumptions, and release-asset CSS omissions.

### P0 - Format Gate

- Decide whether `format:check` enters CI/release verification for `1.0.2`.
- Prefer `format:check` over a broad formatting rewrite inside the maintenance release. If formatting changes are required, keep them in a separate commit so review can distinguish gate adoption from product/code changes.
- Carry Prettier Svelte and `vp fmt`/oxc behavior from `sandbox` only after confirming it does not change the stable asset output unexpectedly.

### P0 - Security, CodeQL, Dependabot, And OpenSSF

- Recheck GitHub Dependabot alerts, open Dependabot PRs, CodeQL alerts, and Scorecard SARIF before releasing.
- Fix default-branch CodeQL findings that are objectively low-risk and source-local, such as dead defensive guards.
- Add or repair `SECURITY.md`, workflow token permissions, branch-protection settings, and other Scorecard checks that are feasible before `1.0.2`.
- Keep separate the checks that are code/config-fixable from repository-maturity or GitHub-admin checks that cannot be solved by a patch commit alone.

### P0 - Manifest Compatibility Evidence

- Treat `manifest.json.minAppVersion` and `versions.json` as compatibility promises, not filler metadata.
- Do not lower or raise `minAppVersion` for `1.0.2` without evidence from official Obsidian docs, API usage, and a tested compatibility matrix.
- Record whether current `1.12.0` is a proven minimum, a conservative tested floor, or simply inherited metadata.
- If the minimum app version stays unchanged, document why `versions.json` is or is not edited for `1.0.2`.

## Acceptance Criteria

- A source-backed release-gate delta table exists before implementation.
- The `1.0.2` branch uses one package manager and one pinned Node version across local verification and GitHub Actions.
- `verify` or the explicit release gate covers lint, type/check, build, security audit, format check decision, CSS/Scorecard scan, and release asset presence.
- `eslint-plugin-obsidianmd` latest-version and rule-activation decisions are documented.
- `stylelint` is either integrated narrowly for `1.0.2` or explicitly deferred with a reason and a follow-up path.
- `manifest.json` and `versions.json` changes are backed by compatibility evidence, not guessed numbers.
- Dependabot, CodeQL, and Scorecard status are checked against GitHub before the public release.
- `main` remains free of AI workflow files.
- No bare SemVer tag is created for internal checkpoints.

## Open Questions

- Should `pnpm` migration be mandatory for `1.0.2`, or is the team willing to publish one more stable patch on the older `npm` gate?
- If `stylelint` exposes many legacy CSS issues, which subset blocks `1.0.2` and which subset becomes a post-release hardening plan?
- Does the Obsidian ESLint plugin update from `0.2.9` to `0.3.0` change rules in ways that require product-code fixes before release?
- What exact Obsidian app versions define the supported compatibility matrix for stable users?
