---
title: Folder model
type: spec-slice
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
status: approved-draft
created: 2026-05-04T00:00:00
updated: 2026-05-04T00:00:00
tags:
  - agent/spec
---

# Folder Model

## Branch Layout

```text
main
  no AI files

hardening / dev
  AGENTS.md
  CLAUDE.md
  
    docs/
    skills/
    tools/
    cache/
```

## Agent Docs

```text
docs/
  start.md
  index.md
  current/
  work/
  architecture/
  knowledge/
  archive/
  templates/
```

## Initiatives

```text
work/
  hardening/
  polish/
  v1-stable/
  pkm-ai/
  draft/
```

`draft` is an active incubator only. Promoted items move to a real initiative.
Rejected drafts move to `archive/discarded/YYYY-MM/`.

## Archive

```text
archive/
  discarded/
  hardening/
  polish/
  v1-stable/
  pkm-ai/
```

Each initiative archive may contain `history/`, `handoffs/`, `attempts/`,
`conflicts/`, `superseded/`, and `raw/`.

## Sharding

Large specs, plans, indexes, and histories use folder manifests:

```text
specs/topic/
  index.md
  01-slice.md
  02-slice.md
```

The manifest routes to slices and does not duplicate slice content.
