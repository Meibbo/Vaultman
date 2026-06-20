---
title: Backlog and conflicts
type: spec-slice
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
status: approved-draft
created: 2026-05-04T00:00:00
updated: 2026-05-04T00:00:00
tags:
  - agent/spec
---

# Backlog And Conflicts

## Item Location

```text
work/<initiative>/items/vm-0001-short-title.md
```

IDs use a configurable project prefix and four digits. Vaultman starts with
`VM-0001`; another project can use another prefix.

## Canonical Fields

```yaml
id: VM-0001
project: vaultman
type: bug
status: triaged
priority: normal
initiative: hardening
task_size: small
actual_size:
skills_used: []
agents_used: []
verification: []
tokens_used:
context_window:
created:
updated:
```

Types: `bug`, `regression`, `feature`, `refactor`, `docs`, `test`, `research`,
`release`, `chore`, `question`, `conflict`.

Statuses: `new`, `triaged`, `planned`, `in-progress`, `blocked`, `verify`,
`done`, `wont-do`, `superseded`.

Priorities: `highest`, `high`, `normal`, `low`, `lowest`.

## Indexes And Bases

- `current/backlog.md`: all active items.
- `current/bugs.md`: bug view.
- `current/regressions.md`: regression view.
- `current/conflicts.md`: conflict view.
- `current/backlog.base`: Obsidian Base views.

Indexes shard when they exceed the line limit. Base files are views, not the
canonical record.

## Conflicts

Contradictions become `type: conflict` items. Working memory only links to the
conflict count or index. Detail stays in item files. Resolved reports move to
`archive/<initiative>/conflicts/`.

## Specs Are Not Items

Specs, plans, policies, and research notes use their own frontmatter. Backlog
item fields apply only to files under `work/<initiative>/items/`.
