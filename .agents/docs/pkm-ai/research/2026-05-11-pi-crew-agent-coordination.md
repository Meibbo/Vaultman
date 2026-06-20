---
title: Pi-crew and PKM-AI parallel agent coordination research
type: research
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-11T01:08:42
updated: 2026-05-11T02:34:55
tags:
  - agent/research
  - initiative/pkm-ai
  - agent/workflow
  - agent/coordination
created_by: codex
updated_by: codex
---

# Pi-crew And PKM-AI Parallel Agent Coordination Research

## Purpose

The user asked to investigate, plan, and eventually implement what PKM-AI lacks
for stronger parallel agent work. The concrete failure observed is that agents
do not have a fast shared way to know what another agent is working on unless
the prompt explicitly says it. The user proposed a living memory and
inter-agent chat room, preferably through an app or TypeScript script instead
of slow manual Markdown editing.

This record captures the comparative research and handoff for the next agent.
No implementation has been approved or started.

## Current PKM-AI Baseline

Existing PKM-AI already has useful pieces:

- `manage-tasks.mjs` can mark objective-level tasks as `todo`,
  `in-progress`, `done`, `cancelled`, `on-hold`, `blocked`, or `question`.
- `manage-tasks.mjs` can retrieve objective states through
  `--list-objectives`, `--get-objective`, `--initiative`, `--status`, and
  `--json`.
- The task-state automation plan explicitly says same-file writes are a
  single-file mechanical update, not a concurrent writer.
- The subagent policy says the main agent remains coordinator and worker
  subagents need disjoint write scopes.
- The Dock Toolbar dispatch shortcuts are an example of manual parallel
  coordination through ownership boundaries.

What is missing:

- shared run/session state for active agents;
- claims or leases for task and file/scope ownership;
- heartbeats and stale-agent detection;
- a mailbox or event log for agent-to-agent communication;
- conflict detection before two agents edit the same scope;
- a dashboard or fast status command that summarizes active work without
  opening multiple Markdown files;
- integration between live claims and `manage-tasks.mjs` objective state.

## Detailed Comparison Shard

Detailed option comparisons and the two integration directions live in
[[docs/work/pkm-ai/research/2026-05-11-pi-crew-agent-coordination-shard-1|Pi-crew coordination comparison shard]].

## Source Inspection Shard

The first validation step was completed against the published `pi-crew@0.2.0`
npm package and bundled source/docs. Findings live in
[[docs/work/pkm-ai/research/2026-05-11-pi-crew-agent-coordination-shard-2|Pi-crew source inspection shard]].

## Runtime Spike

The isolated Pi-crew spike was completed outside product code and recorded in
[[docs/work/pkm-ai/research/2026-05-11-pi-crew-runtime-spike|Pi-crew isolated runtime spike]].

It confirmed project-local installation with Pi `0.73.0` and a durable-state
smoke for manifest, task claims, task status, mailbox ack, event log, and agent
status files.

## Recommended Decision

Do not migrate PKM-AI wholesale into Pi-crew yet.

Use Pi-crew as the primary benchmark and port its smallest useful contract into
PKM-AI:

1. run manifest;
2. task/objective claims;
3. scope/file claims;
4. heartbeat and stale detection;
5. append-only events;
6. per-agent mailbox;
7. JSON status command;
8. bridge to `manage-tasks.mjs` for objective state.

The next design should explicitly state which Pi-crew ideas are copied and
which are deferred. Dashboard/app work should wait until the CLI/state contract
is proven unless the user explicitly prioritizes visual control.

## Open Validation Work

The next agent should not implement directly from this research. Current state:

1. Completed: inspected the actual `pi-crew@0.2.0` package docs/source.
2. Completed from package metadata/docs: current package name, repository,
   default state paths, and source-level Windows atomic-write handling.
3. Completed: isolated Pi-crew installation and durable-state spike.
4. Completed: compare Pi-crew's persisted files against the proposed `.agents/state`
   layout.
5. Completed: write a PKM-AI spec for `agent-room.mjs` and keep Pi-crew as a
   reference, not a required runtime.

## Source Links

- Pi-crew package page: https://pi.dev/packages/pi-crew
- Pi-crew npm package: https://www.npmjs.com/package/pi-crew
- Pi-crew source repository: https://github.com/baphuongna/pi-crew
- Pi-multiagent package page: https://pi.dev/packages/pi-multiagent
- Pi subagents package page: https://pi.dev/packages/%40tintinweb/pi-subagents
- Multipi package page: https://pi.dev/packages/%40chewey182/multipi
- Pi-memory package page: https://pi.dev/packages/pi-memory
- Pi-total-recall package page: https://pi.dev/packages/pi-total-recall
- Pi-messenger package page: https://pi.dev/packages/pi-messenger
- Agent-comms package page: https://pi.dev/packages/agent-comms
- Pi-messenger-swarm package page:
  https://pi.dev/packages/pi-messenger-swarm
- Task Master AI MCP docs: https://docs.task-master.dev/capabilities/mcp
- Task Master AI tutorial:
  https://github.com/eyaltoledano/claude-task-master/blob/main/docs/tutorial.md
- LangGraph supervisor docs:
  https://langchain-ai.lang.chat/langgraph/reference/supervisor/
- AutoGen teams docs:
  https://microsoft.github.io/autogen/stable/reference/python/autogen_agentchat.teams.html
- CrewAI docs: https://docs.crewai.com/en/index
- OpenAI Agents SDK handoffs:
  https://openai.github.io/openai-agents-js/guides/handoffs
- OpenAI Agents SDK sessions:
  https://openai.github.io/openai-agents-js/guides/sessions/

## Handoff For Next Agent

Mode: `research` or `update` if continuing documentation; `implement` only
after the user approves a concrete spec/plan.

Suggested next prompt response:

1. Read this record and the source inspection shard.
2. Continue from [[docs/work/pkm-ai/specs/2026-05-11-agent-room/index|Agent room]]
   if implementation is approved.
3. Use the implementation plan shard and keep writes scoped to
   `.agents/tools/pkm-ai`, `.agents/state`, and compact docs updates.

Do not claim Pi-crew was run with real LLM workers. This session tested
project-local installation and durable-state primitives only.
