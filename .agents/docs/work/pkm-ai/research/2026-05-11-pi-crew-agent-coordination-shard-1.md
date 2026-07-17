---
title: Pi-crew coordination comparison shard
type: research-shard
status: active
parent: "[[docs/work/pkm-ai/research/2026-05-11-pi-crew-agent-coordination|Pi-crew and PKM-AI coordination]]"
shard_source: ".agents/docs/work/pkm-ai/research/2026-05-11-pi-crew-agent-coordination.md"
shard_of: "[[docs/work/pkm-ai/research/2026-05-11-pi-crew-agent-coordination|Pi-crew and PKM-AI coordination]]"
shard_part: 1
created: 2026-05-11T01:08:42
updated: 2026-05-11T01:08:42
tags:
  - agent/research
  - agent/shard
  - initiative/pkm-ai
  - agent/workflow
  - agent/coordination
created_by: codex
updated_by: codex
---

# Pi-crew Coordination Comparison Shard

## Compared Options

### Generic Agent Frameworks

LangGraph, AutoGen, CrewAI, and OpenAI Agents SDK provide multi-agent runtime
patterns such as supervisors, handoffs, teams, group chats, sessions, and traces.
They are useful architectural references, but they solve orchestration inside a
runtime more than shared coordination between independent Codex, Claude, Gemini,
or Antigravity sessions editing the same repository.

They do not directly solve PKM-AI's most local problem: a repo-resident shared
control plane that every agent can inspect before claiming a task or touching a
file.

### Task And Issue Systems

Task Master AI, GitHub Issues/Projects, and Linear cover task state,
dependencies, assignees, comments, and workflow status. Task Master AI is the
closest generic AI-dev task manager because it already offers CLI/MCP task
workflows.

These systems are useful references or optional integrations, but they still do
not fully cover local write-scope ownership, heartbeat, stale-agent cleanup, and
agent mailbox semantics inside this repo.

### Pi Ecosystem

The Pi ecosystem is much closer to the requested capability. The strongest
package found is `pi-crew`, which advertises:

- run manifests;
- tasks;
- event logs;
- heartbeat;
- claim operations;
- mailbox operations;
- worktree mode;
- retries and deadletter handling;
- dashboard/TUI;
- project-local state such as run manifests, tasks, events, and mailbox files.

Related Pi packages worth further inspection:

- `pi-multiagent`: DAG-style multi-agent execution, roles, fan-in synthesis,
  output contracts, and tool allowlists.
- `@tintinweb/pi-subagents`: persistent subagents, lifecycle events, memory per
  agent, and worktree isolation.
- `multipi`: subagents, tmux-style visibility, web search, tool propagation, and
  model routing.
- `pi-memory` and `pi-total-recall`: persistent memory and local session search,
  useful as complements but not full coordination layers.
- `pi-messenger`, `agent-comms`, and `pi-messenger-swarm`: useful references
  for rooms, members, channels, status, read receipts, task lifecycle, and
  event-sourced communication.

## Two Integration Directions

### Direction A - Implement PKM-AI On Top Of Pi-crew

This means Pi-crew becomes the primary runtime/control plane. PKM-AI becomes a
set of resources, workflows, policies, docs, and adapters that Pi-crew executes
or coordinates.

Benefits:

- immediate access to a richer coordination model;
- lower design burden because Pi-crew already has runs, tasks, events,
  mailbox, heartbeat, claims, dashboard, worktree mode, retry, deadletter, and
  metrics-like surfaces;
- better fit if the user wants a Pi-first multi-agent runtime.

Costs and risks:

- Vaultman becomes Pi-first instead of Codex/Claude-neutral;
- `.agents/docs`, skills, AGENTS.md policies, Obsidian Markdown records, and
  `manage-tasks.mjs` would need adapters or migration paths;
- package execution and supply-chain trust must be audited and pinned;
- Windows, Obsidian, and branch hygiene behavior need validation;
- future agents that do not run Pi may lose first-class access to coordination
  state.

Likely outcome:

- faster access to advanced orchestration;
- higher dependency and migration risk;
- less control over the exact contract that PKM-AI agents already follow.

### Direction B - Bring The Pi-crew Contract Into PKM-AI

This means PKM-AI remains the repo-native control plane, and the next
implementation copies the proven Pi-crew shape rather than inventing from
scratch.

Candidate local state shape:

```text
.agents/state/agent-room/
  runs/<runId>/manifest.json
  runs/<runId>/tasks.json
  runs/<runId>/events.jsonl
  runs/<runId>/mailbox/<agentId>.jsonl
  runs/<runId>/claims.json
  runs/<runId>/heartbeats.json
```

Candidate CLI commands:

```powershell
node .agents/tools/pkm-ai/agent-room.mjs join --run <runId> --agent codex
node .agents/tools/pkm-ai/agent-room.mjs status --run <runId> --json
node .agents/tools/pkm-ai/agent-room.mjs claim --run <runId> --objective <slug> --scope src/components/views/ViewTree.svelte
node .agents/tools/pkm-ai/agent-room.mjs heartbeat --run <runId> --agent codex
node .agents/tools/pkm-ai/agent-room.mjs say --run <runId> --to all --message "Agent B owns ViewTree."
node .agents/tools/pkm-ai/agent-room.mjs release --run <runId> --agent codex --scope src/components/views/ViewTree.svelte
node .agents/tools/pkm-ai/agent-room.mjs done --run <runId> --objective <slug>
```

Benefits:

- keeps PKM-AI independent of any one agent runtime;
- works for Codex, Claude, Gemini, Antigravity, and any tool that can call Node
  or read/write local files;
- preserves existing Obsidian docs, policies, handoff style, and task-state
  automation;
- allows `manage-tasks.mjs` to remain the source for Markdown objective state
  while `agent-room.mjs` owns live coordination;
- easier to keep AI workflow files off `main` because state remains under
  `.agents/`.

Costs and risks:

- more local implementation work;
- requires careful atomic write or append semantics on Windows;
- dashboard/app is a second slice unless the CLI proves insufficient;
- a partial clone of Pi-crew could drift unless the contract is explicit and
  documented.

Likely outcome:

- slower first implementation than adopting Pi-crew wholesale;
- better alignment with Vaultman's current multi-agent, multi-tool reality;
- lower lock-in and safer incremental rollout.
