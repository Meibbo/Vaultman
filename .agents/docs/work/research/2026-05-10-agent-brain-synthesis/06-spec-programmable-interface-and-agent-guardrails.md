---
title: Spec - Programmable Interface And Agent Guardrails
status: draft
created: 2026-05-09T23:45:00
updated: 2026-05-09T23:45:00
created_by: codex
updated_by: codex
parent: "[[work/research/2026-05-10-agent-brain-synthesis/index|Agent Brain Synthesis]]"
---

# Spec - Programmable Interface And Agent Guardrails

## Problem

The strongest archived product thesis was Vaultman as a supervised bulk-ops harness for AI agents. The current codebase has queue, filters, commands, views, and typed contracts, but it does not expose a stable programmable interface for agents.

Current evidence:

- No `serviceAPI` implementation is present.
- Queue and filter services exist but are internal app services.
- Templates index remains stubbed.
- Marks/linter surfaces are post-rc.1 or unwired.

## Goal

Define a small, typed, user-supervised API that lets an agent prepare, inspect, and queue operations without bypassing Vaultman's review model.

## Required Principles

- Agent actions must route through existing queue/review surfaces.
- No direct destructive vault mutation through the programmable API.
- Every operation must have a previewable target set.
- API responses should expose counts, affected paths, validation errors, and rollback limits.
- The API should use current contracts before adding new abstractions.

## Candidate API Surface

### Read Scope

- list current filtered nodes;
- list selected nodes;
- describe active filters;
- describe visible view state;
- inspect queue summary.

### Plan Scope

- build tag add/remove plans;
- build property set/remove/rename plans;
- build path move/rename plans;
- build text/FnR plans when the current FnR service can preview safely.

### Queue Scope

- enqueue a validated plan;
- return logical operation count;
- return grouped human-readable summary;
- expose conflicts and invalid targets.

### Guardrail Scope

- reject direct mutation without queue review;
- require explicit user confirmation for destructive operations;
- fail closed when target scope is ambiguous;
- record agent-origin metadata on queued operations.

## Dependencies

- Queue contract drift must be resolved or documented.
- Explorer/filter selected scope must be verified.
- File/grid operation parity should be clear enough that API operations do not target unsupported UI paths.
- Lifecycle/index ownership does not have to be complete, but API reads must not depend on stale index state.

## Superseded Notes

- Old "programmatic API" references were broad. Current spec should start with a narrow read/plan/enqueue API, not a full automation layer.
- Bases I/O text should wait until the basic queue-backed API proves useful.
- Agent Guardrail Skill should be documented after the API contract exists, not before.

## Acceptance Criteria

- A `serviceAPI` or equivalent module exposes a typed, test-covered contract.
- API can enumerate active scope and create at least one queued non-destructive operation.
- Destructive operation attempts require queue review and explicit user action.
- Ambiguous scope returns an error, not a best guess.
- Documentation includes examples for an agent preparing a bulk tag/property operation without applying it directly.
