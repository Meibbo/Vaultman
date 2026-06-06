---
title: Agent Room Control UI implementation plan
type: implementation-plan-index
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/specs/2026-06-06-agent-room-control-ui/index|agent-room-control-ui-spec]]"
created: 2026-06-06T10:24:00
updated: 2026-06-06T10:24:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/plan
  - initiative/pkm-ai
  - agent-room
  - control-plane
---

# Agent Room Control UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. When editing `.svelte` files, also use the repo's Svelte
> skills before edits and run the Svelte checks named in the relevant task.

**Goal:** Build a local, mobile-ready web UI that lets the human coordinator supervise and operate the
PKM-AI agent-room through guided actions backed by `agent-room.ts`.

**Architecture:** Add a new PKM-AI tool under `.agents/tools/pkm-ai/room-ui/`. The backend is a native
Node HTTP server that wraps `agent-room.ts` with structured arguments and passphrase-protected LAN mode.
The frontend is a Svelte 5 single-page app with `Overview`, `Command`, and `Streams` modes; it treats
room snapshots as display state only.

**Tech Stack:** Node 24 native TypeScript, Node `http`, Node test runner, Svelte 5, Vite, existing
workspace dependencies, `agent-room.ts`.

---

## Source Spec

[[docs/work/pkm-ai/specs/2026-06-06-agent-room-control-ui/index|Agent Room Control UI design]]

## Execution Order

1. [[01-backend-contracts|Backend contracts, risk policy, and command previews]]
2. [[01-backend-contracts-part-2|Backend contract continuation: previews and alerts]]
3. [[02-server-and-client|Server API and `agent-room.ts` wrapper]]
4. [[03-frontend-and-mobile|Svelte shell and app foundation]]
5. [[03-frontend-and-mobile-styles|Frontend continuation: responsive styles and build]]
6. [[03-frontend-and-mobile-part-2|Frontend continuation: guided forms and mobile actions]]
7. [[04-verification-and-closeout|Verification, smoke, and closeout]]

## File Map

Create:

- `.agents/tools/pkm-ai/room-ui/package.json` - room-ui scripts, isolated from Vaultman plugin scripts.
- `.agents/tools/pkm-ai/room-ui/tsconfig.json` - NodeNext + Svelte-compatible strict config.
- `.agents/tools/pkm-ai/room-ui/vite.config.ts` - Vite build for the browser client.
- `.agents/tools/pkm-ai/room-ui/index.html` - Vite entry.
- `.agents/tools/pkm-ai/room-ui/server.ts` - local/LAN HTTP server and API routes.
- `.agents/tools/pkm-ai/room-ui/src/main.ts` - Svelte mount entry.
- `.agents/tools/pkm-ai/room-ui/src/App.svelte` - app shell and mode routing.
- `.agents/tools/pkm-ai/room-ui/src/styles.css` - responsive app styling.
- `.agents/tools/pkm-ai/room-ui/src/lib/types.ts` - shared snapshot, command, risk, and API types.
- `.agents/tools/pkm-ai/room-ui/src/lib/riskPolicy.ts` - action risk classification.
- `.agents/tools/pkm-ai/room-ui/src/lib/commandPreview.ts` - structured CLI command previews.
- `.agents/tools/pkm-ai/room-ui/src/lib/alerts.ts` - derived critical/attention/info alerts.
- `.agents/tools/pkm-ai/room-ui/src/lib/agentRoomClient.ts` - backend-side `agent-room.ts` wrapper.
- `.agents/tools/pkm-ai/room-ui/src/lib/preferences.ts` - UI preference defaults and persistence shape.
- `.agents/tools/pkm-ai/room-ui/src/lib/api.ts` - frontend fetch helper.
- `.agents/tools/pkm-ai/room-ui/test/riskPolicy.test.mjs`
- `.agents/tools/pkm-ai/room-ui/test/commandPreview.test.mjs`
- `.agents/tools/pkm-ai/room-ui/test/alerts.test.mjs`
- `.agents/tools/pkm-ai/room-ui/test/agentRoomClient.test.mjs`
- `.agents/tools/pkm-ai/room-ui/test/serverAuth.test.mjs`

Modify:

- `.agents/tools/pkm-ai/package.json` - add a narrow `room-ui:*` script set.

Do not modify:

- `src/`
- `manifest.json`
- `versions.json`
- release workflows
- product plugin build scripts

## Commit Plan

- Commit 1: scaffold room-ui and backend pure libraries.
- Commit 2: implement `agent-room.ts` wrapper and HTTP API.
- Commit 3: implement Svelte UI and responsive layout.
- Commit 4: add LAN/mobile auth checks, smoke notes, and closeout updates.

## Objective Checklist

- [ ] Build backend contracts and unit-tested risk/preview/alert logic.
- [ ] Build structured `agent-room.ts` wrapper and API server.
- [ ] Build Svelte UI modes: `Overview`, `Command`, `Streams`.
- [ ] Add explicit local/LAN modes with passphrase-protected mobile access.
- [ ] Verify no outside-MVP command is exposed.
- [ ] Verify the tool does not touch Vaultman plugin product code.
