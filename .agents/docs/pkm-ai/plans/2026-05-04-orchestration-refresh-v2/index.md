---
title: PKM-AI orchestration refresh v2 implementation plan
type: plan
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T08:50:28
tags:
  - agent/plan
---

# PKM-AI Orchestration Refresh V2 Plan

This plan repairs the V1 compression problem. It does not redo all bootstrap
work. It enriches the active source model so future agents can recover details
without rereading this chat.

## Read Order

1. [[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/01-promote-v2|promote v2]]
2. [[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/02-policy-repairs|policy repairs]]
3. [[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/03-source-ledger|source ledger]]
4. [[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/04-health-rules|health rules]]
5. [[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/05-verification|verification]]

## Execution Rule

Keep V1 as superseded source. Do not delete it. Update current routing only
after V2 passes doc health and developer review.

