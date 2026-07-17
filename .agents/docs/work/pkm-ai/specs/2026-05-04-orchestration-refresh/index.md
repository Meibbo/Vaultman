---
title: PKM-AI orchestration refresh spec
type: spec
status: approved-draft
initiative: pkm-ai
created: 2026-05-04T00:00:00
updated: 2026-05-06T05:12:35
source_commit: bcbae42
tags:
  - agent/spec
  - pkm-ai/orchestration
---

# PKM-AI Orchestration Refresh

This sharded spec defines the agent documentation, routing, backlog, archive,
skills, automation, and verification model for Vaultman branches that allow AI
workflow files. It does not describe product-facing docs for `main`.

## Source Of Truth

- Freeze point: `bcbae42 tsconfig i18n repair`.
- Branches with AI docs: `hardening`, later `dev`.
- `main`: no AI files.

## Read Order

1. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/01-goals|01-goals]]
2. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/02-folder-model|02-folder-model]]
3. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/03-routing-modes|03-routing-modes]]
4. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/04-backlog-conflicts|04-backlog-conflicts]]
5. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/05-architecture-knowledge|05-architecture-knowledge]]
6. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/06-skills-tools|06-skills-tools]]
7. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/07-migration|07-migration]]
8. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/08-verification|08-verification]]
9. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/09-research-sources|09-research-sources]]
10. [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/10-authoring-policies|10-authoring-policies]]

## Acceptance Criteria

- Every active agent Markdown file stays under 200 lines.
- `current/status.md` and `current/handoff.md` stay under 200 lines.
- Existing active agent docs are archived under PKM-AI migration history.
- `AGENTS.md` and `CLAUDE.md` are lean bootloaders on agent branches only.
- Work is routed through intent, mode, and initiative indexes, not broad search.
- Repeated workflow work is scriptable or skill-backed.

## Open Questions

- Exact script implementation language and command names can be finalized in the
  implementation plan.
- Exact initial backlog item list can be created during migration.
