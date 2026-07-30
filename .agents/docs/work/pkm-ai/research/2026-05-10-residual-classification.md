---
title: Residual classification
type: research
status: active
parent: "[[docs/work/pkm-ai/index|PKM-AI]]"
created: 2026-05-10T03:29:53
updated: 2026-05-10T03:29:53
created_by: codex
updated_by: codex
tags:
  - agent/research
  - initiative/pkm-ai
  - agent/workflow
---

# Residual Classification

## Purpose

This record gives recurring Vaultman agent caveats a durable classification so they do not end as loose "pre-existing" prose in chat, status, or handoff.
Every residual must either block the current claim, move to a source/backlog record, become explicitly accepted noise, record an environment blocker, or stay marked as unproven with the next reproduction probe.

## Classifier

| Class | Meaning | Required record |
|---|---|---|
| fix-now | In scope and blocking the current claim | Link the fix or command evidence |
| backlog | Real but outside current slice | Link a backlog/source record with reproduction |
| accepted-noise | Known and tolerated for now | Owner, expiration, and reason |
| blocked-by-environment | Tooling/environment prevents proof | Tool, environment, fallback, next check |
| not-reproducible-yet | Reported but unproven | Repro steps attempted and next probe |

## Seeded Residuals

| Residual | Class | Evidence or source | Required record detail |
|---|---|---|---|
| Full doc health failure | backlog | `node .agents\tools\pkm-ai\check-doc-health.mjs` currently reports `doc health: FAIL (46)` with active `.agents/docs/superpowers` failures; source: [[docs/current/handoff|current handoff]] known residual and [[docs/work/research/2026-05-10-agent-failure-taxonomy/02-urgencies-and-repair-order|Agent failure taxonomy - urgencies and repair order]]. | Real but outside this create-only slice. Reproduce with the doc-health command and fix through a dedicated docs-health/backlog slice, not by editing unrelated active docs here. |
| Stale `serviceFnR.svelte` import-path class from handoff | not-reproducible-yet | `rg -n "serviceFnR\.svelte" src test .agents\docs` found the stale path only in docs/status/handoff, not in current `src` or `test`; source: [[docs/current/handoff|current handoff]] and [[docs/work/hardening/plans/2026-05-07-multifacet-2/index|multifacet wave 2 plan]]. | Reported as a prior import-path failure but not proven in current code search. Next probe: rerun the formerly failing focused suite before creating a backlog item. |
| Documented `pageFiltersRenameHandoff` failure | not-reproducible-yet | Current docs conflict: [[docs/current/status|current status]] says the focused component test passes, while [[docs/current/handoff|current handoff]] and [[docs/work/hardening/plans/2026-05-07-multifacet-2/08-settings-styles-verification|multifacet phase 8 verification]] record a documented one-test failure. | Reported but not proven in this slice. Next probe: run `pnpm exec vp test run --project component --config vitest.config.ts test/component/pageFiltersRenameHandoff.test.ts --fileParallelism=false` sequentially. |
| Full `git diff --check` trailing-whitespace noise | not-reproducible-yet | Current `git diff --check` exited 0 with line-ending warnings only; older source: [[docs/current/handoff|current handoff]] records `.agents/tools/pkm-ai/shard-index.mjs` trailing whitespace. | Previously reported full-diff noise is not reproduced now. Next probe: rerun full `git diff --check` before broad closeout; if it returns a concrete path, classify that path as fix-now or backlog by write scope. |
| Vite/Svelte resolver transient | accepted-noise | Source: [[docs/current/handoff|current handoff]], [[docs/current/status|current status]], [[docs/work/hardening/research/2026-05-06-selection-tanstack-virtualizer-debug/index|Selection hang and TanStack virtualizer assimilation]], and [[docs/work/hardening/plans/2026-05-07-node-expansion-keyboard-grid/05-settings-styles-verification|node expansion verification]]. | Owner: current implementing agent. Expiration: each verification closeout. Reason: repeated transient resolved by immediate sequential rerun without code changes. Rule: do not run Vite/Svelte verification commands in parallel; rerun once sequentially, then escalate if it persists. |
| CodeQL/Java worker cleanup requirement | blocked-by-environment | Source: [[docs/work/research/2026-05-10-agent-failure-taxonomy/02-urgencies-and-repair-order|Agent failure taxonomy - urgencies and repair order]], [[docs/current/status|current status]], and [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/03-card-layout|Pretext card layout]]. | Tool: CodeQL Java language server. Environment: Windows local worker processes can consume CPU and cause broad verification timeouts. Fallback: stop leftover CodeQL/Java workers before broad checks. Next check: before broad `lint`, `check`, `build`, or full test runs after CodeQL activity. |
| Accidental package-manager drift | not-reproducible-yet | `git status --short -- package.json pnpm-lock.yaml package-lock.json npm-shrinkwrap.json yarn.lock pnpm-workspace.yaml` returned no package-file changes; historical source: [[docs/work/hardening/backlog/2026-05-08-backlog-cut-5-badge-message/index|backlog cut 5 badge/message]] and [[docs/work/research/2026-05-10-agent-failure-taxonomy/02-urgencies-and-repair-order|Agent failure taxonomy - urgencies and repair order]]. | Current package drift is unproven. Next probe: run the scoped package-file status before any dependency or verification closeout; if package files are dirty outside an approved dependency slice, classify as fix-now. |

## Operating Rule

Do not use "pre-existing" as a terminal state. It is only a scope statement until this record or a linked backlog/source record classifies the residual and names the next proof or owner.
