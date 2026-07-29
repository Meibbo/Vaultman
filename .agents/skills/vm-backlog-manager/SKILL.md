---
name: vm-backlog-manager
description: Use when handling Vaultman bugs, regressions, backlog items, triage, priorities, statuses, conflicts, duplicate tasks, or draft work promotion.
---

# Vaultman Backlog Manager

Use this for explicit backlog or triage work in the Vaultman PKM-AI docs.

## Guardrails

- Announce the intended backlog change before editing.
- Create or update the smallest relevant item files.
- Keep conflicts explicit as backlog or triage items.
- Do not implement draft work until it is promoted or routed by the user.
- Do not overwrite another worker's active item.

## Routing

Read only the policy and target area needed:

- `.agents/docs/architecture/policies/backlog.md`
- `.agents/docs/architecture/policies/docs.md`
- initiative `index.md` when the item belongs to an active initiative
- `work/draft` when the idea is not tied to an initiative

## Tools

Use project scripts after item edits when indexes need repair:

- `.agents/tools/pkm-ai/update-indexes.mjs`
- `.agents/tools/pkm-ai/query-docs.ts`

If a script has unclear behavior, inspect its source before running it. Verify frontmatter, line limits, and generated indexes relevant to the touched files.
