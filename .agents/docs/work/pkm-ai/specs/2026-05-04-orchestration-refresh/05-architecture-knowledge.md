---
title: Architecture and knowledge
type: spec-slice
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
status: approved-draft
created: 2026-05-04T00:00:00
updated: 2026-05-04T00:00:00
tags:
  - agent/spec
---

# Architecture And Knowledge

## Architecture

```text
architecture/
  index.md
  glossary.md
  behavior.md
  routing.md
  adr/
  decisions/
  policies/
    context.md
    git.md
    code.md
    docs.md
    backlog.md
```

`architecture` is prescriptive. It says what agents must do.

`decisions/` records why choices were made. `policies/` records current rules.
Decisions can create or update policies.

Policy files use:

- `Rules`
- `Read when`
- `Do not read when`
- `Related decisions`
- `Repair triggers`

## Knowledge

```text
knowledge/
  index.md
  research-index.md
  codex.md
  claude.md
  obsidian.md
  svelte.md
  mcp.md
  pkm-ai-manual/
```

`knowledge` is descriptive. It summarizes sources, APIs, research, and guidance
without making project rules.

Research notes keep citations:

```yaml
source_url: []
verified_at:
expires_at:
```

`expires_at` is a review date. It does not delete a note. After that date,
agents should verify the source again before relying on it for current APIs,
tooling, prices, releases, or other unstable facts.

## Manual

The PKM-AI manual is a living developer guide with beginner, intermediate,
advanced, and pro sections. Old behavior is archived, not kept active.

## Recovery

Items may have optional attempts. Attempts record meaningful approaches and
outcomes. Reverting meaningful agent work requires user choice between native
undo, Git history, or an agent patch.
