---
title: PKM-AI orchestration refresh v2
type: spec
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T08:50:28
supersedes:
  - "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
tags:
  - agent/spec
  - pkm-ai/orchestration
---

# PKM-AI Orchestration Refresh V2

This is the richer version of the orchestration spec. V1 proved the structure
but compressed too much. V2 preserves rationale, tradeoffs, and operating detail
while keeping each file short enough to navigate.

## Read Order

1. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/01-line-limits|line limits]]
2. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/02-source-preservation|source preservation]]
3. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/03-branch-doc-boundary|branch boundary]]
4. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/04-routing-attention|routing]]
5. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/05-modes-commands|modes]]
6. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/06-taxonomy|taxonomy]]
7. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/07-backlog-conflicts-recovery|backlog]]
8. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/08-architecture-knowledge-manual|architecture]]
9. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/09-skills-subagents-hooks|skills]]
10. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/10-tools-indexing|tools]]
11. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/11-migration-normalization|migration]]
12. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/12-metrics-feedback|metrics]]
13. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/13-decision-ledger|decisions]]
14. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/14-open-risks|risks]]

## Acceptance Criteria

- No accepted decision is represented only as a vague summary.
- Every compressed statement links to a source, shard, archive, or policy.
- Line limits are treated as paging ergonomics, not content limits.
- V2 can guide a future agent without rereading this chat.

