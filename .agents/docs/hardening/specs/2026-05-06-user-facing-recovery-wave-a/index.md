---
title: User-facing recovery wave A
type: spec-index
status: draft
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-06T02:46:22
updated: 2026-05-06T02:46:22
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
  - logic/queue
glossary_candidates:
  - user-facing recovery wave
  - cMenu queue repair
  - rename handoff
  - quick-action badge
---

# User-facing Recovery Wave A

This spec captures the approved first wave for deferred hardening work. The
goal is to restore user-visible operational workflows before continuing deeper
interop, table, performance, or architecture work.

## Approved Direction

User selected option A: **User-Facing Recovery First**.

Execution priority:

1. Restore context-menu actions that must send operations to the queue.
2. Route prop/value rename into the FnR/navbar surface.
3. Route tag/file rename into the same handoff model.
4. Restore visible badges and quick actions for queue/filter state.

The user explicitly added a completion constraint: do not finish this wave
unless tag and file context-menu actions can send operations to the queue. This
is required so a developer can test later rename slices through the real menu
path.

## Shards

1. [[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/01-scope-and-slice-order|Scope and slice order]]
2. [[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/02-cmenu-queue-repair|CMenu queue repair]]
3. [[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/03-fnr-rename-handoff|FnR rename handoff]]
4. [[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/04-badges-and-navbar|Badges and navbar visibility]]
5. [[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/05-testing-and-exit-criteria|Testing and exit criteria]]

## Source Records

- [[docs/current/status|current status]]
- [[docs/current/handoff|current handoff]]
- [[docs/work/hardening/backlog/regressions/operations-suite-live-handoff|operations suite live handoff]]
- [[docs/work/hardening/backlog/regressions/navbar|navbar regression]]
- [[docs/work/hardening/backlog/regressions/file-ops|file ops regression]]
- [[docs/work/hardening/backlog/regressions/grid-view|grid view regression]]

## Non-Goals

- Do not implement Bases export or advanced parser compatibility in this wave.
- Do not build `viewTable.svelte` in this wave.
- Do not migrate to TanStack, add DnD, or do global formatting cleanup.
- Do not commit without explicit user request.

