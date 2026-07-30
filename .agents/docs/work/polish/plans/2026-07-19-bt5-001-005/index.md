---
title: BT5-001..005 implementation plan
type: plan-index
status: active
lifecycle: active
parent: "[[docs/work/polish/index|Polish]]"
created: 2026-07-19T10:32:00
updated: 2026-07-19T13:38:07
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/plan, initiative/polish, release/bt5]
---

# BT5-001..005 implementation plan

Implementation runs in the existing installed worktree `C:/tmp/vaultman-release-beta2-final2`, branch `codex/bt5-001-005`. Product code must not be edited in the `sandbox` checkout and no additional worktree is created.

## Shards

- [[docs/work/polish/plans/2026-07-19-bt5-001-005/01-implementation-plan|Executable plan and adversarial pass]]
- [[docs/work/polish/plans/2026-07-19-bt5-001-005/02-outcome-verification|Outcome, runtime evidence and remaining HITL]]
- [[docs/work/polish/plans/2026-07-19-bt5-001-005/03-process-retrospective|Process retrospective and automation proposal]]

## Current checkpoint

- Product implementation is committed on `codex/bt5-001-005` as `c60e3bc7` and `14de6fbb`; the worktree is clean.
- `pnpm run verify` is green: 594/594 unit tests, type/Svelte 0/0, lint/format/style/build green and scorecard 17/17. Final artifacts match `plugin-dev` byte-for-byte.
- BT5-001 and BT5-005 are completed. BT5-002/003/004 retain only explicit HITL/release gates described in the outcome shard.
- The retrospective separates unavoidable engineering work from coordination/tooling waste and recommends a fail-closed session envelope, safe Obsidian launcher, structured gate runner and named runtime scenarios before the next mixed multi-issue batch.
