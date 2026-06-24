---
title: "Superseded or resolved items from beta 15-18 backlog"
type: backlog-audit-shard
status: active
initiative: hardening
parent: "[[docs/work/hardening/backlog/2026-05-07-v1-scope-audit/index|v1-scope-audit]]"
created: 2026-05-07T06:06:10
updated: 2026-05-07T06:14:59
created_by: codex
updated_by: codex
tags:
  - agent/backlog
  - hardening/v1
---

# Superseded Or Resolved

## Performance And Rendering

- Panel/list performance above 1000 nodes was marked done in the source backlog
  and later hardening work added TanStack virtualizer use for tree/grid.
- Tree rerender/scroll-to-start during processing was marked done in the source
  backlog and current handoff records selection/TanStack work that fixed visible
  hangs.
- `serviceViews` / `serviceSort` reset on layout tab switch was marked done in
  the source backlog.

## Selection, Grid, And Expansion

- Generic node grid behavior is implemented through `ViewNodeGrid.svelte`.
- Grid mode now uses provider tree nodes instead of the old file-only `TFile[]`
  path.
- Grid tile clicks, label primary actions, context menu forwarding, keyboard
  forwarding, and rectangle selection have component coverage.
- Optional inline grid expansion is implemented: `gridHierarchyMode: 'inline'`,
  parent chevrons, hidden collapsed children, nested child grids, and rectangle
  selection over expanded children.
- Generic expand/collapse-all for sort/view controls is implemented and tested.

## Queue/Handoff Improvements

- Tags now have queue/handoff paths; the original "tags operate immediately"
  concern appears superseded unless a specific path still bypasses queue.
- Prop rename now emits `NATIVE_RENAME_PROP` and queue expansion covers matching
  files.
- File rename/delete handoff paths are covered by current provider work.
- Queue badges and active-filter badges were restored to frame FAB definitions
  with semantic `badgeKind` values.

## Empty States

- Common empty/search/import/loading landing states exist through
  `ViewEmptyLanding` and `panelExplorer` empty-state handling. This appears to
  cover the missing "No files found" style result, though copy may still need
  per-provider polish.

## Source Items Already Marked Done

- The original FAB accent-heavy design note was marked done.
- The source note marked the popup z-index regression done on 2026-04-19.
- The Notebook Navigator rendering/cache study was marked done.
