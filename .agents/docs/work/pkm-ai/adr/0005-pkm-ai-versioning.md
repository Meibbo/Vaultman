---
title: PKM-AI 0005 — PKM-AI versioning system
type: adr
status: active
parent: "[[docs/work/pkm-ai/adr/README|pkm-ai adr]]"
created: 2026-06-04T00:00:00
updated: 2026-06-04T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/adr
  - initiative/pkm-ai
---

# PKM-AI 0005 — PKM-AI Versioning System

**Decision status:** Accepted (dev-directed 2026-06-04). **Date:** 2026-06-04.

## Context

PKM-AI (the agent protocol + state schema + `.agents/tools/` tooling) evolves, but there is no version
surface → agents don't know which contract they operate under, and upgrades are untracked / silent. The dev
wants a version system. Seed already exists: agent-room manifest `schemaVersion: 1`.

## Decision

A single **PKM-AI semantic version** covering the protocol/contract + state schema + tooling, surfaced so
any agent reads it cheaply at startup.

- **Source of truth:** `.agents/pkm-ai.version.json` = `{ pkmAiVersion, protocolVersion, stateSchemaVersion,
  toolingVersion }`. Semver: **MAJOR** = breaking protocol/schema change (agents MUST re-read protocol docs);
  **MINOR** = additive; **PATCH** = fixes.
- **Read at startup:** runtime-startup step 0 (0004) reads `pkmAiVersion`; on a MAJOR mismatch vs what the
  agent last knew, it re-reads the protocol docs before acting.
- **Changelog:** `docs/work/pkm-ai/CHANGELOG.md` records each bump + what changed → doubles as the
  "new-since" delta surface for fresh agents (ties best-practices P2 / S-13).
- **Ties:** `stateSchemaVersion` ← agent-room `schemaVersion` (0003); `toolingVersion` ← `.ts` tooling (0001).

## Consequences

- Agents know which contract they're on; breaking upgrades are explicit (forced re-read), not silent drift.
- Cheap: one JSON + a changelog; deltas discoverable without diffing the whole tree.
- Cost: discipline to bump on every protocol/schema/tooling change + maintain the changelog.

## Alternatives considered

- **No versioning (status quo):** silent drift; agents run stale contracts.
- **Per-script versions only:** no system-wide contract; can't answer "which protocol am I on?".
- **Git hash as version:** opaque, non-semantic; can't signal breaking vs additive.
