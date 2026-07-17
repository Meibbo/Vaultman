---
title: Routing and modes
type: spec-slice
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
status: approved-draft
created: 2026-05-04T00:00:00
updated: 2026-05-04T16:12:00
tags:
  - agent/spec
---

# Routing And Modes

## Startup Route

`AGENTS.md` points to `docs/start.md`. `start.md` always routes through:

- `current/status.md`
- `current/handoff.md`

Then it chooses the smallest relevant route:

- bug/regression -> backlog index plus matching item
- new idea outside an initiative -> `work/draft`. if inside but not covered by, then triage.
- new initiative candidate -> draft items + initiative proposal + problems to resolve
- plan/design request -> active initiative spec or draft initiative proposal
- implement -> active initiative index plus current plan
- update -> docs policy plus target docs
- research -> research index plus source note
- release -> `work/v1-stable/index.md`
- teach -> PKM-AI manual

## Session Modes

```text
scout:
research:
teach:
implement:
review:
update:
health:
handoff:
```

Modes limit action scope. A quick side question is answered directly and does
not require a new chat or mode switch.

## Micro Commands

```text
skills:
status:
next:
qq:
question:
help:
```

Micro commands do not edit files and should answer in 10 lines or fewer.
`help:` lists micro-cmds, available modes and the current inferred mode.

## Task Size

```text
micro | small | medium | large
```

- `micro`: no full brainstorming; patch and targeted verify.
- `small`: brief design only when ambiguity exists.
- `medium` or `large`: full brainstorm, spec, and plan.

Explicit user skill invocation still wins.

## Mode Skill Map

- `scout:` -> start-session route plus read-only exploration.
- `research:` -> online/source research, then knowledge note or draft item.
- `teach:` -> PKM-AI guide; updates docs only when explicitly requested.
- `implement:` -> plan route, code/docs edits, targeted verification.
- `review:` -> review stance; findings before summary.
- `update:` -> docs migration/update route.
- `health:` -> doc health checks and repair proposals.
- `handoff:` -> compact status and handoff update.
