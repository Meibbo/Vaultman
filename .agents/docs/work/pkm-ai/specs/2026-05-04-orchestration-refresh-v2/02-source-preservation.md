---
title: Source preservation
type: spec-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T08:50:28
tags:
  - agent/spec
---

# Source Preservation

## Canonical Rule

Working memory can be rewritten. Source memory must be preserved before rewrite.
When an agent replaces a long active doc, it must leave an archive trail to the
raw source or sharded successor.

## Preservation Levels

- Raw archive: verbatim source, no editing for line limits.
- Sharded active docs: curated, navigable, still detailed.
- Route summary: compact pointer to current state.
- Current status and handoff: small live surface only.

## Archive Before Delete

If a doc contains old plans, handoffs, or memory, move it under:

```text
docs/archive/<initiative>/...
```

If it is unclear whether the material is public, agent-facing, or historical,
mark it `needs_dev_selection: true` instead of discarding it.

## Source Links

Every active summary that replaces a larger source must include at least one of:

- `supersedes`
- `raw_source`
- `source_url`
- `related`
- a wikilink to the shard manifest

## Recovery

If the developer says "go back to the first approach," the agent should read
attempt notes or archived raw docs before changing code or docs. It should not
guess from a compressed summary.

