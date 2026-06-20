---
title: Skills tools and automation
type: spec-slice
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
status: approved-draft
created: 2026-05-04T00:00:00
updated: 2026-05-04T07:14:09
tags:
  - agent/spec
---

# Skills Tools And Automation

## Initial Skills

```text
skills/
  vm-start-session/
  vm-backlog-manager/
  vm-pkm-ai-guide/
```

Later skills:

```text
vm-doc-health
vm-memory-sanitizer
vm-handoff
```

Skills stay small and composable. `SKILL.md` gives triggers and core workflow.
Scripts handle deterministic work. References load only when needed.

## Sub-Agents

The main agent coordinates. Explorer sub-agents may help `scout:` and
`research:`. Worker sub-agents may help `implement:` only with disjoint write
scopes. Sub-agents do not update long-term memory directly.

## Automation

```text
tools/pkm-ai/
  index-docs.mjs
  query-docs.mjs
  update-indexes.mjs
  check-doc-health.mjs
  shard-index.mjs
  normalize-skill-output.mjs
  update-frontmatter.mjs
```

`update-frontmatter.mjs` must be implemented before agents rely on `updated`
as an accurate last-edit value.

```text
cache/
  pkm-ai.sqlite
  search-index.json
  doc-health.json
```

Markdown/frontmatter is source of truth. Cache files are rebuildable. Scripts
return compact route output; agents read full docs only when needed.

Phase 2 may add structural code index scripts for imports, exports, tests, and
Svelte component maps. Semantic/vector indexing is deferred.

Script language defaults to TypeScript/Node for project compatibility. Python
is reserved for tasks where its libraries are clearly better, such as PDF,
spreadsheet, statistical, or heavy text-processing work.

## Normalization

Third-party skill doc output is normalized into `docs` on agent
branches. This applies to agent docs only. Code outputs and intentionally public
developer/user docs are not moved unless the user asks.

Raw output is archived, links are updated, and no active file may exceed the
line limit.

## Hooks Triggers And Toggles

Persistent toggles, such as terse communication style, live in behavior or user
preference docs and must include a deactivation phrase. Hooks are scripts or
checks invoked by modes, not hidden per-message automation.
