---
title: Implementation plan — multichannel release CLI
type: plan
status: active
created: 2026-07-17
created_by: codex-gpt5-release-beta2
parent: "[[docs/work/publish/specs/2026-07-17-multichannel-release-cli|multichannel release CLI spec]]"
---

# Implementation plan — multichannel release CLI

## Slice 1 — Pure release contracts

- Add failing unit tests for SemVer parsing/comparison, per-line alpha/beta/stable resolution, explicit-version validation, channel/branch mapping, and parallel trains.
- Implement a dependency-free pure ESM release library.
- Run the focused unit test to green.

## Slice 2 — Release-note fragments

- Add failing unit tests for fragment parsing, line selection, category ordering, cumulative prerelease rendering, stable consumption, and changelog insertion.
- Implement public `changes/<line>/*.md` fragments and deterministic rendering.
- Run the focused unit test to green.

## Slice 3 — Safe orchestration

- Add source-contract tests for package scripts, safe child-process invocation, dry-run, prepare-only, confirmation, forbidden paths, and required gates.
- Implement `scripts/release.mjs` around the pure library.
- Replace the broken root `version-bump.mjs` package lifecycle path with the supported release entry point while preserving a correct version metadata helper.
- Run focused and full headless verification.

## Slice 4 — Beta.2 preparation

- Curate cumulative `1.2` fragments from beta.1 and the approved beta.2 diff.
- Commit beta.2 product implementation without AI files.
- Fast-forward `dev` to the verified implementation commit.
- Execute the release CLI for `1.2.0-beta.2` with reviewed metadata.

## Slice 5 — Publication verification

- Push `dev` and tag `1.2.0-beta.2`.
- Watch `release.yml` to completion.
- Verify GitHub prerelease flags and required assets.
- Record the local-only agent documentation/session log separately from public code.
