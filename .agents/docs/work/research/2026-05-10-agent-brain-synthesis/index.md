---
title: Agent Brain Synthesis Index
status: active
created: 2026-05-09T23:45:00
updated: 2026-05-09T23:45:00
created_by: codex
updated_by: codex
parent: "[[work/research/index|Research Work Index]]"
---

# Agent Brain Synthesis Index

## Purpose

This record consolidates active and archived agent-brain projects, extracts work that is still not done, and converts the durable fundamentals into specs that apply to the current codebase.

This is not a replacement for source plans. It is a navigation and decision surface for ignored, deferred, superseded, and still-valid work.

## Source Scope

- Active current docs: [[current/status]], [[current/handoff]], [[current/engineering-context]].
- Active work folders: `work/hardening`, `work/performance`, `work/polish`, `work/research`, `work/v1-stable`, `work/pkm-ai`.
- Archived work folders: `archive/pkm-ai/migration-2026-05-04/raw/docs`, `archive/superpowers`, `archive/hardening`.
- Current code signals checked against `src/main.ts`, `src/index`, `src/services`, `src/components/frame`, `src/components/views`, `src/types`, and unit-test paths when present.

## Shards

- [[work/research/2026-05-10-agent-brain-synthesis/01-project-inventory|01 Project Inventory]]
- [[work/research/2026-05-10-agent-brain-synthesis/02-pending-ledger|02 Pending Ledger]]
- [[work/research/2026-05-10-agent-brain-synthesis/03-spec-lifecycle-and-indexing|03 Spec - Lifecycle And Indexing]]
- [[work/research/2026-05-10-agent-brain-synthesis/04-spec-explorer-operations-and-verification|04 Spec - Explorer Operations And Verification]]
- [[work/research/2026-05-10-agent-brain-synthesis/05-spec-polish-and-surface-ux|05 Spec - Polish And Surface UX]]
- [[work/research/2026-05-10-agent-brain-synthesis/06-spec-programmable-interface-and-agent-guardrails|06 Spec - Programmable Interface And Agent Guardrails]]

## Status Legend

- `pending`: still not implemented or not verified in current code.
- `active`: current initiative with an accepted or in-flight plan.
- `done`: implemented and supported by current code or recent docs.
- `superseded`: old instruction is obsolete because code, scope, or product direction moved past it.
- `partial`: some intent landed, but remaining behavior or verification still matters.

## Immediate Readout

The largest unhandled body of work is not one feature. It is a backlog of verification and integration promises that survived from archived hardening plans into current v1 scope:

- lifecycle/index ownership remains pending;
- explorer/file/grid verification cuts remain pending;
- queue contract drift remains partially pending;
- v1 polish cuts 19-24 remain largely unimplemented;
- programmable interface and agent guardrails remain unimplemented;
- Pretext card layout is active but currently mid-plan and owned by another agent in the dirty worktree.
