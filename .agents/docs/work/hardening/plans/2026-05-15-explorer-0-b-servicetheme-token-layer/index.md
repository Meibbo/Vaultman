---
title: Explorer Phase 0 sub-system B — implementation plan
type: plan-index
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B spec]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/plan
  - initiative/hardening
  - explorer/theme
---

# Explorer Phase 0 Sub-System B — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the two disconnected theme services into one deep-module runes class, introduce an exhaustive `ThemePreset` type with two built-in presets (`native` and `vaultman`) and a runtime custom preset registry, replace the legacy `<body>` class binding with a `.vm-root` binding driven by an SCSS-only token layer.

**Architecture:** Single `ThemeService` runes class owns state + register/unregister/update + runtime `<style>` injection. Built-in presets ship as `as const` constants in code; their tokens live in a new `_theme-presets.scss` file. Customs persist in `elasticUi.customPresets[]` and inject tokens at runtime. Clean break on settings — no legacy migration.

**Tech Stack:** Svelte 5 runes, TypeScript 5+, SCSS (Sass), Vitest (unit + component), `@testing-library/svelte` (component mount), existing Obsidian plugin scaffold.

**Spec reference:** [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B spec index]] and its 9 shards. Read the spec before starting.

---

## Task ordering rationale

Tasks proceed bottom-up: type contract → built-ins → settings shape → service state → service writes → service hydrate → runtime injection → SCSS migration → legacy cleanup → tests + verification.

This order is TDD-friendly because each layer can be tested in isolation before the next layer consumes it. It also keeps the diff reviewable: type changes land first, behavior changes follow, deletion of legacy code lands last.

Each task is one logical commit. Within a task, multiple TDD cycles (write failing test → run fails → implement → run passes) may occur before the single commit.

## Plan shards

| # | Shard | Tasks |
|---|---|---|
| 0 | [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-0-pre-flight|Phase 0 — Pre-flight]] | Verify base state, baseline gate |
| 1 | [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-1-types-and-builtins|Phase 1 — Types and built-ins]] | T1, T2, T3 |
| 2 | [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-2-settings-shape|Phase 2 — Settings shape]] | T4 |
| 3 | [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-3-service-core|Phase 3 — Service core]] | T5, T6, T7, T8 |
| 4 | [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-4-runtime-injection|Phase 4 — Runtime style injection]] | T9 |
| 5 | [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-5-scss-migration|Phase 5 — SCSS migration]] | T10, T11, T12 |
| 6 | [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-6-legacy-cleanup|Phase 6 — Legacy cleanup]] | T13, T14, T15 |
| 7 | [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/phase-7-tests-and-gates|Phase 7 — Component tests and final gates]] | T16, T17 |

## Tools and gates

Local gates after every task (run with `pnpm`):

- `pnpm exec vitest run --project unit --config vitest.config.ts <path>` for targeted unit tests.
- `pnpm exec vitest run --project component --config vitest.config.ts <path> --fileParallelism=false` for targeted component tests.
- `pnpm check` (svelte-check + tsc) for type and template diagnostics.
- `pnpm run build:plugin` for esbuild artifact (last task only, plus any task that touches SCSS).
- `pnpm verify` (lint + check + build + unit + component) as the final pre-commit gate at the end of each phase.

Commit policy:

- One commit per task. Commit message format:
  `feat(0-b): <task summary>` for new code, `refactor(0-b): ...` for moves, `chore(0-b): ...` for housekeeping.
- Use HEREDOC for multi-line bodies per `AGENTS.md`.
- Do not skip hooks (`--no-verify`).
- Do not push or merge.

## Reading order for the executing engineer

1. Read the spec index and all 9 shards before starting.
2. Read this plan index plus Phase 0 (pre-flight) before T1.
3. For each task, read the matching phase shard fully (one task per logical commit; do not interleave).
4. Run the local gates listed in the task's "Verify" step before committing.
5. Reference the spec when in doubt about a contract.
