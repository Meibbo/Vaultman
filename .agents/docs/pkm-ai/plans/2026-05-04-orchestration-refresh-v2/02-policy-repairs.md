---
title: Policy repairs
type: plan-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T08:50:28
tags:
  - agent/plan
---

# Policy Repairs

## Task

Repair policies that allowed V1 to become too compressed.

## Steps

- [ ] Update docs policy to define line limits as page size.
- [ ] Add "summary must link source" rule.
- [ ] Add repair trigger for lossy summaries.
- [ ] Update context policy to stop at low context instead of compressing.
- [ ] Update backlog policy to distinguish items from attempts.

## Verification

- [ ] Search active docs for "line limit" and confirm no lossy wording.
- [ ] Run doc health.

