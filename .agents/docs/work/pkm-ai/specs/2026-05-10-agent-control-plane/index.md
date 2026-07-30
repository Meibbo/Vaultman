---
title: Agent control plane
type: spec-index
status: draft
parent: "[[docs/work/pkm-ai/index|PKM-AI]]"
created: 2026-05-10T03:11:56
updated: 2026-05-10T05:26:33
created_by: codex
updated_by: codex
tags:
  - agent/spec
  - initiative/pkm-ai
  - agent/workflow
---

# Agent Control Plane

## Purpose

This spec defines a control plane for Vaultman agent work: the small set of Modules, Interfaces, tools, and verification contracts that should guide future agents from prompt intake to evidence-backed handoff.

The control plane does not replace product architecture, backlog records, or the future `serviceAPI`. It coordinates them so agents find the right information faster, avoid known failure loops, and leave stronger evidence for the next session.

## Source Scope

- [[docs/architecture/behavior|Behavior]]
- [[docs/architecture/routing|Routing]]
- [[docs/architecture/glossary|Glossary]]
- [[docs/architecture/policies/context|Context policy]]
- [[docs/architecture/policies/docs|Docs policy]]
- [[docs/architecture/policies/tools|Tools policy]]
- [[docs/work/research/2026-05-10-agent-brain-synthesis/index|Agent Brain Synthesis]]
- [[docs/work/research/2026-05-10-agent-failure-taxonomy/index|Agent Failure Taxonomy]]
- Current `package.json`, `vitest.config.ts`, `.github/workflows/*`, `.agents/tools/pkm-ai/*`, and current/handoff route docs.

## Shards

- [[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/01-context-and-forces|01 Context And Forces]]
- [[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/02-modules-and-interfaces|02 Modules And Interfaces]]
- [[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/03-roadmap-and-verification|03 Roadmap And Verification]]
- [[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/04-verification-matrix|04 Verification Matrix]]
- [[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/05-route-retrieval-profiles|05 Route Retrieval Profiles]]
- [[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/06-tool-contracts|06 Tool Contracts]]

## Design Thesis

Vaultman's agent system should be treated as a workflow product with its own Interfaces. The strongest next move is not a broad automation layer. It is a control plane that makes agent routing, retrieval, residual classification, and verification explicit.

## Recommended Sequence

1. Normalize residuals and accepted noise.
2. Upgrade retrieval for docs and codebase.
3. Define a verification matrix by change type.
4. Strengthen shallow PKM-AI scripts where they create false confidence.
5. Only then design the agent-facing read/plan/enqueue `serviceAPI`.

## Approval State

The user approved the recommended "Agent Control Plane" direction in chat on 2026-05-10. This record captures the design; it is not yet an executable implementation plan.
