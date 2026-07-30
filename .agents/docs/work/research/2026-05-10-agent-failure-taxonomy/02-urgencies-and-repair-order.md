---
title: Agent failure taxonomy - urgencies and repair order
type: research-shard
status: active
parent: "[[work/research/2026-05-10-agent-failure-taxonomy/index|Agent Failure Taxonomy]]"
created: 2026-05-10T00:11:28
updated: 2026-05-10T00:11:28
created_by: codex
updated_by: codex
tags:
  - agent/research
  - agent/taxonomy
  - pkm-ai
---

# Urgencies And Repair Order

## T7 - Contract Drift And Naming Drift

**Pattern:** old names or APIs survive after their behavior changes.

**Evidence:** `queue.pending` no longer represents the visible queue source, but the surface still exists; old queue zero-count reports are superseded only in part. `viewGrid.svelte` is documented as failed table debt; later table work had to avoid basing `viewTable` on it. The old `out-hardening` label was misinterpreted until engineering context clarified it means v1 Polish unless cancelled, fixed, or post-rc.1.

**Current risk:** future agents revive stale plans or wire against misleading interfaces.

**Countermeasure:** mark old docs `superseded`, `partial`, or `pending`; retire or reconnect drifted APIs; keep glossary and architecture terms authoritative.

## T8 - Operational Toolchain Failures

**Pattern:** environment noise masks product truth.

**Evidence:** tools policy records possible `rg.exe` access denied on Windows;
CodeQL records local PATH friction and leftover Java workers; Pretext/card verification required clearing CodeQL workers before broad runs; badge cut 5 records accidental package-manager and lockfile drift that broke normal `pnpm` commands; current handoff warns not to run Vite/Svelte verification in parallel.

**Current risk:** agents misclassify infrastructure friction as product failure, or silently "fix" generated/dependency files outside scope.

**Countermeasure:** keep an operational playbook: run Vite/Svelte sequentially, kill known leftover workers before broad verification, scope `git diff --check`, and never accept package-manager drift unless the task explicitly changes it.

## T9 - Agent Safety And Programmable Interface Gaps

**Pattern:** Vaultman is meant to supervise bulk operations for AI agents, but the current app lacks a stable typed API for agent read/plan/enqueue workflows.

**Evidence:** Agent Brain Synthesis says no `serviceAPI` exists; the guardrail spec requires queue-backed preview, explicit destructive confirmation, counts, affected paths, validation errors, rollback limits, and fail-closed ambiguous scope.

**Current risk:** agents either mutate vault files directly or avoid automation because no safe interface exists.

**Countermeasure:** implement a small read/plan/enqueue API that routes through existing queue and review surfaces before any broader automation.

## Urgency Matrix

| Urgency | Failure | Why it matters | Next action |
|---|---|---|---|
| P0 | Residual normalization | Known failures are scattered in handoff/status instead of backlog | Promote stale import, documented failed test, doc-health failure, and diff-check failure into explicit backlog/accepted-noise records |
| P0 | Verification illusion | Tests can pass while live Svelte/Obsidian behavior fails | Require mounted component or Obsidian smoke for UI/runtime fixes |
| P1 | Lifecycle/index ownership | Mixed factory/manual event ownership can leak or stale-read | Execute lifecycle/indexing spec with red tests for refresh/revision/unload |
| P1 | Explorer/queue verification debt | Release-blocking v1 behavior still needs proof | Start verification-led cuts 12-15 before broad polish |
| P1 | Performance guardrails | Latency regressions have repeated | Finish remaining CodeQL/perf guardrails and keep immediate-first refresh paths |
| P1 | Queue contract drift | `pending`, `size`, transactions, and UI counts are not one clear contract | Decide retire vs reconnect and test the chosen contract |
| P2 | Toolchain friction | Infrastructure noise consumes agent time and causes bad edits | Write a compact operational playbook or policy addendum |
| P2 | Programmable API gap | AI bulk ops remain unsafe or ad hoc | Draft `serviceAPI` read/plan/enqueue contract after queue/scope verification |

## Recommended Repair Order

1. Create a small "residuals audit" backlog record: every `pre-existing`, `unrelated`, `known transient`, and `deferred` caveat must be classified.
2. Run doc health and fix routing/source-link failures before adding more current-doc detail.
3. Execute the verification-led explorer/queue cuts before adding UI polish.
4. Resolve queue contract drift before designing agent-facing APIs.
5. Convert operational friction into a short policy/playbook plus mechanical checks where feasible.
6. Only then expand programmable AI-agent workflows.

## Critical Notes For Future Agents

- Do not treat empty `current/bugs.md` or `current/regressions.md` as proof that there are no bugs or regressions. Evidence lives in handoff and source records.
- Do not use "pre-existing" as an endpoint. It is only a scope statement unless linked to a backlog item or accepted-noise rule.
- Do not run Vite/Svelte verification commands in parallel in this repo.
- Do not revive old broad SCSS/grid/table plans without checking current source records and superseded status.
- Do not put AI files on `main` or revert another agent's dirty work.

