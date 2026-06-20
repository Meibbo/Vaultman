---
title: Agent failure taxonomy
type: research-index
status: active
parent: "[[work/research/index|Research Work Index]]"
created: 2026-05-10T00:11:28
updated: 2026-05-10T00:11:28
created_by: codex
updated_by: codex
tags:
  - agent/research
  - agent/taxonomy
  - pkm-ai
---

# Agent Failure Taxonomy

## Purpose

This record maps recurring Vaultman agent failure modes into taxonomic,
systemic, and operational classes. It is not a blame ledger for individual
agents; it is a repair map for future agent sessions.

## Shards

- [[work/research/2026-05-10-agent-failure-taxonomy/01-taxonomy-and-evidence|01 Taxonomy And Evidence]]
- [[work/research/2026-05-10-agent-failure-taxonomy/02-urgencies-and-repair-order|02 Urgencies And Repair Order]]

## Executive Readout

The recurring failures cluster around six loops:

1. **Memory fidelity loop**: agents compress active detail into route docs or
   chat instead of preserving source records.
2. **Verification illusion loop**: agents trust narrow tests, fake tests, or
   "pre-existing" exemptions while live Obsidian behavior remains broken.
3. **Svelte/reactivity loop**: agents create `$effect` dependency cycles or
   hidden state subscriptions while trying to keep code reactive.
4. **Performance regression loop**: agents fix correctness with debounce,
   full-vault rebuilds, index keys, or broad recomputation that hurts perceived
   responsiveness.
5. **Contract drift loop**: docs, services, and UI surfaces keep different
   meanings for the same term or API.
6. **Toolchain friction loop**: Windows, Vite/Svelte, CodeQL, package-manager
   drift, and dirty worktrees repeatedly turn verification into ambiguous noise.

## Immediate Priorities

- Promote recurring "pre-existing", "unrelated", "known transient", and
  "deferred" caveats into explicit backlog, accepted-noise, or fix-now records.
- Require mounted component tests or Obsidian smoke for UI/runtime fixes.
- Execute verification-led explorer/queue cuts before broad polish.
- Resolve queue contract drift before designing an agent-facing programmable
  API.

