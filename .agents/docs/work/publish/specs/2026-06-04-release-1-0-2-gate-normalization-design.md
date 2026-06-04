---
title: Release 1.0.2 gate normalization design
type: spec
status: proposed
parent: "[[docs/work/publish/index|Publish]]"
created: 2026-06-04T04:21:05
updated: 2026-06-04T04:21:05
tags:
  - agent/spec
  - initiative/publish
  - release/1-0-2
  - release/gate
  - tooling
  - security
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Release 1.0.2 Gate Normalization Design

## Status

Proposed design awaiting maintainer review. Do not implement until this spec is
accepted and a separate implementation plan exists.

## Source Records

- [[docs/work/publish/items/2026-06-04-release-1-0-2-gate-escape-triage|Release 1.0.2 gate escape triage]]
- [[docs/work/publish/items/2026-06-04-release-1-0-2-gate-delta-inventory|Release 1.0.2 gate delta inventory]]
- [[docs/work/publish/items/2026-06-04-release-1-0-2-parallel-dispatch|Release 1.0.2 parallel dispatch plan]]
- [[docs/work/hardening/research/2026-05-27-version-streams-distillation/index|Version streams]]

## Problem

The current `1.0.2` hotfix candidate repairs CSS/Scorecard symptoms on the
stable line, but its release gate still differs materially from the canary gate:
it uses `npm`, lacks a local Node pin, uses an older Obsidian ESLint plugin, has
no format gate, no standard CSS linter, no `SECURITY.md`, and still has open
GitHub Code Scanning alerts.

Publishing `1.0.2` without normalizing the stable release gate risks doing the
same work twice after tooling changes. Publishing by copying `sandbox` wholesale
would be worse: `sandbox` is canary, and the accidental `1.1.0-beta.1` release
showed tooling viability but also showed that UI regressions can escape.

## Selected Approach

Normalize the stable gate narrowly before `1.0.2`:

- adopt `pnpm` and Node 24 for stable verification;
- keep the stable esbuild build path;
- update release-blocking lint/security/CSS checks;
- fix the known CodeQL issue and add security policy docs;
- prepare stable release metadata without guessing compatibility numbers;
- keep canary UI, Vite/Vite+, and broad formatting/style rewrites out of this
  patch.

This is the middle path between two bad options: shipping with stale gates, or
importing canary complexity into a patch release.

## Goals

- Make local and CI release gates use the same Node/package-manager baseline.
- Preserve the `1.0.x` stable product line while improving release safety.
- Prevent recurrence of the Obsidian Scorecard CSS/source issues that reached
  stable.
- Separate code/config-fixable security work from GitHub admin or maturity
  Scorecard findings.
- Make `manifest.json` and `versions.json` metadata evidence-based.
- Produce a plan that can be executed by multiple agents without shared-file
  conflicts.

## Non-Goals

- Do not migrate stable `1.0.2` from esbuild to Vite/Vite+.
- Do not merge `sandbox` product/UI changes into stable.
- Do not change the project license in `1.0.2`.
- Do not change `minAppVersion` without evidence.
- Do not fix every Scorecard finding if the finding requires admin settings,
  project maturity, fuzzing infrastructure, or unrelated process work.
- Do not create, delete, retag, push, merge, or publish a release without
  explicit maintainer approval.
- Do not introduce AI workflow files into `main` or stable release branches.

## Design Units

### Gate Baseline

Stable `1.0.2` should use one package manager and one Node baseline across local
and hosted verification. The expected baseline is `pnpm` with Node `24`.

The stable lockfile must be generated from the stable dependency graph. It must
not be copied from `sandbox`, because `sandbox` includes canary dependencies and
Vite/Vite+ structure that are outside this patch.

### Build Path

Stable `1.0.2` keeps root `esbuild.config.mjs` and `build:plugin` based on
esbuild. Vite/Vite+ remains a `dev` promotion item. This prevents asset/CSS
model churn from being mixed with a maintenance release.

### Lint And Format Gate

`eslint-plugin-obsidianmd` must be audited before the release. The current hotfix
candidate has `0.1.9`; `sandbox` has `^0.2.9`; npm currently reports `0.3.0`.
The implementation plan must read release notes/changelog and decide the target
version before changing dependencies.

Format checks should be considered release-blocking only if they can be adopted
without a broad formatting rewrite. If formatting produces large unrelated diffs,
the release should defer broad formatting and use a narrower check.

### CSS And Scorecard Gate

The existing custom Scorecard regression scan stays in the gate because it
captures Obsidian-specific release risks. A narrow `stylelint` gate is allowed
only if it blocks release-risk CSS without forcing a style-system rewrite.

At minimum, stable must prevent recurrence of the issues already seen in
release assets: unsafe `!important`, unsafe `display: contents`, missing
`styles.css` release asset, and release title/asset metadata mismatches.

### Security Gate

The release must fix local code/config items that can reasonably block `1.0.2`:

- CodeQL #64 dead guard in `src/modals/modalQueueDetails.ts`;
- missing `SECURITY.md`;
- workflow permissions that are clearly overbroad and safe to tighten;
- Dependabot security alerts if any are open at release time.

Scorecard findings that require branch protection settings, code review policy,
fuzzing, CII Best Practices, or repository maturity are not automatically patch
release blockers. They must be recorded as separate admin/process hardening.

### Release Metadata

`CHANGELOG.md` must include a `1.0.2` section before release.

`manifest.json.version` should remain `1.0.2` for the stable candidate.
`manifest.json.minAppVersion` should remain `1.12.0` unless the implementation
plan produces evidence for a different floor.

`versions.json` may include `"1.0.2": "1.12.0"` if the minimum app version does
not change. Older historical entries must not be normalized by guesswork.

### Multi-Agent Execution

Parallelism is allowed only where dependencies permit it:

- read-only briefs can run in parallel by domain;
- implementation agents must own distinct files or return patch proposals;
- `package.json`, lockfiles, workflows, manifest, and versions metadata require
  coordinator serialization;
- final lockfile generation happens once after dependency decisions settle.

## Acceptance Criteria

- Stable candidate has no AI workflow files.
- Local and CI gates use the same selected package manager and Node baseline.
- Stable build remains esbuild-based for `1.0.2`.
- Release gate covers lint, check/typecheck, build, Scorecard/CSS scan, security
  audit, and any accepted format/style checks.
- `eslint-plugin-obsidianmd` target version and active rule coverage are
  documented.
- CodeQL #64 is fixed or explicitly documented as not present on the final
  branch.
- `SECURITY.md` exists unless maintainer rejects the policy.
- `CHANGELOG.md` has `1.0.2` notes.
- `manifest.json` and `versions.json` changes are backed by compatibility
  evidence or explicitly documented as unchanged inherited metadata.
- Dependabot alerts, Code Scanning alerts, and Scorecard status are rechecked
  after local gates pass.
- The process stops before tag/release creation until explicit approval.

## Open Decisions For The Plan

- Whether `pnpm` adoption is mandatory for `1.0.2` or still needs a maintainer
  decision. This spec recommends yes.
- Whether `stylelint` is narrow and release-blocking in `1.0.2`, or deferred
  after extending the custom Scorecard scan.
- Whether `format:check` is CI-blocking or local-only for this patch.
- Whether `svelte-check` is added to stable now or deferred to the `dev` tooling
  promotion lane.
- Whether SBOM generation is required for `1.0.2` or remains post-release
  hardening.

## Spec Self-Review

- Placeholder scan: no placeholder-only requirements remain.
- Consistency check: the spec keeps esbuild while allowing pnpm/Node/lint/CSS
  normalization; Vite/Vite+ is explicitly deferred.
- Scope check: this is one release-gate normalization project, with multi-agent
  subdomains but one final integration gate.
- Ambiguity check: compatibility metadata must not change without evidence;
  admin-only Scorecard items are separated from patch blockers.

