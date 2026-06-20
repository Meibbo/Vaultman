---
title: Verification
type: spec-slice
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
status: approved-draft
created: 2026-05-04T00:00:00
updated: 2026-05-06T05:12:35
tags:
  - agent/spec
---

# Verification

## Required Checks

- No active agent Markdown file exceeds 200 lines.
- `current/status.md` and `current/handoff.md` do not exceed 200 lines.
- No active specs or plans are giant single files.
- `docs/**` contains only public user or developer docs.
- `main` release path excludes AI files.
- `start.md` routes by intent and does not become a broad index.
- Index files shard when needed.
- Frontmatter parses as YAML.
- Obsidian links are not obviously broken.
- Existing active agent docs are archived with migration notes.

## Health Checks

Later `vaultman-doc-health` should detect:

- forbidden output paths
- line limit violations
- broken links
- stale `updated` timestamps
- contradictory source-of-truth fields
- duplicate skill triggers
- oversized route fanout
- active docs containing historical logs

## Metrics

Required item completion metrics:

- `actual_size`
- `outcome`
- `verification`
- `skills_used`
- `agents_used`

Optional metrics:

- `turns`
- `tool_calls`
- `elapsed`
- `tokens_used`
- `context_window`

Metrics are lightweight. Token and context values may be approximate, script
estimated, or user supplied when the UI exposes data the agent cannot read.
Do not spend significant tokens measuring tokens.

## Citation Retention

Research citations are kept in knowledge notes through `source_url`,
`verified_at`, and `expires_at`. Research that is out of scope becomes a draft
research item instead of active implementation scope.
