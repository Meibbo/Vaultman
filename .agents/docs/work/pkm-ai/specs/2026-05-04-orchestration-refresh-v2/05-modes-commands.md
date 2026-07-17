---
title: Modes and micro commands
type: spec-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T16:12:00
tags:
  - agent/spec
---

# Modes And Micro Commands

## Modes

- `scout:` read-only local exploration.
- `research:` online/source verification with citations.
- `teach:` explain PKM-AI or workflow behavior.
- `implement:` change code/docs against a plan.
- `review:` review stance, findings first.
- `update:` update docs, policies, migration, or memory.
- `health:` check system consistency and propose repairs.
- `handoff:` compact current state and stop cleanly.

## Micro Commands

- `help:` list modes, micro commands, and current inferred mode.
- `skills:` list relevant project skills.
- `status:` summarize current state.
- `next:` show next action.
- `qq:` quick question, answer in place.
- `question:` clarify one point.

Micro commands do not switch mode and do not write files.

## Persistent Toggles

Some skills can be persistent, such as terse communication. Persistent toggles
must document:

- activation phrase
- deactivation phrase
- scope
- whether they affect docs or only chat

If a toggle is active but harms clarity, the agent should explain the exception
briefly and resume the toggle afterward.
