---
title: Agent control plane implementation plan
type: plan-index
status: draft
parent: "[[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/index|Agent Control Plane]]"
created: 2026-05-10T03:29:53
updated: 2026-05-10T05:30:51
created_by: codex
updated_by: codex
tags:
  - agent/plan
  - initiative/pkm-ai
  - agent/workflow
---

# Agent Control Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Use
> subagent-driven-development only if the user explicitly authorizes parallel
> agents and the write scopes remain disjoint.

**Goal:** Build the first operational slice of the Agent Control Plane so
future Vaultman agents classify residuals, choose retrieval tools, and verify
work through one shared workflow contract.

**Architecture:** This plan is documentation-first and tool-contract-first. It
adds source records that define residual classification, retrieval profiles,
and verification matrix rules, then updates PKM-AI routing so agents can find
and use them. It does not implement product `serviceAPI`; that remains blocked
on queue/scope verification.

**Tech Stack:** Obsidian Markdown under `.agents/docs`, PKM-AI scripts under
`.agents/tools/pkm-ai`, existing Node/Vitest tool tests, and existing
Vaultman package verification commands.

---

## Scope

This is the first implementation slice from the approved spec:
[[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/index|Agent Control Plane]].

It implements:

- residual classification records;
- verification matrix;
- route and retrieval profiles;
- PKM-AI tool confidence contracts;
- index/routing updates;
- docs/tooling verification.

It does not implement:

- product-facing `serviceAPI`;
- queue contract repair;
- TypeScript AST code index;
- Svelte prop/event parser;
- autonomous agent execution.

## File Map

- Create:
  [[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/01-residual-classification|01 Residual Classification]]
- Create:
  [[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/02-verification-matrix|02 Verification Matrix]]
- Create:
  [[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/03-route-retrieval-profiles|03 Route Retrieval Profiles]]
- Create:
  [[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/04-tool-contracts|04 Tool Contracts]]
- Create:
  [[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/05-verification-close|05 Verification Close]]
- Create:
  [[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/06-handoff|06 Handoff]]
- Modify: [[docs/work/pkm-ai/index|PKM-AI index]]
- Optional later code files, only after this plan is accepted:
  `.agents/tools/pkm-ai/verify-matrix.mjs`,
  `.agents/tools/pkm-ai/residuals-audit.mjs`,
  `.agents/tools/pkm-ai/code-index.mjs`.

## Execution Order

1. [[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/01-residual-classification|Residual classification]]
2. [[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/02-verification-matrix|Verification matrix]]
3. [[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/03-route-retrieval-profiles|Route and retrieval profiles]]
4. [[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/04-tool-contracts|Tool contracts]]
5. [[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/05-verification-close|Verification and close]]

## Current Handoff

- [[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/06-handoff|Agent control plane subagent handoff]]

## Next Plans

- Queue contract repair:
  [[docs/work/pkm-ai/plans/2026-05-10-queue-contract-repair/index|queue-contract-repair-plan]]
  reconnects stale queue `pending` drift before agent-facing operation APIs.
- Selected/visible scope verification: prove visible explorer scope, selected
  node scope, and queued operation scope agree before automation expands.
- `serviceAPI` read/plan/enqueue design: expose supervised read/plan/enqueue
  only after queue and scope preconditions are verified.
- TypeScript AST code-index implementation: replace regex-only architecture
  orientation where dependency, export, and call-site confidence matters.

## Stop Conditions

- Stop before modifying product code.
- Stop before building `serviceAPI`.
- Stop if doc health reports a new failure under this plan's paths.
- Stop if any current-doc rewrite would remove detail without archive source.
- Stop if the user asks to execute with parallel agents; that requires an
  explicit subagent execution decision first.
