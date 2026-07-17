---
title: Pi-crew isolated runtime spike
type: research
status: complete
parent: "[[docs/work/pkm-ai/research/2026-05-11-pi-crew-agent-coordination|Pi-crew and PKM-AI coordination]]"
created: 2026-05-11T02:34:55
updated: 2026-05-11T02:34:55
tags:
  - agent/research
  - initiative/pkm-ai
  - agent/workflow
  - agent/coordination
created_by: codex
updated_by: codex
---

# Pi-crew Isolated Runtime Spike

## Purpose

Validate Pi-crew in an isolated temporary project before writing the PKM-AI
`agent-room` spec.

The spike tested installation and durable state primitives only. It did not run
LLM worker sessions, did not execute a real Pi team run, and did not modify
Vaultman product code.

## Environment

- Pi CLI detected: `pi 0.73.0`.
- Pi-crew package: `pi-crew@0.2.0`.
- Temporary project:
  `C:\Users\vic_A\AppData\Local\Temp\pkm-ai-pi-crew-spike-204fb68008af4a32b9a1d2b6f0cafb93`.
- Isolated variables used:
  - `PI_CODING_AGENT_DIR=<temp>\pi-agent`
  - `PI_TEAMS_HOME=<temp>\pi-home`
  - `PI_TELEMETRY=0`

## Commands

```powershell
pi --version
pi install npm:pi-crew -l
pi list
```

Then a Node smoke imported Pi-crew's installed TypeScript modules through
`jiti` from the temporary local Pi package directory and exercised state APIs:

- `createRunManifest`
- `claimTask`
- `transitionClaimedTaskStatus`
- `saveRunTasks`
- `appendMailboxMessage`
- `acknowledgeMailboxMessage`
- `createWorkerHeartbeat`
- `appendEvent`
- `readEvents`
- `readMailbox`

## Result

`pi install npm:pi-crew -l` succeeded in the temporary project and installed
Pi-crew under:

```text
<temp>/.pi/npm/node_modules/pi-crew
```

The project-local settings file contained:

```json
{
  "packages": [
    "npm:pi-crew"
  ]
}
```

`pi list` reported:

```text
Project packages:
  npm:pi-crew
    <temp>\.pi\npm\node_modules\pi-crew
```

The state smoke created a run and wrote durable state under:

```text
<temp>/.pi/teams/state/runs/team_20260511073416_a8f2d3e32a839baf
<temp>/.pi/teams/artifacts/team_20260511073416_a8f2d3e32a839baf
```

Smoke output:

```json
{
  "runId": "team_20260511073416_a8f2d3e32a839baf",
  "events": ["run.created", "worker.heartbeat"],
  "taskStatus": "running",
  "claimOwner": "agent-alpha",
  "claimHasToken": true,
  "mailboxMessages": 1,
  "deliveryStatus": "acknowledged",
  "statusFileExists": true
}
```

## Findings

- Project-local install works on this machine with Pi `0.73.0`.
- When a project already has `.pi/settings.json`, Pi-crew stores team state in
  `.pi/teams`, matching the legacy layout documented by the package.
- Pi-crew's state primitives can be exercised without a live LLM worker:
  manifest, tasks, claims, mailbox, delivery ack, events, and agent status.
- Claims are owner/token based and guard status transitions.
- The mailbox is append-only JSONL plus a mutable delivery index.
- Worker heartbeat can be represented as JSON and mirrored into per-agent
  status.

## Limits

- The spike did not run `/team-run`, `/team-status`, `/team-dashboard`, or a
  real child Pi worker.
- No provider API call was made.
- Worktree mode was not tested.
- The smoke imported package internals through `jiti`; that validates the
  contract shape but is not an endorsed public integration boundary.

## Decision Impact

The spike supports the planned PKM-AI direction:

- copy the contract shape;
- keep the state root inside `.agents/state`;
- expose mutations through one PKM-AI script/API;
- avoid depending on Pi-crew as the runtime for Codex, Claude, Gemini, or
  Antigravity sessions.

The next document should be a PKM-AI `agent-room` spec, not a Pi-crew adoption
plan.
