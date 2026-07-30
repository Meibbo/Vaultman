---
title: BT5-051 — Hide scrollbar with one index footprint
type: issue
status: deferred
lifecycle: active
priority: P0
execution: HITL
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-22T13:05:00
updated: 2026-07-23T02:10:00
created_by: codex-gpt5-root
updated_by: claude-opus-4-8-audit
resolved_by: 3fb23d17
tags: [agent/issue, triage/in-progress, initiative/polish, release/1.2.0, frame, scrollbar, index]
---

# BT5-051 — Hide scrollbar with one index footprint

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].

## What to build

When Hide explorer scrollbar is enabled, hide only the visual bar while keeping the content gutter that prevents explorer nodes from running underneath the Floating Index. Do not activate Reserve index lane or move the Index between content and scrollbar. Reserve lane remains an independent option and is hidden or inapplicable while Hide scrollbar supplies the required single footprint.

## Acceptance criteria

- [x] Hide scrollbar removes the scrollbar bar without changing the Index overlay position.
- [x] Explorer content retains exactly one gutter and never sits underneath the Index.
- [x] Reserve index lane is not simultaneously exposed/applied in this state.
- [x] Plain/non-plain Index uses only its real small footprint difference.
- [x] Left/right/top/bottom, dock on/off and scrollbar overlay/classic variants are covered.
- [x] No horizontal or vertical phantom scrollbar appears.
- [ ] DOM geometry smoke records content edge, index edge and gutter width.

## Blocked by

None — can start immediately.

## Implementation checkpoint — 2026-07-22

- Product commit: `3fb23d17 fix(layout): preserve one hidden-scrollbar gutter`.
- Root cause: `tocReservedLane || tocHideExplorerScrollbar` drove one shared lane class, so Hide both padded content and applied Reserve's 14 px rail displacement.
- New `resolveFloatingTocLaneLayout` independently projects scrollbar visibility, content gutter, explicit-lane state and rail offset. Hide takes precedence over stale saved Reserve state but the Settings option remains independently available when Hide is off.
- Footprints derive from actual rail width + edge: desktop 20 px plain / 22 px pill; mobile 28 px plain / 30 px pill. The 2 px style difference stays intentionally small.
- One 2/4 px edge variable now keeps right, left, top and bottom positioning coherent; it also prevents the former mobile rule from overriding `pos-left` or explicit right offset.
- Verification: matrix 7/7, related 49/49, Stylelint, Svelte format and diff check green;
  official Svelte autofixer reports zero issues. `svelte-check` contains only the five known toolbar-overflow diagnostics from the preserved foreign worktree edit.
- Remaining gate: record live DOM geometry for hidden/classic and overlay scrollbars at both sides, plain/pill and min/wide frame. Issue stays `in-progress` until that HITL evidence.

## Outcome (2026-07-23) — deferred

The single-footprint behavior shipped in 3fb23d17. During HITL the dev found the Top/Bottom index positions work but not to the wanted standard, so those two options were withheld from the picker (efdf4796) without touching the union or persisted value. The slice is deferred out of v1.2.0; restoring Top/Bottom is one branch to delete.
