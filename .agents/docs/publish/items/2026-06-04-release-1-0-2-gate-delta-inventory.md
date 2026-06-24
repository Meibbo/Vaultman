---
title: Release 1.0.2 gate delta inventory
type: triage-item
status: active
parent: "[[docs/work/publish/index|Publish]]"
created: 2026-06-04T03:07:08
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
# Release 1.0.2 Gate Delta Inventory

## Scope

Read-only delta captured on 2026-06-04 before implementing any `1.0.2` gate
changes. Compares:

- Stable hotfix candidate: `hotfix/1.0.2-css-scorecard` at
  `6b49f8c30d73938aa8d56e408d90173e09d5f8d5`.
- Canary reference: `sandbox` at
  `aa4445788473e11b6cce3f667fa290e29a788177`.

This inventory is a release-gate planning record. It does not authorize pushing,
tagging, retagging, merging, or publishing.

Parallel execution source:
[[docs/work/publish/items/2026-06-04-release-1-0-2-parallel-dispatch|Release 1.0.2 parallel dispatch plan]].

## Delta Table

| Surface | `hotfix/1.0.2-css-scorecard` | `sandbox` canary | Release-gate implication | Action |
| --- | --- | --- | --- | --- |
| Stream role | Stable patch candidate, version `1.0.2`. | Canary stream, version `1.1.0-beta.1`. | Canary proves tooling viability but not stable UX safety. | Use canary as tooling reference only; do not merge product/UI wholesale. |
| Package manager | `npm`, `package-lock.json`, no `packageManager`. | `pnpm@11.1.2`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`. | Stable gate can diverge from canary lock/audit behavior. | P0 decision: migrate stable gate to pnpm before `1.0.2` or record accepted risk. |
| Node pin | CI uses Node `24`; no `.node-version`; `@types/node` is `^22.0.0`. | `.node-version` is `24`; `engines.node` is `>=24.0.0`; `@types/node` is `^24.12.4`. | Local and CI gates can disagree on stable. | Add `.node-version`/engine policy and align Node types if adopting Node 24 as release floor. |
| Build tool | Root `esbuild.config.mjs`; `build:plugin` runs `node esbuild.config.mjs production`. | `vite.config.ts`, `svelte.config.js`, `scripts/esbuild.config.mjs`; `build:plugin` runs `vp build`. | Vite/Vite+ changes asset/CSS behavior and is too broad for blind patch adoption. | Defer esbuild to Vite/Vite+ promotion to `dev`; keep stable build conservative for `1.0.2`. |
| Type/check gate | `check` runs `tsc -noEmit -skipLibCheck`; `build` also runs `tsc`. | `check` runs `svelte-check`; `build` runs `tsc` plus `vp build`. | Stable has weaker Svelte-specific diagnostics. | Evaluate adding `svelte-check` separately from Vite migration; do not force if it explodes patch scope. |
| Lint gate | `eslint .`; `eslint-plugin-obsidianmd` pinned at `0.1.9`. | `vp lint && eslint .`; `eslint-plugin-obsidianmd` `^0.2.9`; oxlint plugin present. | Stable Obsidian-specific lint is older than canary and npm latest. | P0: read `eslint-plugin-obsidianmd` changelog and decide update to `0.3.0`; confirm rules active in `eslint.config.mts`. |
| Format gate | No `format` or `format:check`. | `format`, `format:check`, `format:ox`, `format:prettier`. | Stable cannot block formatting drift. | Add a narrow `format:check` decision. If Vite+ is deferred, do not import `vp fmt` blindly. |
| CSS/style gate | Custom `test:scorecard` scan; no `stylelint`. | No `stylelint.config.*` found either. | CSS failures reached stable because no stream has a standard CSS linter. | P0: decide narrow `stylelint` gate for release-risk CSS, or explicitly defer with custom Scorecard scan retained. |
| Security audit | `npm audit --audit-level=high`. | Custom `scripts/security-audit.mjs` for prod and dev scopes under pnpm. | Audit semantics differ between streams. | If pnpm is adopted, port the custom audit gate or document why npm audit remains the stable floor. |
| CI workflow | `npm ci`, `npm run verify`, `npm run security:audit`; cache `npm`. | `vp install`, split audit/lint/check/build/coverage; cache enabled through `vite-plus`. | CI modernization is coupled to package-manager choice. | Update CI only after package-manager decision; avoid adopting Vite+ CI as a side effect. |
| Release workflow | `npm ci`, `npm run verify`, audit, `build:plugin`; publishes `main.js`, `manifest.json`, `styles.css`. | `vp install`, verify, audit, build, SBOM; publishes assets with SBOM path. | Stable has release assets but weaker SBOM/tooling parity. | Decide whether SBOM is in `1.0.2`; do not block patch if it broadens scope too far. |
| Release automation | `release-please.yml` exists. | No `release-please.yml` in `sandbox`. | Stream mechanics differ. | Do not copy/remove release automation without a dedicated publish-flow decision. |
| Security policy | No `SECURITY.md`. | `SECURITY.md` exists. | OpenSSF `SecurityPolicyID` remains fixable on stable. | Add `SECURITY.md` to stable release branch unless license/process review blocks it. |
| License metadata | `package.json` says `MIT`; `LICENSE` is MIT. | `package.json` says `Apache-2.0`; `LICENSE` is Apache 2.0. | License divergence is release-facing, not a minor tooling detail. | Do not change stable license in `1.0.2` without explicit maintainer/legal decision. |
| Changelog | Has `1.0.1`; no `1.0.2` section yet. | Lacks `1.0.1`/`1.0.2` stable history. | `1.0.2` release notes are not ready. | Add `1.0.2` changelog entry on stable candidate. |
| Manifest | `version: 1.0.2`; `minAppVersion: 1.12.0`; `isDesktopOnly: false`. | `version: 1.1.0-beta.1`; same `minAppVersion`; same desktop flag. | Compatibility promise is unchanged but evidence remains weak. | Keep `1.12.0` unless evidence supports changing it; document tested floor. |
| `versions.json` | Includes `1.0.2: 1.12.0` and older `0.x` entries; mixed beta floor history. | Includes `1.1.0-beta.1: 1.12.0` and beta history not matching hotfix. | History divergence can mislead compatibility reasoning. | Do not normalize by guess. Reconcile only with release-history evidence. |
| GitHub Dependabot | Open Dependabot alerts: `0`; open Dependabot PRs remain blocked. | N/A for canary; default branch gate owns alerts. | No vulnerability alert blocks release, but maintenance PRs still matter. | Do not merge all dependency PRs into `1.0.2`; triage PRs that affect gate/security. |
| GitHub Code Scanning | 12 open alerts: 1 CodeQL, 11 Scorecard. | N/A for canary; default branch gate owns alerts. | `1.0.2` cannot claim clean code scanning yet. | Fix CodeQL dead guard and fixable Scorecard items; separate repo-admin/maturity items. |
| Branch protection | Ruleset active; requires 1 approval and checks `verify` + `Analyze`. | N/A for canary. | Scorecard still flags branch protection because settings are not maximal. | Treat as admin hardening, not a code patch unless maintainer changes rules. |

## External Gate Snapshot

- Latest stable release observed: GitHub Release `1.0.1`, not prerelease,
  published 2026-05-27, target `main`.
- Misreleased canary/beta artifact observed: GitHub Release tag `1.1.0`, titled
  `1.1.0-beta.1`, marked prerelease, published 2026-05-20.
- Dependabot alerts API returned `0` open alerts.
- Open PRs include Dependabot PRs for Mocha, esbuild, WebdriverIO runner,
  `actions/setup-node`, CodeQL action, release-please action, globals, and
  `@eslint/js`; most were blocked by review, not by failing checks. PR #18
  still has failing `verify`.
- CodeQL alert #64:
  `src/modals/modalQueueDetails.ts:231`, message
  `This guard always evaluates to false.`
- Scorecard alerts open:
  `CITestsID`, `SASTID`, `FuzzingID`, `CIIBestPracticesID`,
  `SecurityPolicyID`, `MaintainedID`, `CodeReviewID`, `TokenPermissionsID`
  x3, and `BranchProtectionID`.

## Executable Checklist For The Next Release Pass

- [ ] Confirm the `1.0.2` implementation branch/worktree starts from the stable
  hotfix candidate and remains free of AI workflow files.
- [ ] Decide package manager for `1.0.2`: migrate to pnpm now, or explicitly
  publish one more npm-based patch.
- [ ] If pnpm is adopted, generate/verify the pnpm lockfile from the stable
  dependency graph instead of copying the canary lockfile blindly.
- [ ] Add a stable Node pin that matches CI, then align Node types or document
  why the type package can stay at Node 22.
- [ ] Keep esbuild for the `1.0.2` stable build unless a concrete build failure
  forces a fallback.
- [ ] Audit `eslint-plugin-obsidianmd`: latest version, changelog, enabled rules,
  and any new findings.
- [ ] Decide whether `format:check` enters the release gate; avoid broad
  formatting rewrites in the same commit as tooling adoption.
- [ ] Decide whether `stylelint` blocks `1.0.2`; if yes, start with a narrow
  release-risk config.
- [ ] Keep or extend `test:scorecard` so the exact CSS/source patterns that
  reached stable cannot recur.
- [ ] Fix CodeQL #64 on the stable branch.
- [ ] Add `SECURITY.md` unless maintainer process says otherwise.
- [ ] Add `CHANGELOG.md` `1.0.2` notes.
- [ ] Recheck GitHub Dependabot alerts, CodeQL alerts, and Scorecard SARIF
  after the branch passes local gates.
- [ ] Record `manifest.json.minAppVersion` evidence before changing
  `versions.json` beyond the `1.0.2` entry.
- [ ] Run final local gate using the same package manager and Node version as CI.
- [ ] Do not create a bare SemVer tag until the public release is intended.

## Recommendation From This Inventory

Adopt pnpm and Node pinning before the public `1.0.2` release if the migration
can be kept to release-gate files and the stable dependency graph. Do not adopt
Vite/Vite+ or canary UI changes in the same patch. The most valuable first patch
slice is package-manager/Node normalization plus Obsidian ESLint, CSS/Scorecard,
CodeQL, `SECURITY.md`, changelog, and manifest-evidence cleanup.
