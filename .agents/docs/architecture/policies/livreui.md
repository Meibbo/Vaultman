---
title: LivreUI policy — a runtime change must be visible without a second event
type: policy
status: active
lifecycle: active
parent: "[[docs/architecture/policies/code|code policy]]"
dateCreated: 2026-07-30T07:30:00
dateUpdated: 2026-07-30T07:30:00
created_by: claude-opus-5-triage
updated_by: claude-opus-5-triage
tags: [agent/policy, initiative/polish, livreui, render]
---

# LivreUI policy

**LivreUI** = *live redesign user interface*. The subsystem is named for the
property this policy protects: the user redesigns the view **while it is
running**, and what they changed is visible immediately.

## The rule

> A runtime change to the view must repaint the surfaces that depend on it,
> without waiting for an unrelated event.

A change that lands in the model but not on screen is a **bug**, not a cosmetic
delay — even when the model is correct and the next unrelated event would fix
it. "It updates when you click something else" is the failure, not the excuse.

## Why this keeps recurring

Three instances shipped in 1.2.0 and a fourth was caught in review, all by
different agents, all with correct model state:

| Instance | Model was right | Screen was wrong |
| --- | --- | --- |
| BT5-031 | Icon changed | Files never repainted (`onLoaded` fires once) |
| U121-027 setting | `timestampRelative` saved | No subscriber on `onSettingsChange` — it broadcast to nobody |
| U121-027 clock | — | Relative copy has no vault event to hang a repaint on; it goes stale on the wall clock |
| U121-027 reorder | Node moved to first, correctly | BT5-089's shortcut calls `treeView.render()` directly, bypassing `_render()` and its decoration pass, so the cell kept its pre-open text |

The pattern is the same every time: **a fast path that updates position or
persistence without routing through a repaint.** Optimisations are where this
bug is born, because the whole point of the optimisation is to skip work — and
the decoration pass is easy to skip by accident.

Codex hit it independently on its own issue. Assume the next agent will too.

## What LivreUI covers

Per the dev's model, two composers write the view contract and the host renders
it:

- **VIECO** (`viewComposer`) — zoom, pagination, engine, mode, orientation,
  rotate, size
- **NAVCO** (`navComposer`) — layers, direction, scope, pan, forces, **sort**,
  groups
- Both write **view-state / view-config**; Host / viewPort / mount displays it.

So `sort` is LivreUI. So are grouping, layering and pagination. If a change
enters through either composer, this policy applies to it.

## How to comply

1. **One coalescer per surface, not one per source.** `explorerFiles` exposes
   `_scheduleLiveRender` — flag, `queueMicrotask`, one `_render()`. Every live
   source pushes through it, so a burst from several at once still costs a
   single repaint. Do not add a parallel scheduler.
2. **A setting with no subscriber is a bug.** `plugin.onSettingsChange` existed
   from 1.2.0 with zero consumers. Adding a setting means wiring the surface
   that renders it.
3. **Clock-driven text needs a heartbeat, behind a guard.** Relative timestamps
   tick once a minute — the coarsest cadence that never shows stale copy — and
   only when the last render actually painted something relative
   (`_hasLiveTimestamps`). An idle or absolute-mode vault pays one boolean per
   minute, not a render.
4. **Raise "is this live?" flags in the shared formatter, not in one view's
   decoration pass.** Tree, grid and table reach the cells by different paths;
   only the formatter sees all of them. The first version of the U121-027 fix
   set the flag in the tree pass and would have failed silently in grid and
   table.
5. **If you add a fast path that skips `_render()`, refresh what you skipped.**
   Refresh the moved node, not the whole tree — that keeps the optimisation's
   point. And refresh on the *no-change* branch too: re-opening a file already
   at the edge does not reorder, but it still bumps Last opened.

## Guards

`test/unit/livreUiCellRefresh.test.ts` holds source-level guards for each of the
five points above, in the style of BT5-031's icon guard. They are structural
rather than behavioural on purpose: the failure mode is a code path that skips a
repaint, which a pure-function test cannot see.

When adding a live source, add its guard there.

## Read when

- Adding or changing a setting that any cell, badge or counter renders.
- Adding a fast path that repositions, re-sorts or re-groups without a full
  render.
- Adding a surface that displays clock-relative or externally-mutated values.

## Repair triggers

- A setting exists whose surface has no repaint path.
- A render shortcut updates position without refreshing the moved node.
- A new scheduler appears alongside `_scheduleLiveRender` instead of using it.
- A "live" flag is raised in one view's decoration pass rather than the shared
  formatter.
