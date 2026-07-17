---
title: Agent room implementation plan
type: plan-shard
status: draft
parent: "[[docs/work/pkm-ai/specs/2026-05-11-agent-room/index|Agent room]]"
shard_source: ".agents/docs/work/pkm-ai/specs/2026-05-11-agent-room/index.md"
shard_of: "[[docs/work/pkm-ai/specs/2026-05-11-agent-room/index|Agent room]]"
shard_part: 3
created: 2026-05-11T02:34:55
updated: 2026-05-11T02:34:55
tags:
  - agent/plan
  - agent/shard
  - initiative/pkm-ai
  - agent/coordination
created_by: codex
updated_by: codex
---

# Agent Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans` to
> implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a first-pass PKM-AI `agent-room` CLI for durable parallel agent
coordination.

**Architecture:** One `.mjs` CLI owns all writes under `.agents/state`. It uses
atomic JSON writes, append-only JSONL events, lock files, and a bridge to
`manage-tasks.mjs` objective state.

**Tech Stack:** Node.js ESM, filesystem JSON/JSONL, existing PKM-AI tooling,
Vitest or focused Node test scripts depending on current test harness.

---

## Files

- Create: `.agents/tools/pkm-ai/agent-room.mjs`
- Create: `.agents/tools/pkm-ai/test/agent-room.test.mjs`
- Modify: `.agents/tools/pkm-ai/manage-tasks.mjs` only if objective state cannot
  be reused through its current CLI output.
- Modify: `.agents/docs/work/pkm-ai/specs/2026-05-11-agent-room/index.md` after
  implementation only to record final deltas.
- Modify: `.agents/docs/current/status.md` and
  `.agents/docs/current/handoff.md` as compact indexes after completion.

## Task 1: File Contract And Helpers

- [ ] Write failing tests for run id generation, path containment, atomic JSON
  write, JSONL append, and lock acquisition.
- [ ] Run the focused test and confirm it fails because `agent-room.mjs` does
  not exist.
- [ ] Implement `readJson`, `writeJsonAtomic`, `appendJsonl`,
  `withRunLock`, `createRunId`, and `resolveRunPaths`.
- [ ] Verify lock files are written under `.agents/state/locks`.
- [ ] Verify JSON writes cannot escape `.agents/state`.
- [ ] Run the focused test until it passes.

## Task 2: Run And Agent Lifecycle

- [ ] Add tests for `run start`, `run list`, `run status`, `agent join`,
  `agent heartbeat`, and `agent leave`.
- [ ] Implement run manifest creation.
- [ ] Implement agent status files.
- [ ] Append `run.created`, `run.status_changed`, `agent.joined`,
  `agent.heartbeat`, and `agent.left` events.
- [ ] Ensure `status --json` reports stale agents by comparing
  `lastHeartbeatAt` to `staleAfterMs`.
- [ ] Run the focused test until it passes.

## Task 3: Task Claims

- [ ] Add tests for task creation, claim, blocked duplicate claim, forced stale
  takeover, status transition, release, and terminal task behavior.
- [ ] Implement task list loading and saving.
- [ ] Implement owner/token/lease claim records.
- [ ] Require claim token for release and status transition.
- [ ] Append `task.created`, `task.claimed`, `task.claim_released`, and
  `task.status_changed` events.
- [ ] Run the focused test until it passes.

## Task 4: Scope Claims And Conflict Detection

- [ ] Add tests for same-file conflicts, parent-folder conflicts, child-file
  conflicts, expired-claim warnings, and non-conflicting semantic scopes.
- [ ] Implement path normalization for Windows and POSIX-style input.
- [ ] Store task-scoped claims inline first.
- [ ] Add `scopes.json` only if non-task claims are needed during the task.
- [ ] Append `scope.claimed` and `scope.conflict` events.
- [ ] Run the focused test until it passes.

## Task 5: Mailbox

- [ ] Add tests for run-level send/read/ack and task-level send/read/ack.
- [ ] Implement `mailbox/inbox.jsonl`, `mailbox/outbox.jsonl`, and
  `mailbox/delivery.json`.
- [ ] Implement `mailbox/tasks/{taskId}/inbox.jsonl` and `outbox.jsonl`.
- [ ] Make read commands filter by recipient agent when `--agent` is supplied.
- [ ] Append `mailbox.message` and `mailbox.ack` events.
- [ ] Run the focused test until it passes.

## Task 6: Objective Bridge

- [ ] Add tests that import objectives from the current `manage-tasks.mjs`
  JSON output.
- [ ] Add tests that syncing a claimed task maps `in-progress`, `blocked`,
  `question`, `done`, `cancelled`, and `todo` correctly.
- [ ] Reuse `manage-tasks.mjs --list-objectives --json` if available.
- [ ] Avoid editing `manage-tasks.mjs` unless its CLI cannot expose the needed
  fields.
- [ ] Append `objective.synced` events.
- [ ] Run the focused test until it passes.

## Task 7: Human And Machine Status

- [ ] Add tests for `status --json` required fields.
- [ ] Add tests for compact human status output.
- [ ] Include active agents, active claims, stale agents, scope conflicts, and
  unread messages.
- [ ] Ensure machine output has no decorative prose when `--json` is used.
- [ ] Run the focused test until it passes.

## Task 8: Documentation And Handoff

- [ ] Update the spec index only with implementation deltas.
- [ ] Update `.agents/docs/current/status.md` with a compact link to the source
  record.
- [ ] Update `.agents/docs/current/handoff.md` with next action and verification.
- [ ] Run `git diff --check` on touched files.
- [ ] Run the focused test command and doc health command.

## Verification Commands

Use the concrete commands discovered during implementation. Minimum expected:

```powershell
node .agents/tools/pkm-ai/test/agent-room.test.mjs
git diff --check -- .agents/tools/pkm-ai .agents/docs/work/pkm-ai .agents/docs/current
node .agents/tools/pkm-ai/check-doc-health.mjs
```

If the repo uses Vitest for `.agents/tools/pkm-ai`, prefer the existing package
test command instead of a custom Node test script.

## Stop Conditions

- Stop before implementation if current context is low.
- Stop if the script would need to write outside `.agents/state`.
- Stop if objective sync would require lossy parsing of Markdown instead of
  using `manage-tasks.mjs` structured output.
- Stop if unrelated dirty files overlap with implementation files in a way that
  makes ownership unclear.
