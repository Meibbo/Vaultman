---
title: Badges and navbar visibility
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/index|user-facing-recovery-wave-a]]"
created: 2026-05-06T02:46:22
updated: 2026-05-06T02:46:22
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
---

# Badges And Navbar Visibility

## Current State

Badge bubbling and queue badge removal were restored in previous hardening
work. Collapsed descendants can bubble operation/filter badges to a visible
parent, and queue badges can remove the matching queued logical operation.

Navbar visibility remains regressed. The beta-era filter and queue buttons
showed counts directly on the control surface. Current UI makes queue/filter
state harder to see until the user opens an island or popup.

## Required Behavior

A3 should restore immediate feedback without overloading the navbar:

- active filters count visible from the primary filters control;
- queue count visible from the queue/tool control;
- badge counts update when `operationsIndex` or `activeFiltersIndex` refreshes;
- badges remain compact and do not make the search pill jump;
- the same semantic count source is used by navbar, island, and explorer rows.

## Quick-Action Badges

The next visual/action layer should add hover quick-action badges for staging
operations from a node or selected node group.

Rules:

- Quick-action badges are opt-in commands, not hidden destructive actions.
- Queue badges that already represent staged operations continue to remove the
  matching logical operation on click.
- A quick-action badge must stop row activation when clicked.
- Quick-action badge rendering should use semantic view layers where practical.

## Related Regressions

- `navbar.md`: queue/filter counts are only visible inside islands.
- `visuals-highlight-bubbling.md`: bubbling is conceptually restored, but the
  remaining work is consistent presentation and action affordances.
- `operations-suite-live-handoff.md`: quick-action badges were explicitly
  deferred after queue badge removal was implemented.

## Non-Goals

- Do not rebuild the full vertical 36px navbar strip in A3 unless the slice plan
  explicitly scopes it.
- Do not build table/grid/card view debt in this wave.

