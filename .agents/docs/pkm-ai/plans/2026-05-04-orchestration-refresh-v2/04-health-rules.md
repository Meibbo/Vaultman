---
title: Health rules
type: plan-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T08:50:28
tags:
  - agent/plan
---

# Health Rules

## Task

Teach scripts to catch the failure mode that created V1 compression.

## Steps

- [ ] Add health check for active summaries without source links.
- [ ] Add health check for `updated` values older than touched files when feasible.
- [ ] Add report-only check for duplicate skill triggers.
- [ ] Keep raw archive line limit exemptions.
- [ ] Add tests for the new health rules.

## Verification

- [ ] `node --test "tools/pkm-ai/test/*.test.mjs"`
- [ ] `node tools/pkm-ai/check-doc-health.mjs`

