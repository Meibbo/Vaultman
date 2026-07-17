---
title: Source ledger
type: plan-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T08:50:28
tags:
  - agent/plan
---

# Source Ledger

## Task

Create a richer decision/source ledger so future agents can reconstruct the chat
decisions from docs.

## Steps

- [ ] Create decision shards under `architecture/decisions/` for branch policy,
  line limits, routing, backlog IDs, and skills.
- [ ] Link each decision from matching policies.
- [ ] Add `supersedes` or `related` fields where V2 replaces V1 wording.
- [ ] Preserve references to raw migration archive when old docs informed a rule.

## Verification

- [ ] Query for each accepted decision by keyword.
- [ ] Confirm every policy has `Related decisions`.

