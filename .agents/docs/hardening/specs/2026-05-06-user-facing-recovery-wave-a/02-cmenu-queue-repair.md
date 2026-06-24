---
title: CMenu queue repair
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/index|user-facing-recovery-wave-a]]"
created: 2026-05-06T02:46:22
updated: 2026-05-06T02:46:22
tags:
  - agent/spec
  - initiative/hardening
  - logic/queue
---

# CMenu Queue Repair

## Problem

The context-menu path must be a reliable way for a developer and user to stage
operations. Current inspection shows three separate problems:

- `explorerTags` registers `tag.rename`, but its `run` handler is a no-op.
- `explorerFiles` registers `file.delete`, but it calls Obsidian trash directly
  instead of staging a queue operation.
- `file.rename` and `file.move` depend on modal interaction, which makes the
  menu action difficult to verify as action-to-queue behavior in tests.

## Required Behavior

Context-menu actions for tags and files must either:

- stage a `PendingChange` directly, or
- start a typed handoff that the FnR/navbar slice can complete and test through
  public state.

For A0, direct queue staging is preferred when the input is already known. If a
rename needs user input, A0 should expose a deterministic handoff object rather
than silently doing nothing.

## Minimum A0 Scope

- `tag.delete` remains a queue operation and keeps existing tests green.
- `tag.rename` must no longer be a no-op. It should create a rename handoff or
  queue operation through a tested public seam.
- `file.rename` must have a tested path from context-menu action to queueable
  rename intent. It may still use the existing modal visually, but the core
  operation builder must be testable without opening Obsidian UI.
- `file.move` should follow the same builder pattern if it remains modal-based.
- `file.delete` must not bypass the queue if it appears as a Vaultman operation.
  If true file deletion is not yet supported by `OperationQueueService`, the
  action should be scoped or relabeled so it does not pretend to be a queued
  Vaultman operation.

## Root-Cause Hypotheses To Test

1. `tag.rename` fails because its registered action has no implementation.
2. File menu behavior is split between queue-based rename/move modals and a
   direct destructive delete action, so the menu surface has no consistent
   queue contract.
3. Tests currently exercise provider internals and selected delete paths, but
   do not pin every context-menu action that should create queue work.

## Out Of Scope

- Full visual FnR/navbar surface.
- New file-delete queue engine if the queue does not yet support safe file
  deletion semantics.
- ContextMenuService redesign. That remains a later performance/architecture
  deferred item.

