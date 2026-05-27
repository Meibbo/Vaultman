---
title: Release 1.0.1 From 1.0.0 Implementation Plan
type: implementation-plan
status: active
parent: "[[docs/work/publish/index|publish]]"
created: 2026-05-26T22:07:55
updated: 2026-05-26T22:07:55
tags:
  - agent/plan
  - initiative/publish
  - release/discipline
  - release/scorecard
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Release 1.0.1 From 1.0.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `1.0.1` stable patch from `1.0.0` product code, with modern release workflows, `styles.css` release publishing, and Obsidian Scorecard fixes.

**Architecture:** The release branch starts from tag `1.0.0`. Product code remains `1.0.0` except for Scorecard fixes; workflow and release infrastructure are ported from the modern beta/release-infra line but adapted to `npm` and the `1.0.0` file layout. `styles.css` is the existing tracked root asset from `1.0.0`, staged and attested by the release workflow.

**Tech Stack:** TypeScript, Svelte 5, esbuild, npm/package-lock, GitHub Actions, release-please, CodeQL, OpenSSF Scorecard, GitHub artifact attestations.

---

## Source Spec

- [[docs/work/publish/specs/2026-05-26-release-1-0-1-from-1-0-0-design|Release 1.0.1 From 1.0.0 With Beta Workflow Safety]]

## Plan Shards

1. [[docs/work/publish/plans/2026-05-26-release-1-0-1-from-1-0-0/01-worktree|Worktree Setup]]
2. [[docs/work/publish/plans/2026-05-26-release-1-0-1-from-1-0-0/02-scorecard-scan|Scorecard Regression Scan]]
3. [[docs/work/publish/plans/2026-05-26-release-1-0-1-from-1-0-0/03-ci-codeql-releaseplease|CI, CodeQL, And Release Please]]
4. [[docs/work/publish/plans/2026-05-26-release-1-0-1-from-1-0-0/04-release-workflow|Release Workflow]]
5. [[docs/work/publish/plans/2026-05-26-release-1-0-1-from-1-0-0/05-scorecard-source-fixes|Scorecard Source Fixes]]
6. [[docs/work/publish/plans/2026-05-26-release-1-0-1-from-1-0-0/06-version-metadata|Version Metadata]]
7. [[docs/work/publish/plans/2026-05-26-release-1-0-1-from-1-0-0/07-verification-release-handling|Verification And Remote Release Handling]]

## File Map

Release branch/worktree:

- Create worktree: `.claude/worktrees/release-1.0.1-from-1.0.0`
- Branch: `release/1.0.1-from-1.0.0`
- Base: `1.0.0`

Release metadata:

- Modify: `package.json`
- Modify: `manifest.json`
- Modify: `versions.json`
- Create: `.release-please-manifest.json`
- Modify: `CHANGELOG.md`

Build/release support:

- Modify: `esbuild.config.mjs` only if build verification proves `main.js` no longer emits correctly.
- Keep: root `styles.css` from `1.0.0` as the release CSS asset.
- Create: `scripts/scorecard-regression-check.mjs`

GitHub workflows and release config:

- Create: `.github/dependabot.yml`
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/codeql.yml`
- Create: `.github/workflows/release-please.yml`
- Create: `.github/workflows/release.yml`
- Create: `.github/workflows/scorecard.yml`
- Create: `.github/codeql/codeql-config.yml`
- Create: `release-please-config.json`
- Optionally create: `codeql/` query/test tree copied from the beta/release-infra line if keeping custom query tests.

Scorecard source fixes:

- Modify: `src/i18n/index.ts`
- Modify: `src/svelte.d.ts`
- Modify: `src/VaultmanSettings.ts`
- Modify: `src/main.ts`
- Modify: `src/components/layout/islandActiveFilters.ts`
- Modify: `src/components/layout/islandQueue.ts`
- Modify: `src/components/layout/viewTree.ts`
- Modify: `src/utils/inputModal.ts`
- Modify: `src/modals/modalLinter.ts`
- Modify: `src/services/serviceOperationQueue.ts`
- Modify: `src/services/servicePropertyIndex.ts`
- Modify: `src/components/containers/explorerFiles.ts`
- Modify: `src/components/containers/explorerProps.ts`

## Commit Strategy

Commit after each task group:

1. `test(scorecard): add release regression scan`
2. `chore(release): prepare 1.0.1 branch workflow`
3. `fix(scorecard): resolve Obsidian source warnings`
4. `chore(release): set stable version 1.0.1`
5. `docs(publish): record 1.0.1 candidate verification`

Do not push, tag, merge, edit GitHub releases, or close PR #24 during implementation unless the user gives a separate explicit release-management instruction.

## Execution Order

Run the shards in order. Do not start source fixes until the scorecard regression scan has been created and observed failing on the unpatched `1.0.0` source.
