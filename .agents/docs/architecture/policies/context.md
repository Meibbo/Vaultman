---
title: Context policy
type: policy
status: active
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-06T19:25:53
tags:
  - agent/policy
---

# Context Policy

## Rules

- Read `status.md` and `handoff.md` at session start.
- Treat greetings, `continue`, and vague startup requests as enough to run the standard route; do not require a user-written bootstrap prompt.
- Read only the smallest relevant route after that.
- If remaining context appears below 20%, warn the user before implementation.
- Prefer sharded manifests over giant files.
- Working memory routes through current status, handoff, and active work notes;
  keep `current/status.md` and `current/handoff.md` compact and navigational.
- Detailed working memory for active work belongs in the relevant initiative source record, not in current docs. Current docs should link to that record with only the minimum state needed to resume.
- Working memory summarizes current action, but it must not replace source records, raw logs, specs, plans, or archived detail.
- Move superseded working memory into archive before removing it from active docs.
- Long-term agent memory belongs in policies, glossary, specs, plans, skills, initiative items, research notes, backlog records, and archive shards.
- Archive records are not noise by default; they are full-detail source material that agents read only when the route calls for reconstruction or audit.
- Product/codebase decisions belong with the product architecture, code policy, or ADR-like records, not only in PKM-AI session notes.

## Read When

- Starting any session.
- Choosing what to read next.
- Preparing a handoff or health check.

## Do Not Read When

- Answering a direct micro command already covered by current context.

## Related Decisions

- PKM-AI orchestration refresh folder model and routing specs.

## Repair Triggers

- Startup requires broad search.
- Current files exceed limits.
- Agent reads unrelated archives before acting.
- Active working memory was deleted without an archive path or explicit user request.
- A route summary replaced detailed source material without preserving links to it.
- Current docs contain detailed active-work history instead of a wikilink to an initiative source record.
- A repeated environment observation is not captured as a hypothesis or norm.
