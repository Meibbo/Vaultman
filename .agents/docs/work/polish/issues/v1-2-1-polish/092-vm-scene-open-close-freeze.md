---
title: BT5-092 — Opening/closing a vm-scene freezes the app for an instant
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: HITL
parent: "[[docs/work/polish/issues/v1-2-1-polish/index|v1.2.1 polish backlog]]"
dateCreated: 2026-07-29T18:52:04
dateUpdated: 2026-07-29T18:52:04
created_by: claude-opus-5
updated_by: claude-opus-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.1, performance, scene]
---

# BT5-092 — Opening/closing a vm-scene freezes the app for an instant

## Symptom

Dev-reported on stable 1.2.0: opening and closing a vm-scene freezes Obsidian
for a moment. Not surfaced by the Obsidian scorecard scan — this is a runtime
behaviour report, so no line references exist yet.

The freeze is a main-thread stall, which means the cost is synchronous work
inside the open/close path, not a slow async load (a slow load would show an
empty frame, not a locked UI).

## Unknowns to resolve before planning

No diagnosis exists yet. This issue is HITL because the first step is
measurement, and the fix shape depends entirely on what the measurement says.

- [ ] Which phase stalls — open, close, or both? Symmetric cost points at
      mount/unmount work; asymmetric points at teardown (listener removal,
      queue flush) or at first-paint decoration.
- [ ] Is the cost proportional to vault size or to scene content? Determines
      whether this is a virtualization gap or a fixed setup cost.
- [ ] Does it reproduce with a single scene vs several? Distinguishes a
      per-scene cost from an all-scenes rebuild.
- [ ] Capture a profile with `src/dev/perfProbe.ts` and the existing
      `smoke:scroll` harness for a baseline.

## Acceptance criteria

- [ ] A profile identifies the dominant synchronous cost in the open/close path.
- [ ] Opening and closing a scene does not stall the main thread perceptibly
      on a large vault.
- [ ] A regression guard exists (probe assertion or smoke threshold) so the
      stall cannot return unnoticed.

## Notes

Related but distinct from [[../bt5-final-stable-audit/088-filter-apply-performance|BT5-088]]:
that one is filter-apply cost inside an open explorer; this is the
scene lifecycle itself. If the profile shows the same full-rebuild-plus-
decoration cost, the BT5-088 P3 differential-render split may subsume it —
check before planning separate work.
