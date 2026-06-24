---
title: Metrics feedback and learning
type: spec-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T08:50:28
tags:
  - agent/spec
---

# Metrics Feedback And Learning

## Hint Versus Truth

Fields like `task_size` are routing hints. Completion fields record what
actually happened.

Examples:

- `task_size: small`
- `actual_size: medium`
- `outcome: fixed`
- `verification: [...]`

## Required Completion Fields

- `actual_size`
- `outcome`
- `verification`
- `skills_used`
- `agents_used`

## Optional Fields

- `turns`
- `tool_calls`
- `elapsed`
- `tokens_used`
- `context_window`

Token and context values can be approximate, script-estimated, or user-supplied.
Do not waste significant tokens measuring tokens.

## Feedback Flow

Feedback can become:

- backlog item
- decision
- policy update
- skill revision
- archive note

Agent self-feedback requires evidence, not vibes.

