---
title: Agent failure taxonomy - taxonomy and evidence
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

# Taxonomy And Evidence

## Source Scope

Primary sources read for this synthesis:

- [[current/status|Current status]]
- [[current/handoff|Current handoff]]
- [[current/engineering-context|Engineering context]]
- [[architecture/behavior|Behavior]]
- [[architecture/policies/docs|Docs policy]]
- [[architecture/policies/context|Context policy]]
- [[architecture/policies/tools|Tools policy]]
- [[architecture/system-improvements|System improvements proposal]]
- [[work/pkm-ai/items/vm-0002-current-docs-as-route-indexes|VM-0002 current docs as route indexes]]
- [[work/research/2026-05-10-agent-brain-synthesis/index|Agent Brain Synthesis]]
- [[work/research/2026-05-10-agent-brain-synthesis/02-pending-ledger|Agent Brain Pending Ledger]]
- [[work/performance/research/2026-05-09-viewtree-latency-test-repair|ViewTree latency and performance-test repair]]
- [[work/performance/research/2026-05-09-ecosystem-performance-codeql-research|Ecosystem performance and CodeQL guardrail research]]
- [[work/performance/plans/2026-05-09-codeql-guardrails|CodeQL performance guardrails]]
- [[work/hardening/research/2026-05-06-selection-tanstack-virtualizer-debug/index|Selection hang and TanStack virtualizer assimilation]]
- [[work/hardening/backlog/2026-05-07-v1-scope-audit/01-release-blocking-v1|Release-blocking v1 scope]]
- [[work/hardening/backlog/2026-05-07-v1-scope-audit/04-needs-verification|Needs verification]]
- Archived raw memory/handoff under `archive/pkm-ai/migration-2026-05-04/raw/docs/`

## T1 - Memory And Source-Fidelity Failures

**Pattern:** useful detail remains in chat, current docs, or compact summaries without enough source context to reconstruct the decision.

**Evidence:** `architecture/system-improvements.md` names "sesgo conversacional"; `docs policy`, `context policy`, and VM-0002 all correct the same issue by making `current/status.md` and `current/handoff.md` route indexes instead of full memory stores. `glossary.md` explicitly defines lossy summary as a regression.

**Current risk:** `current/status.md` and `current/handoff.md` are still large and carry many historic details. They are useful but brittle: an agent can miss the source record and treat an old line as current truth.

**Countermeasure:** keep full records in initiative folders, link compactly from current docs, and add health checks for "short summary without source link."

## T2 - Verification Illusions And Residual Normalization

**Pattern:** agents mark work as green while leaving caveats as "pre-existing," "unrelated," "deferred," or "known transient." Some caveats are valid; the failure is that they become permanent background noise instead of tracked items.

**Evidence:** current handoff records a stale `serviceFnR.svelte` import-path error, a documented `pageFiltersRenameHandoff` failure, doc-health failures, and an unrelated full `git diff --check` trailing-whitespace failure. The multifacet verification shard records deferred live UI exercises. Agent Memory shows earlier verify gates with pre-existing lint warnings and later regressions that required live smoke to catch.

**Current risk:** future agents can inherit "mostly green" as a norm and skip turning residuals into backlog items.

**Countermeasure:** any recurring caveat gets one of three states: fixed now, canonical backlog item, or explicit accepted noise with owner and expiration.

## T3 - Test-Shape Mismatch

**Pattern:** tests exist but do not exercise the real failing surface.

**Evidence:** ViewTree latency repair found a perf test measuring fake DOM instead of real `ViewTree`, a stress vault with no real markdown corpus, and an integration test sampling the wrong live Obsidian app. Earlier raw handoff explains that unit tests and `svelte-check` missed `effect_update_depth_exceeded` because real Svelte components were not mounted in a DOM lifecycle.

**Current risk:** agents can add tests and still miss runtime failures in Obsidian, Svelte mounting, virtualizers, or library wrappers.

**Countermeasure:** for UI/runtime defects, require at least one mounted component test or Obsidian CLI smoke against the real route that failed.

## T4 - TDD And Scope-Discipline Breaks

**Pattern:** agents implement before tests, backfill tests later, or expand a slice beyond the stated scope.

**Evidence:** current status explicitly records a TDD violation in a prior subagent's FnR templating/date-parser work. Many plans now repeat "write failing tests first," "do not migrate all at once," and "stop if..." because agents have shown pressure to broaden slices.

**Current risk:** backfilled tests describe what was built, not what should have been built, and broad refactors increase merge and regression cost.

**Countermeasure:** enforce red/green evidence in source records. A task that adds behavior without red evidence should be treated as incomplete until the behavior is reproved or reworked.

## T5 - Svelte Reactivity And Lifecycle Failures

**Pattern:** agents read reactive state inside effects or services that later write the same state, creating loops or hidden dependencies.

**Evidence:** selection hang came from `panelExplorer.svelte` refresh effects tracking `ViewService` selection/focus reads; earlier raw handoff shows `SettingsUI` blanket autosave and `OverlayStateService` no-op writes causing runtime loops; popup island failures required live Svelte/Obsidian smoke.

**Current risk:** Svelte 5 runes make local code look pure while effect graphs cross service/view boundaries invisibly.

**Countermeasure:** use `untrack` for provider refresh/mirroring boundaries, avoid blanket autosave effects, test no-op identity behavior, and prefer explicit event subscriptions over accidental reactive reads.

## T6 - Performance And Scale Regressions

**Pattern:** correctness fixes introduce latency, DOM churn, or full-vault work.

**Evidence:** a Gemini update added trailing-only 250 ms debounce and worsened visible explorer latency. Ecosystem research and CodeQL guardrails identify missing TanStack `getItemKey`, unbounded `Promise.all(files.map(vault.read))`, raw `setTimeout`/`debounce` refresh paths, unsafe dynamic code/path/HTML, and full-vault render work as repeatable regression shapes.

**Current risk:** agents optimize "less CPU" by delaying first paint, or fix data freshness by rebuilding too much.

**Countermeasure:** guardrail static shapes with CodeQL, use immediate-first coalescing, revision-gated caches, durable virtualizer keys, and perf counters that separate model rebuilds, flattening, badge bubbling, and vault reads.

