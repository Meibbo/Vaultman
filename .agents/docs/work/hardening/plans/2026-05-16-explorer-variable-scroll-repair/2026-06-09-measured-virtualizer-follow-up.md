---
title: 2026-06-09 measured virtualizer follow-up
type: implementation-follow-up
status: active
parent: "[[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/index|Explorer variable scroll repair]]"
created: 2026-06-09T01:05:00-05:00
updated: 2026-06-09T01:05:00-05:00
tags:
  - agent/plan
  - explorer/performance
  - explorer/scroll
  - explorer/virtualization
  - explorer/masonry
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# 2026-06-09 Measured Virtualizer Follow-Up

## Trigger

During the `1.1.0-beta.2` Data/Files parity work, Vaultman's current explorer tree/list virtualizer regressed into scrollbar-drag micro-jumps. The immediate suspect was a recent CSS containment change: `container-type: inline-size` was placed on `.vaultman-page`, which contains the scrollable virtualized explorer panes. A fixed-size virtualizer should not have layout containment applied on a shared page ancestor unless that ancestor is deliberately part of the scroll geometry contract.

The same pass also made clear that future streams cannot rely on a pure fixed row-height model. The `goal` stream is expected to allow nodes whose heights vary individually, and the proto design already includes masonry view. Those features need a measured virtualization contract, not more fixed-height exceptions.

## Immediate Hotfix Scope

Keep the current release-facing Data explorers on fixed-size virtualization for now, but restore strict geometry invariants:

- `.vaultman-page` must not be a CSS query container because it owns virtualized panes and scrollable content.
- The filters navbar may be the query container because it is header-only.
- The visual `max-width: 520px` belongs on `.vaultman-filters-header-wrap`, not on the query container, so the query still measures the frame width.
- Mobile tree row CSS height must match the fixed virtual row model exactly.
  If the model uses `37`, CSS must use `height: 37px`, not fractional native measurements such as `36.7969px`.

## Structural Follow-Up

Build a shared measured virtualizer as a new architecture slice rather than mutating the fixed virtualizer in place.

Required contract:

- Stable identity by `node.id`, not by visible index.
- Estimated size first, then observed size from mounted rows.
- `ResizeObserver` for visible row/card elements.
- Height cache keyed by `node.id + viewMode + visibleCells + density + relevant decoration state`.
- Prefix-sum offset structure, reusing the earlier `serviceExplorerScrollGeometry` Fenwick/prefix work where possible.
- Scroll-anchor policy that suppresses or defers corrections during active scrollbar drag and applies measurement deltas on scroll idle.
- Runtime smoke must compare spacer height, browser `scrollHeight`, visible row measurements, and scrollTop stability at top/middle/bottom.

## Non-Goals For The Hotfix

- Do not introduce masonry in the release hotfix.
- Do not convert all explorers to measured rows in the same patch.
- Do not allow Obsidian core/theme classes to change virtual row height without either measuring those rows or explicitly overriding height inside the virtualizer boundary.

## Candidate Migration Order

1. Add a pure measured-geometry service and unit tests.
2. Add a test harness that simulates changing heights above the viewport and verifies scroll anchoring behavior.
3. Migrate Files Grid or a non-release proto surface first.
4. Migrate Tree/List only after the measured cache proves stable under scrollbar drag, expand/collapse, search filtering, and tab switching.
5. Treat masonry as a separate lane-based virtualizer built on the same measurement cache, not as a minor variant of list/tree.

## Acceptance Criteria For The Future Cut

- Dragging the scrollbar does not jump toward the start or end while measured heights are being discovered.
- Expanding/collapsing nodes above the viewport keeps the user anchored to the same visible item unless the action intentionally scrolls to a target.
- Runtime smoke covers large `plugin-dev` lists and at least one stress-vault dataset.
- The perf HUD or smoke runner records event-loop delay and visible-row measurement corrections.
- Source guards prevent reintroducing layout containment on virtualized page ancestors unless a test explicitly proves the geometry remains stable.

