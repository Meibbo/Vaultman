---
title: Scope and slice order
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/index|user-facing-recovery-wave-a]]"
created: 2026-05-06T02:46:22
updated: 2026-05-06T02:46:22
tags:
  - agent/spec
  - initiative/hardening
---

# Scope And Slice Order

## Context

The deferred list contains several unrelated systems: rename workflows,
context-menu regressions, navbar badges, Bases/Dataview interop, table view
debt, performance optimization, DnD, semantic indexing, and formatting cleanup.
The user chose to recover daily user workflows first.

## Considered Approaches

### Approach A: User-facing recovery first

Restore the workflows users touch every day: context menus, rename handoff,
visible queue/filter state, quick badges, and beta-era operational shortcuts.

Tradeoff: delays parser/table/performance work, but gives the rest of the
program a usable control surface.

### Approach B: Interop and table first

Advance Bases/Dataview compatibility, `viewTable.svelte`, export boundaries,
and expression support.

Tradeoff: valuable long term, but it leaves broken context menus and rename
surfaces in the way of manual testing.

### Approach C: Architecture and performance first

Optimize `panelExplorer.getTree`, redesign context-menu internals, decide DnD
and TanStack boundaries, and schedule semantic/vector indexing research.

Tradeoff: useful after behavior is stable, but too broad for the immediate
user-facing regressions.

## Decision

Use Approach A first.

Within A, use this order:

1. **A0: CMenu queue repair.** Repair tag/file context-menu paths that do not
   reliably create queue operations.
2. **A1: Prop/value rename handoff.** Replace prop/value rename modal entry
   with FnR/navbar handoff.
3. **A2: Tag/file rename handoff.** Extend the handoff model to tag and file
   renames after A0 gives a testable menu path.
4. **A3: Badges and navbar visibility.** Restore visible queue/filter counts
   and add quick-action badges.

## Rationale

Prop/value rename was the recommended first functional slice, but the user
clarified that tag/file context menus currently block testing the next slice.
Therefore A0 becomes a prerequisite. It is small, testable, and removes a
known workflow blocker before the larger FnR handoff work.

