---
title: Release 1.1.0 catch-up — main reconciliation and release pipeline bootstrap
type: release-record
status: complete
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-20T00:00:00-05:00
updated: 2026-05-20T00:00:00-05:00
tags:
  - agent/release
  - initiative/hardening
  - release/1.1.0
created_by: codex
---

# Release 1.1.0 Catch-up

Release catch-up completed on 2026-05-20 to unblock Obsidian submission by replacing old `main` with a sanitized `sandbox` tree and bootstrapping release automation.

## Outcome

- `main` reconciled to `sandbox - AI files`; `main` contains zero `AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`, or `.codex/` files.
- `main-clean-1.1.0` candidate was verified green after gating the optional Notebook Navigator comparison fixture.
- Release infrastructure landed through PR #20:
  - `ci.yml` includes `sandbox` triggers.
  - PRs to `main` fail if they touch AI workflow files via `dorny/paths-filter`.
  - `release-please` runs from `main` with bare tags and `manifest.json` / `versions.json` extra-files.
  - `release.yml` triggers on bare `X.Y.Z` tags and reuses the mature release asset pipeline.
- Release PR #21 cut `1.1.0`.
- Tag `1.1.0` created at `8d5c4fd61a6e1840cb74e8523ca46312f20936ec`.
- GitHub Release published: `https://github.com/Meibbo/Vaultman/releases/tag/1.1.0`.
- Release assets published: `main.js`, `manifest.json`, `styles.css`, `SHA256SUMS`, `sbom.cdx.json`.
- Scorecard publish failure was fixed through PR #22 by disabling OpenSSF webapp publishing while keeping SARIF upload.
- `origin/main` advanced to `7886d58abc596bd21f98776ddf9804be7c3a2889`.

## Verification Evidence

- Candidate `pnpm run verify`: exit 0.
- Candidate `pnpm run security:audit`: exit 0 for high+ threshold.
- PR #20 checks passed: CI verify, AI-file guard, CodeQL query tests, CodeQL analyze.
- `release.yml` manual dispatch on ref `1.1.0` passed and produced all release assets.
- Main after PR #22 passed CI, CodeQL, and OpenSSF Scorecard.
- Dependabot security alerts on default branch were resolved or auto-dismissed after the sanitized main replacement; remaining Dependabot PRs are routine updates unless reopened as vulnerabilities.

## Follow-up

- Umbrella feature pipeline is renumbered after the catch-up release:
  Explorer Hardening starts at `v1.2.0`; Bases Parity remains `v2.0.0`.
- Next implementation entrypoint: A.R Action Routing detail spec, then `writing-plans`, then `v1.2.0` execution.
- Remote cleanup is optional: `main-clean-1.1.0` and `release/1.1.0-infra` are merged/stale release branches created during this work.
