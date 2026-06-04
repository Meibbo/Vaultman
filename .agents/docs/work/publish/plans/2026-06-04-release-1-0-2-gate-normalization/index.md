---
title: Release 1.0.2 gate normalization implementation plan
type: plan
status: ready
parent: "[[docs/work/publish/specs/2026-06-04-release-1-0-2-gate-normalization-design|Release 1.0.2 gate normalization design]]"
created: 2026-06-04T05:11:57
updated: 2026-06-04T05:11:57
tags:
  - agent/plan
  - initiative/publish
  - release/1-0-2
  - release/gate
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Release 1.0.2 Gate Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize the `1.0.2` stable release gate on pnpm, Node 24, svelte-check, CI-blocking format, CI-blocking stylelint, Scorecard/CSS scans, security, and release metadata while keeping esbuild and the `1.0.x` product line.

**Architecture:** Work from the stable hotfix candidate, not from `sandbox`. Adopt only gate/tooling/security/metadata changes that are compatible with the existing esbuild build. Keep shared-file edits serialized through the coordinator; parallel agents may work only on owned files or patch proposals.

**Tech Stack:** pnpm 11.1.2, Node 24, TypeScript, Svelte 5, svelte-check, esbuild, ESLint, eslint-plugin-obsidianmd, Prettier, Stylelint, GitHub Actions, CodeQL, OpenSSF Scorecard.

---

## Source Spec

- [[docs/work/publish/specs/2026-06-04-release-1-0-2-gate-normalization-design|Release 1.0.2 gate normalization design]]
- [[docs/work/publish/research/2026-06-04-stylelint-obsidian-css-gate|Stylelint research for Obsidian CSS gate]]
- [[docs/work/publish/items/2026-06-04-release-1-0-2-gate-delta-inventory|Release 1.0.2 gate delta inventory]]
- [[docs/work/publish/items/2026-06-04-release-1-0-2-parallel-dispatch|Release 1.0.2 parallel dispatch plan]]

## Target Worktree

Use the stable hotfix worktree unless the coordinator creates a successor:

`C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\hotfix-1.0.2-css-scorecard`

Branch: `hotfix/1.0.2-css-scorecard`

Forbidden in this plan: push, tag, retag, merge, publish GitHub Release state,
copy canary UI, migrate stable to Vite/Vite+, change license, change
`minAppVersion` by guess, add AI workflow files to stable.

## File Ownership

| Task | Primary files |
| --- | --- |
| [[01-coordinator-setup|01 Coordinator setup]] | no product edits; status only |
| [[02-pnpm-node-baseline|02 pnpm and Node baseline]] | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.node-version`, `svelte.config.js`, delete `package-lock.json` |
| [[03-lint-check-format|03 lint/check/format gate]] | `package.json`, `.prettierrc.json`, `.prettierignore`, `eslint.config.mts` |
| [[04-stylelint-scorecard|04 stylelint and Scorecard gate]] | `stylelint.config.mjs`, `scripts/scorecard-regression-check.mjs`, `package.json` scripts |
| [[05-security-codeql-policy|05 security and CodeQL]] | `src/modals/modalQueueDetails.ts`, `SECURITY.md` |
| [[06-release-metadata|06 release metadata]] | `CHANGELOG.md`, `manifest.json`, `versions.json` |
| [[07-ci-release-workflows|07 CI and release workflows]] | `.github/workflows/ci.yml`, `.github/workflows/release.yml` |
| [[08-integration-verification|08 integration verification]] | verification only, no edits unless a prior task failed |

## Dependency Order

1. Task 01.
2. Task 02.
3. Tasks 03, 04, 05, and 06 may run in parallel only if they use isolated
   worktrees or return patches. In a single worktree, serialize shared
   `package.json` edits through Task 02/03/04.
4. Task 07 after package manager scripts are final.
5. Task 08 last.

## Completion Rule

Do not create a public `1.0.2` tag from this plan. Passing Task 08 means the
branch is release-ready for maintainer review, not released.
