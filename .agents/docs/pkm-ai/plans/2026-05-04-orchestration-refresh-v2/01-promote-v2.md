---
title: Promote v2
type: plan-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T08:50:28
tags:
  - agent/plan
---

# Promote V2

## Task

Make V2 discoverable without deleting V1.

## Steps

- [ ] Link V2 from `docs/work/pkm-ai/index.md`.
- [ ] Mark V1 as superseded only after user approval.
- [ ] Update `current/status.md` to mention V2 review if this plan is adopted.
- [ ] Keep both spec folders until a later sanitizer pass.

## Verification

- [ ] `node tools/pkm-ai/check-doc-health.mjs`
- [ ] `node tools/pkm-ai/query-docs.mjs orchestration refresh v2`

