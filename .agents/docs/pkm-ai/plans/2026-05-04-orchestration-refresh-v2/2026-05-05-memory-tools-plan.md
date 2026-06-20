---
title: Memory and tools implementation plan
type: plan-index
status: active
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/index|orchestration-refresh-v2]]"
created: 2026-05-05T22:06:42
updated: 2026-05-05T22:34:47
tags:
  - agent/plan
  - pkm-ai/tools
---

# Memory and Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the hybrid memory architecture and PC-delegated tools for PKM-AI (archive, AST code parsing, graph traversal, logs, and metrics analysis).

**Architecture:** We are creating a suite of standalone NodeJS `.mjs` scripts inside `tools/pkm-ai/` that can be invoked by the agent to offload heavy scanning tasks. We also update the system routing (`start.md`) and specific skills to enforce the usage of these scripts over brute-force file reads.

**Tech Stack:** NodeJS (ES Modules), File System (fs), Acorn (for simple AST if needed) or RegExp parsing, shell execution.

## Shards

- [[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/2026-05-05-memory-tools-plan/01-manage-memory|Task 1 - Implement `manage-memory.mjs`]]
- [[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/2026-05-05-memory-tools-plan/02-analyze-code|Task 2 - Implement `analyze-code.mjs`]]
- [[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/2026-05-05-memory-tools-plan/03-traverse-graph|Task 3 - Implement `traverse-graph.mjs`]]
- [[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/2026-05-05-memory-tools-plan/04-analyze-logs-and-metrics|Task 4 - Implement `analyze-logs.mjs` and `analyze-metrics.mjs`]]
- [[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/2026-05-05-memory-tools-plan/05-enforce-tool-usage|Task 5 - Enforce Tool Usage in Docs and Skills]]
