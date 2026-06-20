---
id: VM-0002
project: vaultman
type: docs-policy
status: completed
priority: high
initiative: pkm-ai
task_size: small
actual_size: small
skills_used:
  - obsidian-markdown
agents_used: []
verification:
  - git diff --check -- AGENTS.md .agents/docs/architecture/policies/docs.md .agents/docs/architecture/policies/context.md .agents/docs/architecture/behavior.md .agents/docs/current/engineering-context.md .agents/docs/current/status.md .agents/docs/current/handoff.md .agents/docs/work/pkm-ai/index.md
  - PowerShell trailing-whitespace scan for AGENTS.md, edited docs, and VM-0002
  - line count check for current status, current handoff, and VM-0002
  - rg check for superseded compact/archive wording
tokens_used:
context_window:
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-06T19:25:53
updated: 2026-05-06T19:25:53
tags:
  - agent/item
  - agent/policy
---

# VM-0002 Current Docs As Route Indexes

## Summary

Change the documentation policy so agents stop turning `current/status.md` and
`current/handoff.md` into compacted substitutes for full implementation or
verification records.

Current docs should be navigational indexes. They should contain compact
wikilinks, current state, next action, and blockers. Complete detail belongs in
the relevant initiative source record under `docs/work/<initiative>/items/`,
`specs/`, `plans/`, `research/`, or `backlog/`. If work is not yet assigned to a
named initiative, the complete source record belongs under `docs/work/draft/`
until it is promoted.

## Policy Changes

- `AGENTS.md` now says non-trivial work, decisions, verification logs, and
  handoff detail require a complete initiative source record plus a compact
  wikilink from status or handoff.
- `docs/architecture/policies/docs.md` now treats `current/status.md` and
  `current/handoff.md` as route indexes, not canonical work records.
- `docs/architecture/policies/context.md` now places detailed active working
  memory in initiative source records.
- `docs/architecture/behavior.md` now distinguishes active detail routed to
  initiative records from superseded detail routed to archives.
- `docs/current/engineering-context.md` now records the standing expectation
  that current docs link to source records instead of replacing them.
- `docs/current/status.md` and `docs/current/handoff.md` now link to this item
  as the current rule correction.

## Acceptance

- [x] Policy tells agents to create or update a full initiative record for
  non-trivial active work.
- [x] Policy tells agents to put only compact wikilinks and resume cues in
  `current/status.md` and `current/handoff.md`.
- [x] Policy reserves archives for superseded historical material instead of
  active work detail.
- [x] Repair triggers flag detailed active-work logs in current docs without a
  linked initiative source record.
- [x] Verification is recorded.

## Verification

- `git diff --check -- AGENTS.md .agents/docs/architecture/policies/docs.md .agents/docs/architecture/policies/context.md .agents/docs/architecture/behavior.md .agents/docs/current/engineering-context.md .agents/docs/current/status.md .agents/docs/current/handoff.md .agents/docs/work/pkm-ai/index.md`
  exited 0.
- PowerShell trailing-whitespace scan over `AGENTS.md`, the edited policy/current
  docs, and this new item produced no findings.
- Line count check: `current/status.md` 121 lines, `current/handoff.md` 189
  lines, this item 73 lines.
- `rg` check found no remaining active rule that says to archive current-doc
  detail first instead of moving active detail to an initiative source record.

## Notes

- This item deliberately applies its own rule: the complete decision lives here,
  and current docs should link here rather than duplicating the full rationale.
