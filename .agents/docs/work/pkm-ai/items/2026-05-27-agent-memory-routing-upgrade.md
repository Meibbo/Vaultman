---
title: Agent memory routing upgrade (cross-session brain navigation)
type: item
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-27T00:00:00
updated: 2026-05-27T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/item
  - initiative/pkm-ai
  - agent/memory
---

# Agent Memory Routing Upgrade

## Problem

After three consecutive days of grill/brainstorm sessions, the dev reports that information is
lost between chats, and that the agent must be repeatedly reminded to read other docs to
re-establish context already discussed. Concretely: if asked "what did the handoff say a week
ago?", the current flow cannot answer reliably — it would guess from long-term-memory docs rather
than retrieve the actual prior handoff. Short-term memory (status/handoff) is meant to let the
agent navigate the **entire** agent brain with little effort, via aggressive, precise, efficient
routing — and to lean harder on scripts/systems so the system keeps growing without falling apart.

Two distinct gaps:

1. **Decision supersession trail** — when a recorded decision changed, agents overwrote the source
   doc in place, dropping the "what it was + why it changed" history. (Partially addressed
   2026-05-27 by the decision-changelog;
   [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-changelog|decision-changelog]].)
2. **Temporal navigation of working memory** — `status.md` / `handoff.md` are replaced over time
   with only an `archive_source` pointer to a single prior snapshot; there is no dated history
   index and no routing to "the handoff as of date X". Old handoff sections that get trimmed are
   archived but not easily discoverable.

## Goal

Short-term memory (status/handoff) routes the agent to ANY part of the brain — current and
historical — quickly and precisely, backed by scripts rather than manual recall.

## Proposed scope (to refine into a spec)

- **Dated handoff/status history index**: a generated index (e.g. `docs/current/history.md` or a
  `tools/pkm-ai` script) listing every archived status/handoff snapshot by date with a one-line
  summary + link, so "handoff as of 2026-05-20" is one hop away. Not just a single `archive_source`.
- **Routing script**: extend `tools/pkm-ai` (e.g. `query-docs.mjs` / a new `recall.mjs`) to fetch
  "status/handoff/decision as of date X" and to surface the decision-changelog for a given topic.
- **Supersession discipline everywhere**: apply the decision-changelog pattern to status/handoff
  trims (record what moved + why), not silent replacement.
- **Aggressive routing in start.md**: make the start router actively point at the changelog +
  history index + the architecture model on session start, reducing "go read doc X" reminders.
- **Health coverage**: a health check that flags status/handoff snapshots archived without a
  history-index entry, and decisions changed without a changelog row.

## Why this matters

The project is large, ambitious, and multi-stream (see
[[docs/work/hardening/research/2026-05-27-version-streams-distillation/index|version-streams]]).
The dev keeps pushing the system to grow; reliable cross-session memory is the load-bearing
foundation for that growth. Without it, every session re-derives context and risks losing
decisions.

## Status

Logged 2026-05-27 from the architecture/style grill. Needs its own brainstorm → spec → plan.
Not started. Owner: pkm-ai initiative.
