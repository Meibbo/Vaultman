---
title: Git policy
type: policy
status: active
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T01:36:20
updated: 2026-06-17T18:03:55
updated_by: codex-gpt-5
tags:
  - agent/policy
---

# Git Policy

## Rules

- `main` must contain zero AI files.
- AI files may be tracked on agent branches such as `hardening` or `dev`.
- Agents may create local commits for completed, verified work when a commit is the natural handoff unit.
- Do not tag, push, merge, force-push, rewrite history, or commit unrelated user changes unless explicitly asked.
- Do not revert or overwrite changes you did not make.
- Before release or merge work, confirm how AI files will be excluded from `main`.
- Regression recovery starts in the current relevant worktree: locate the last known-good commit, ask the dev for visual confirmation when UI behavior is the oracle, then prefer `git revert` of the bad range or selective restore over creating another worktree. New recovery worktrees require a concrete reason:
  dirty unrelated state blocks testing, the current worktree cannot build, or the dev explicitly requests isolation.
- For failed implementation waves after a closed backlog item, treat the closing commit of the last good issue as the first candidate `GOOD`, not necessarily the nearest stable tag.

## Read When

- Editing `.gitignore`.
- Preparing commits, branches, PRs, releases, or merges.
- Recovering regressions, reverting ranges, cherry-picking known-good slices, or asking the dev to confirm a `GOOD/BAD` commit visually.
- Resolving conflicts involving ``, `AGENTS.md`, or `CLAUDE.md`.

## Do Not Read When

- Performing read-only architecture or status lookup.

## Related Decisions

- Main release path excludes AI files.

## Repair Triggers

- AI files appear staged for `main`.
- `docs`, `skills`, or `tools` are ignored on AI branches.
- Generated caches are accidentally tracked.
