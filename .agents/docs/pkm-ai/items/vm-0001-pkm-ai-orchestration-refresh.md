---
id: VM-0001
project: vaultman
type: feature
status: verify
priority: high
initiative: pkm-ai
task_size: large
actual_size: large
skills_used: []
agents_used: []
verification:
  - node tools/pkm-ai/check-doc-health.mjs
  - node --test "tools/pkm-ai/test/*.test.mjs"
  - pnpm run build
tokens_used:
context_window:
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-04T01:48:51
updated: 2026-05-04T07:26:01
tags:
  - agent/item
---

# VM-0001 PKM-AI Orchestration Refresh

## Summary

Refresh the Vaultman PKM-AI orchestration docs, routing, backlog, and worker
handoff system so agents can coordinate safely on AI-docs branches.

## Links

- Spec: [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|orchestration refresh spec]]
- Plan: [[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh/index|orchestration refresh plan]]

## Acceptance

- [x] Bootloader routes agents through current status and handoff docs.
- [x] Architecture policies define code, docs, backlog, and git behavior.
- [x] Backlog indexes and Base view expose active items.
- [x] Worker handoffs remain concise and within line limits.

## Completion Metrics

- actual_size: large
- skills_used:
  - writing-plans
  - subagent-driven-development
- agents_used: []
- verification:
  - node tools/pkm-ai/check-doc-health.mjs
  - node --test "tools/pkm-ai/test/*.test.mjs"
  - pnpm run build
- tokens_used:
- context_window:

## Notes

- This item tracks the whole orchestration refresh initiative; individual
  workers own scoped plan slices.
- Raw migration archive files are allowed to exceed active line limits.
- Timestamp updates now use `tools/pkm-ai/update-frontmatter.mjs`.
