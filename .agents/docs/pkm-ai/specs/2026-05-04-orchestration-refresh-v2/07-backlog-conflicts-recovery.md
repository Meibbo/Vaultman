---
title: Backlog conflicts and recovery
type: spec-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T08:50:28
tags:
  - agent/spec
---

# Backlog Conflicts And Recovery

## Item Identity

Use project-prefixed four-digit IDs:

```text
VM-0001
STR-0001
```

The prefix belongs to the project. The type lives in frontmatter, not in the ID.

## Status And Priority

Statuses: `new`, `triaged`, `planned`, `in-progress`, `blocked`, `verify`,
`done`, `wont-do`, `superseded`.

Priorities: `highest`, `high`, `normal`, `low`, `lowest`.

## Conflicts

Use `type: conflict` when docs disagree. Conflicts appear in backlog views but
have a special workflow:

1. detect
2. identify authority
3. adjudicate
4. update policy/current docs
5. archive report

## Attempts

Attempts are not items. They are approach records linked from an item. Use them
when an approach meaningfully failed, was replaced, or may need recovery later.

## Revert Policy

For recent AI edits, ask whether to use native IDE/Codex undo, Git, or an agent
patch. Do not enter panic recovery or revert unrelated work.

