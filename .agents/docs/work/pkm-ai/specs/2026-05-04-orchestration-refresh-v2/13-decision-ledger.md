---
title: Decision ledger
type: spec-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T16:12:00
tags:
  - agent/spec
---

# Decision Ledger

## Accepted Decisions

- Use `docs` for agent memory.
- Use root `AGENTS.md` and `CLAUDE.md` only on agent branches.
- Keep `main` free of AI files.
- Use `hardening`, later `dev`, as AI-doc branches.
- Use `pkm-ai` as the initiative for this system.
- Rename `future` to `draft`.
- Use `VM-0001` four-digit item IDs.
- Use priority words: `highest`, `high`, `normal`, `low`, `lowest`.
- Use modes: `scout`, `research`, `teach`, `implement`, `review`,
  `update`, `health`, `handoff`.
- Use `qq:` for quick questions.
- Use `YYYY-MM-DDTHH:mm:ss` timestamps without timezone offsets.
- Use one `parent` property with full-path wikilink and initiative alias.
- Track only `vm-*` project skills for now.

## Corrected Decisions

- Line limits are paging ergonomics, not content deletion rules.
- Specs and plans can be long in total when sharded.
- Raw archive files may exceed active line limits.
- `updated` timestamps require script support.

## Still Needs Policy Hardening

- Exact rules for when a route summary is too lossy.
- Exact procedure for turning chat decisions into decision shards.
- How to periodically review duplicate skills.
