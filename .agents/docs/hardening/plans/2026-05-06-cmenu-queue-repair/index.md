---
title: CMenu queue repair implementation
type: implementation-plan-index
status: completed
parent: "[[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/index|user-facing-recovery-wave-a]]"
created: 2026-05-06T03:00:09
updated: 2026-05-06T03:18:00
tags:
  - agent/plan
  - initiative/hardening
  - logic/queue
  - explorer/tags
  - explorer/files
glossary_candidates:
  - cMenu queue repair
  - queue builder
  - file delete queue operation
---

# CMenu Queue Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use test-driven-development for
> every behavior below. Run each red test before implementing its matching
> production change. Use systematic-debugging if a failure is not the expected
> red.

**Goal:** restore the tag and file context-menu paths so they stage queue-visible
work instead of silently doing nothing or bypassing Vaultman's queue.

**Architecture:** move queue payload construction into small pure builders,
reuse those builders from modals/providers, and add only the minimum queue
contract needed for file deletion if the red test proves it is the broken file
operation. Keep the CMenu service API unchanged.

**Tech Stack:** TypeScript, Svelte 5 component wiring only if required by the
rename handoff, Vitest unit tests, existing `OperationQueueService`,
`IOperationsIndex`, and Obsidian `TFile` mocks.

## Source Records

- [[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/02-cmenu-queue-repair|CMenu queue repair spec]]
- [[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/05-testing-and-exit-criteria|Wave A testing criteria]]
- [[docs/work/hardening/backlog/regressions/file-ops|file ops regression]]
- [[docs/current/handoff|current handoff]]

## Shards

1. [[docs/work/hardening/plans/2026-05-06-cmenu-queue-repair/01-tag-queue-contract|Tag queue contract]]
2. [[docs/work/hardening/plans/2026-05-06-cmenu-queue-repair/02-file-queue-contract|File queue contract]]
3. [[docs/work/hardening/plans/2026-05-06-cmenu-queue-repair/03-cmenu-provider-integration|CMenu provider integration]]
4. [[docs/work/hardening/plans/2026-05-06-cmenu-queue-repair/04-verification-and-slice-close|Verification and slice close]]

## Execution Order

1. Write the red test for `tag.rename` through the registered CMenu action.
2. Extract and use tag queue builders until tag rename/delete/add tests pass.
3. Write the red tests for file rename/move builders and file delete queue
   behavior.
4. Extract file rename/move builders from the modals without changing the modal
   UX.
5. Add a minimal file delete queue operation only if the file delete red test
   confirms the queue cannot represent the action today.
6. Wire providers to the builders and keep direct Obsidian trash out of the
   Vaultman operation path.
7. Run the focused verification set, update current docs, then announce that
   A0 is complete and name A1 as the next slice.

## Stop Conditions

- Stop and report if file deletion needs a destructive commit semantic that
  cannot be represented safely in `OperationQueueService` without broad queue
  redesign.
- Stop and report if a required test must touch unrelated dirty files owned by
  another in-progress change.
- Do not commit.
