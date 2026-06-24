---
title: OpenSSF OSPS baseline implementation plan
type: plan-index
status: draft
parent: "[[docs/work/hardening/research/2026-05-16-openssf-osps-baseline/index|OpenSSF OSPS baseline research]]"
created: 2026-05-16T04:42:00
updated: 2026-05-16T04:42:00
tags:
  - agent/plan
  - initiative/hardening
  - security
  - openssf
  - supply-chain
created_by: codex
updated_by: codex
---

# OpenSSF OSPS Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Do not dispatch subagents unless the user explicitly requests them. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Vaultman toward OpenSSF OSPS Baseline Level 1 with public security docs, measurable Scorecard posture, least-privilege workflows, dependency hygiene, and reproducible release provenance.

**Architecture:** Treat OpenSSF as a release-readiness layer over the existing Obsidian plugin project. Local repository changes should be small and auditable; remote GitHub settings changes must be explicit, recorded, and verified separately from code changes.

**Tech Stack:** GitHub Actions, OpenSSF Scorecard, CodeQL, pnpm/vite-plus, Vitest, GitHub Artifact Attestations or SLSA generic provenance, Obsidian plugin release assets.

---

## Guardrails

- Do not overwrite the current dirty deletion of `CONTRIBUTING.md` without an
  explicit decision.
- Do not push, tag, merge, or mutate repository settings unless the user asks
  for that exact action.
- Keep AI workflow files out of `main`; this plan lives only on an agent branch.
- Pin actions by immutable SHA only after resolving the current upstream SHA at
  execution time.
- For settings changes, record the exact GitHub UI/API state before and after.

## File Map

- Create: `SECURITY.md`
- Create or reconcile: `LICENSE`
- Reconcile: `CONTRIBUTING.md`
- Modify: `README.md`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/codeql.yml`
- Create: `.github/workflows/scorecard.yml`
- Create: `.github/workflows/release.yml`
- Modify: `package.json`
- Create or modify: dependency audit documentation under
  `.agents/docs/work/hardening/`

## Verification Commands

| Purpose | Command |
|---|---|
| Worktree safety | `git status --short --branch` |
| YAML shape | `pnpm exec prettier --check ".github/workflows/*.yml"` |
| Project gate | `pnpm verify` |
| Dependency audit, production | `pnpm audit --prod` |
| Dependency audit, development | `pnpm audit --dev` |
| Diff whitespace | `git diff --check` |

## Plan Shards

- [[01-scope-docs-workflow-permissions|Scope, public docs, and workflow permissions]]
- [[02-scorecard-repository-settings|Scorecard and repository settings]]
- [[03-dependency-audit-release-provenance|Dependency audit and release provenance]]

## Acceptance Criteria

- `SECURITY.md` exists and is linked.
- License and contributing files are reconciled before main/release work.
- CI and CodeQL jobs declare least-privilege permissions.
- Scorecard runs automatically and publishes results.
- `main` protection, dependency alerts, and vulnerability reporting are active.
- Dependency audit findings are either fixed or explicitly risk-accepted.
- Releases are generated from GitHub Actions with checksums, SBOM, and
  provenance for Obsidian plugin assets.
