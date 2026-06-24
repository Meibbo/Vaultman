---
title: Routing attention
type: spec-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T08:50:28
tags:
  - agent/spec
---

# Routing Attention

## Problem

Indexes can become internal Google: many links, little guidance, high token
cost. The solution is not more indexes. The solution is routed attention.

## Startup Path

Every new session reads:

1. `AGENTS.md`
2. `docs/start.md`
3. `docs/current/status.md`
4. `docs/current/handoff.md`

Then it chooses one route. It does not browse all initiatives.

## Route Contract

A route should answer:

- What mode applies?
- What is the task size?
- What docs are required?
- What docs should not be read?
- What is the next action?

## Good Route

User: "this tab is empty"

Route:
- mode: diagnose or regression
- read current status/handoff
- query backlog for similar tab/content regressions
- inspect item or create draft item
- reproduce with Obsidian smoke
- inspect relevant code

The agent does not read release docs, polish docs, old raw plans, or every ADR.

