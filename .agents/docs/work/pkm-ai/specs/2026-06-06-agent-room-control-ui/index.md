---
title: Agent Room Control UI design
type: spec
status: draft
lifecycle: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-06-06T09:59:00
updated: 2026-06-06T09:59:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
glossary_candidates:
  - Agent Room Control
  - human-controller
  - LAN mode
  - guided action
  - command preview
tags:
  - agent/spec
  - initiative/pkm-ai
  - agent-room
  - control-plane
---

# Agent Room Control UI Design

## Purpose

Create a local web UI for supervising and operating the PKM-AI agent-room. The UI is for the human coordinator first, while agents continue to use `agent-room.ts` directly through the CLI. Both surfaces read and mutate the same agent-room state, so the UI does not create a second coordination protocol.

The first MVP combines a supervision dashboard and a guided command center. It must support desktop use and phone-browser access over LAN from the first cut.

## Accepted Decisions

- The UI is **human-first**. Agents remain CLI-first for token efficiency and deterministic command use.
- The UI has three modes behind one menu: `Overview`, `Command`, and `Streams`.
- `Overview` is the default screen.
- `Command` uses guided forms, not a free-form console.
- Real actions are allowed in the MVP for low/medium risk actions; high-risk actions require dry-run, fresh snapshot, and strong confirmation.
- The UI runs as PKM-AI tooling under `.agents/tools/pkm-ai/room-ui/`, not under `src/`.
- The backend uses `agent-room.ts` as the single engine and must not write agent-room files directly.
- The UI operator identity is separate from technical agents: default `operatorAgentId` is `human-controller`.
- State refresh uses polling plus manual refresh, matching ADR 0003's semi-real-time model.
- Mobile/LAN access is part of the MVP, behind a temporary passphrase.
- Preferences are local UI preferences only and are not part of the room source of truth.

## Architecture

The MVP is a local Node + Svelte app:

- `server.ts`: local HTTP server, API routes, auth for LAN mode, CLI command wrapper.
- `src/App.svelte`: Svelte 5 shell with `Overview`, `Command`, and `Streams` modes.
- `src/lib/agentRoomClient.ts`: structured wrapper for `agent-room.ts` commands.
- `src/lib/commandPreview.ts`: builds auditable command previews before execution.
- `src/lib/riskPolicy.ts`: classifies actions as low, medium, high, or outside-MVP.
- `src/lib/alerts.ts`: derives human-facing alerts from snapshots and mailbox state.
- `src/lib/preferences.ts`: reads/writes local UI preferences.

The UI is not part of the Obsidian plugin build. It must not affect `pnpm run build` for Vaultman.

## Data Flow

The room state remains authoritative in the agent-room runtime. The UI keeps only display snapshots.

Primary reads:

- `agent-room.ts status --run current --json` for agents, tasks, claims, conflicts, and unread messages.
- `agent-room.ts handoff --run current` for a textual room handoff when requested.
- `agent-room.ts mailbox read --run current --agent human-controller --json` for operator messages.
- `agent-room.ts objectives list --run current --json` only in advanced/reference views.

The frontend sends structured intents to the backend, such as `task.add`, `mailbox.send`, `scope.claim`, or `task.status`. The backend validates the intent, computes the risk level, builds the CLI command, executes `agent-room.ts`, and returns the command result plus a fresh snapshot.

Before any medium/high-risk mutation, the backend refreshes the room snapshot. If relevant state changed since the user reviewed the preview, the UI requires reconfirmation.

## Screens

### Overview

Default opening screen. Shows:

- active run ID and run status;
- current operator identity;
- last refresh age and manual `Refresh now`;
- summary cards for agents, tasks, claims/conflicts, and mailbox;
- alert inbox grouped as critical, attention, and info;
- event feed;
- detail panel for selected agent, task, scope, or message.

### Command

Guided action mode. MVP forms:

- create task;
- claim task;
- release claim;
- change task status;
- check scope conflicts;
- claim scope for a task;
- send mailbox message;
- read/ack mailbox message.

Each form shows the command equivalent, expected impact, risk level, and confirmation state before execution. No free-form command console exists in the MVP.

### Streams

Cross-worktree view grouped into lanes:

- `stable`;
- `beta`;
- `canary`;
- `goal`;
- `unknown`.

Each lane shows agents, worktrees, tasks, stale state, waiting dependencies, and relevant messages.

## Actions And Risk

Low-risk actions:

- read snapshots;
- refresh;
- ack messages addressed to `human-controller`;
- change UI preferences.

Medium-risk actions:

- create task;
- send message;
- claim scope with no conflict;
- release claim owned by `human-controller`;
- change state of a task owned by `human-controller`.

High-risk actions:

- change state of another agent's task;
- claim a scope with conflict;
- release another agent's claim;
- mark another agent's task `blocked`, `done`, `failed`, `cancelled`, or `skipped`.

Outside the MVP:

- `--force`;
- closing or deleting runs;
- deleting room state;
- editing shared docs;
- running git/build/release commands;
- cleaning branches, tags, or GitHub releases.

## Mobile And LAN

The server starts in one of two modes:

- `local`: binds to `127.0.0.1` and is accessible only from the desktop machine.
- `lan`: binds to `0.0.0.0`, displays a LAN URL, and requires a temporary passphrase.

LAN mode is explicit. The phone browser must authenticate before it can read room state or execute actions. If authentication fails, no room data is shown. If the server restarts or exits LAN mode, mobile sessions become invalid and must authenticate again.

Responsive layout:

- desktop uses top tabs and a persistent side detail/action panel;
- mobile uses bottom navigation, compact cards, and a bottom sheet for guided actions.

## Alerts

Critical:

- active scope conflict;
- blocked task;
- high-priority message without ack;
- lease expiring in less than 60 seconds on an active task.

Attention:

- stale agent;
- task waiting on a dependency that is already done;
- in-progress task whose owner has no recent heartbeat;
- normal message without ack.

Info:

- agent joined or left;
- task created or closed;
- normal claim or release.

## Error Handling

CLI errors are operation errors, not app crashes. The UI shows the attempted command, stderr/stdout, the current snapshot age, and next options such as refresh, retry, edit the form, or cancel.

If no run is active, the UI offers `ensure/join` as `human-controller`. If the state root is unavailable, the UI shows setup guidance instead of an empty dashboard.

Scope conflicts are expected coordination events. The UI should show owner, task, leased-until time, and actions to message the owner, wait for lease expiry, or choose another scope.

Stale agents are not hidden or deleted. Actions that affect their tasks are high risk.

## Verification

Unit tests:

- risk classification;
- command preview generation;
- snapshot parsing from `status --json`;
- alert derivation.

Backend tests:

- command invocation uses structured args, not unsafe shell strings;
- CLI errors return structured failures;
- passphrase blocks unauthenticated LAN reads/actions;
- medium/high-risk actions refresh snapshot before execution.

UI tests:

- desktop renders `Overview`, `Command`, and `Streams`;
- mobile layout is usable at phone widths;
- guided forms show command preview, risk, and impact;
- outside-MVP actions are absent.

Manual smoke:

- start local mode;
- start LAN mode with passphrase;
- open from phone browser;
- create a test task;
- send a test message;
- check a scope conflict;
- ack a message;
- confirm no `--force`, run close, state delete, git, build, or release action is exposed.

## Open Follow-Up

After this spec is accepted, write an implementation plan. The plan should start with a thin backend wrapper around `agent-room.ts`, then add the Svelte shell and finally mobile/LAN auth.
