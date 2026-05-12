---
title: Git policy
type: policy
status: active
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-05-12T00:00:00
tags:
  - agent/policy
---

# Git Policy

## Rules

- `main` must contain zero AI files.
- AI files may be tracked on agent branches such as `hardening` or `dev`.
- Agents may create local commits for completed, verified work when a commit is
  the natural handoff unit.
- Do not tag, push, merge, force-push, rewrite history, or commit unrelated
  user changes unless explicitly asked.
- Do not revert or overwrite changes you did not make.
- Before release or merge work, confirm how AI files will be excluded from `main`.

## Read When

- Editing `.gitignore`.
- Preparing commits, branches, PRs, releases, or merges.
- Resolving conflicts involving ``, `AGENTS.md`, or `CLAUDE.md`.

## Do Not Read When

- Performing read-only architecture or status lookup.

## Related Decisions

- Main release path excludes AI files.

## Repair Triggers

- AI files appear staged for `main`.
- `docs`, `skills`, or `tools` are ignored on AI branches.
- Generated caches are accidentally tracked.
