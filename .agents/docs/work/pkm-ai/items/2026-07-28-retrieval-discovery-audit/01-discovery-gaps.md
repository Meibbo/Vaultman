---
title: Discovery gaps — why the agent does not reach for the tool
type: audit-shard
status: needs-triage
lifecycle: active
parent: "[[docs/work/pkm-ai/items/2026-07-28-retrieval-discovery-audit/index|retrieval-discovery-audit]]"
created: 2026-07-28T19:05:00
updated: 2026-07-28T19:05:00
created_by: claude-opus-5
updated_by: claude-opus-5
tags:
  - agent/work
  - initiative/pkm-ai
  - tooling/retrieval
---

# Discovery Gaps

The trigger: asked which BT5 issues stayed open, a zero-context agent swept frontmatter file-by-file. The tool that answers this in one command exists and has existed for months. Four independent reasons it was not reached for.

## D1 — The bootloader advertises topic search, not structured query

`AGENTS.md` step 2 (Retrieval-first) reads:

> query the index for the top-k relevant docs; do NOT read the whole tree:
> `npx tsx .agents/tools/pkm-ai/query-docs.ts <topic>`

That is the *ranking* mode. It teaches "given a subject, find relevant docs".
The question asked here is the opposite shape: "given a predicate, enumerate all matching docs, exhaustively".

`--status`, `--tag`, `--type`, `--id`, and `--json` appear in exactly one place in the repository: the `--help` string at `query-docs.ts:36-43`. No policy, no skill, no router doc mentions them. An agent that follows the bootloader faithfully learns the wrong mode and never discovers the right one.

**Cost of the gap:** the correct call for the triggering question is one line.

```
node .agents/tools/pkm-ai/query-docs.ts --status needs-triage bt5-final-stable-audit
```

## D2 — Dead `.mjs` paths in four places

The tools migrated `.mjs` → `.ts` in the 2026-06-04 orchestration upgrade S2 (recorded in `AGENTS.md:16`). Four documents still route agents to the old extension:

| File | Line | Text |
| --- | --- | --- |
| `.agents/docs/architecture/policies/docs.md` | 101 | `tools/pkm-ai/query-docs.mjs --glossary <term>` |
| `.agents/docs/architecture/policies/tools.md` | 32 | `tools/pkm-ai/query-docs.mjs --glossary <term>` |
| `.claude/skills/vm-backlog-manager/SKILL.md` | 31–32 | `update-indexes.mjs`, `query-docs.mjs` |
| `.claude/skills/vm-pkm-ai-guide/SKILL.md` | 27 | `query-docs.mjs` |

`policies/docs.md:32` also names `check-doc-health.mjs` and `:118` names it again;
the real file is `check-doc-health.ts`.

The failure mode matters more than the typo. An agent runs the documented command, gets `ENOENT`, and **falls back to grep without reporting the broken path**. The tool appears absent rather than misnamed, and nothing in the session record says the documentation is wrong. Silent fallback is the defect.

## D3 — The matching skill frames the tool as a write-side utility

`vm-backlog-manager` has the right trigger surface — its description covers "backlog items, triage, priorities, statuses". It should fire on "which issues are open".

Its Tools section (`SKILL.md:29`) says:

> Use project scripts after item edits when indexes need repair

That is index maintenance after a write. Nothing in the skill says the index is also the **read** path for inventory questions. A skill can fire correctly and still route the agent to the wrong behavior.

## D4 — The only enforced discovery protocol points elsewhere

`.claude/settings.json` contains two hooks, `Stop` and `UserPromptSubmit`, both plain reminder text. Neither mentions retrieval.

The SessionStart hook that *does* inject a discovery protocol comes from outside the project and states:

> ALWAYS use codebase-memory-mcp tools FIRST for ANY code exploration

It is scoped to code, it is emphatic, and it names a competing retrieval system.
It says nothing about `.agents/docs` or pkm-ai. The result is that the only mandatory-sounding retrieval instruction an agent sees at startup routes it away from the doc index.

**Two retrieval systems coexist and only the one that does not know about `.agents/docs` announces itself every session.**

## Cheapest Correction

A single sentence, placed where agents already look, closes D1 and D4 together:

> Inventory or status questions over `.agents/docs` ("which items are open",
> "what changed since X", "list all specs of initiative Y") are answered with
> `query-docs.ts --status/--tag/--type`, never by reading or grepping files.

Target: `AGENTS.md` step 2, plus the same line in `policies/docs.md`.
