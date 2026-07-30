---
title: Pi-crew source inspection shard
type: research-shard
status: active
parent: "[[docs/work/pkm-ai/research/2026-05-11-pi-crew-agent-coordination|Pi-crew and PKM-AI coordination]]"
shard_source: ".agents/docs/work/pkm-ai/research/2026-05-11-pi-crew-agent-coordination.md"
shard_of: "[[docs/work/pkm-ai/research/2026-05-11-pi-crew-agent-coordination|Pi-crew and PKM-AI coordination]]"
shard_part: 2
created: 2026-05-11T02:11:31
updated: 2026-05-11T02:11:31
tags:
  - agent/research
  - agent/shard
  - initiative/pkm-ai
  - agent/workflow
  - agent/coordination
created_by: codex
updated_by: codex
---

# Pi-crew Source Inspection Shard

## Inspection Scope

The first open validation step was completed by inspecting the published `pi-crew@0.2.0` npm package and its bundled docs/source, not only package-page summaries.

Commands used:

```powershell
npm view pi-crew name version dist-tags license repository homepage bin main type dependencies peerDependencies scripts --json
npm pack pi-crew --pack-destination $tmp --json
```

The package was unpacked into a temporary directory outside the repository. No Pi-crew runtime was executed and no product code was changed for this inspection.

## Package Identity

- npm package: `pi-crew`
- inspected version: `0.2.0`
- npm dist tag: `latest -> 0.2.0`
- license: `MIT`
- repository: `https://github.com/baphuongna/pi-crew`
- package type: ESM (`type: "module"`)
- CLI bin: `pi-crew -> install.mjs`
- direct dependencies: `cli-highlight`, `diff`, `jiti`, `typebox`
- peer dependencies:
  `@mariozechner/pi-agent-core`, `@mariozechner/pi-ai`, `@mariozechner/pi-coding-agent`, `@mariozechner/pi-tui`

## Confirmed State Contract

Pi-crew is durable-first. Its docs describe every run, task, worker status, and event as disk-backed state so foreground commands, background commands, dashboards, and restarted processes can inspect the same truth.

Confirmed bundled paths:

```text
<crewRoot>/state/runs/{runId}/manifest.json
<crewRoot>/state/runs/{runId}/tasks.json
<crewRoot>/state/runs/{runId}/events.jsonl
<crewRoot>/state/runs/{runId}/agents/{taskId}/status.json
<crewRoot>/artifacts/{runId}/...
```

Pi-crew documentation says new projects use `.crew/`; repositories already using Pi state may store teams under `.pi/teams/`.

Confirmed run statuses from `src/state/contracts.ts`:

```text
queued, planning, running, blocked, completed, failed, cancelled
```

Confirmed task statuses from `src/state/contracts.ts`:

```text
queued, running, waiting, completed, failed, cancelled, skipped
```

Terminal run statuses are `blocked`, `completed`, `failed`, and `cancelled`.
Terminal task statuses are `completed`, `failed`, `cancelled`, and `skipped`.

## Coordination Primitives

The package has the primitives PKM-AI is missing, even if PKM-AI should not adopt the whole runtime yet.

- Run locks: `src/state/locks.ts` uses a `run.lock` file with `pid` and `createdAt`, plus stale-lock detection.
- Atomic writes: `src/state/atomic-write.ts` uses temp-file replacement, symlink-safe guards, restrictive permissions, and retry handling for Windows transient `EPERM`, `EBUSY`, and `EACCES`.
- Event log: `src/state/event-log.ts`, `jsonl-writer.ts`, and rotation helpers provide append-only run events.
- Task claims: `src/state/task-claims.ts` provides owner/token/lease based claims and guarded task status transitions.
- Heartbeats: runtime files include `worker-heartbeat.ts` and `heartbeat-watcher.ts`, with events such as `worker.heartbeat` and stale detection.
- Mailbox: `src/state/mailbox.ts` provides inbox/outbox JSONL files, delivery state, message acknowledgements, follow-ups, and validation.
- Safe API surface: `src/extension/team-tool/api.ts` exposes operations such as `read-manifest`, `read-tasks`, `read-events`, `read-mailbox`, `send-message`, `ack-message`, `claim-task`, `release-task-claim`, `transition-task-status`, and `write-heartbeat`.

The event contract includes coordination-oriented event types such as `run.blocked`, `task.blocked`, `branch.stale`, `mailbox.timeout`, `worktree.cleanup`, `worktree.dirty`, and `async.stale`.

## Mailbox Finding

`docs/live-mailbox-runtime.md` is explicit that the full live mailbox runtime is not yet a stable surface. The stable foundation is still useful:

```text
{stateRoot}/mailbox/inbox.jsonl
{stateRoot}/mailbox/outbox.jsonl
{stateRoot}/mailbox/delivery.json
{stateRoot}/mailbox/tasks/{taskId}/inbox.jsonl
{stateRoot}/mailbox/tasks/{taskId}/outbox.jsonl
```

For PKM-AI, this means copying the durable mailbox shape and safe operations is lower risk than depending immediately on Pi-crew's live mailbox runtime.

## Relevance To PKM-AI

The inspection strengthens the earlier recommendation: port the Pi-crew coordination contract into PKM-AI first, keep Pi-crew adoption optional.

Best first PKM-AI shape:

1. `.agents/state/runs/{runId}/manifest.json`;
2. `.agents/state/runs/{runId}/tasks.json`;
3. `.agents/state/runs/{runId}/events.jsonl`;
4. `.agents/state/runs/{runId}/agents/{agentId}/status.json`;
5. `.agents/state/runs/{runId}/mailbox/...`;
6. claim records with `owner`, `token`, `leasedUntil`, and scope metadata;
7. heartbeat records with stale detection;
8. bridge commands to read and update `manage-tasks.mjs` objective states.

The first implementation should be a small JSON CLI/API script. A dashboard or chat app should sit on top of that state contract after the contract is proven.

## Remaining Risks

- Pi-crew has not been run locally in this repository.
- Install flow and peer dependency resolution have not been validated.
- Worktree mode should not be tested inside the current dirty repository without an isolated workspace.
- Windows handling is present in source-level atomic write logic, but runtime behavior on this machine still needs a spike.
- The package has enough runtime surface area that adopting it wholesale would couple PKM-AI to Pi-crew's team model, CLI, and peer package ecosystem.

## Source Files Inspected

- `README.md`
- `docs/architecture.md`
- `docs/runtime-flow.md`
- `docs/live-mailbox-runtime.md`
- `docs/actions-reference.md`
- `docs/commands-reference.md`
- `docs/resource-formats.md`
- `docs/usage.md`
- `src/state/active-run-registry.ts`
- `src/state/atomic-write.ts`
- `src/state/contracts.ts`
- `src/state/event-log.ts`
- `src/state/event-log-rotation.ts`
- `src/state/jsonl-writer.ts`
- `src/state/locks.ts`
- `src/state/mailbox.ts`
- `src/state/state-store.ts`
- `src/state/task-claims.ts`
- `src/runtime/worker-heartbeat.ts`
- `src/runtime/heartbeat-watcher.ts`
- `src/runtime/task-graph.ts`
- `src/runtime/task-runner.ts`
- `src/runtime/team-runner.ts`
- `src/extension/team-tool/api.ts`

## External Links

- npm package: https://www.npmjs.com/package/pi-crew
- source repository: https://github.com/baphuongna/pi-crew
