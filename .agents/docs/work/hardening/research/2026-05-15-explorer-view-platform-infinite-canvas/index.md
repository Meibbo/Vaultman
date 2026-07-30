---
title: Explorer view platform and infinite canvas research
type: research
status: active
parent: "[[docs/work/hardening/index|Hardening]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T18:00:10.0199112-05:00
tags:
  - agent/research
  - explorer/views
  - explorer/performance
  - explorer/virtualization
  - infinite-canvas
created_by: codex
updated_by: codex
---

# Explorer View Platform And Infinite Canvas Research

## Summary

Post-0-H research shows the next Explorer hardening pass should not be a local `props` patch or a Map rewrite. The immediate issue is a platform gap across providers and linear/card-style views:

- Providers need a shared projection contract.
- Views need declared feature parity expectations.
- Scroll needs a shared intent/geometry coordinator.
- Decoration needs batching/caching instead of per-node hot paths.
- Map needs a separate future iteration; it should not be selectable in the next release until its own stability/performance work is complete.

The user confirmed `ViewNodeList` is now roughly competitive with Notebook Navigator in the 10K file list test. `viewTree` remains the worst performing surface. The current legacy `ViewMarkmap.svelte` implementation remains a critical performance risk, but it is now parked as a future Map iteration rather than part of the next platform pass.

Follow-up design work captured the roles of Pretext, TanStack Virtual, and Svelte render tags/snippets in the platform. It also adds a new platform invariant: every Explorer node must be able to expose at least one representative image/media descriptor, with exact native Obsidian Bases parity deferred to a named follow-up plan. Showing/hiding that image belongs in the view menu `btnNodeElementsVisibility` controls for granular node elements when the active view is not using the native Obsidian preset. The image/media element is disabled by default in every view because nodes already have icons.

## Shards

- [[01-context-findings-research|Context, local findings, Notebook Navigator, and online research]]
- [[02-architecture-execution-handoff|Architecture direction, perf loops, execution order, and acceptance criteria]]
- [[03-rendering-media-contracts|Rendering primitive roles and node media slot contract]]
- [[04-node-map-deferred-iteration|Node map deferred iteration]]

## Recommended Next Action

This research has been converted into the active spec:
[[docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass spec]].

Start the future implementation plan with feedback loops before product rewrites:

- scenario-specific `perfProbe` metrics;
- view feature parity tests;
- view menu `btnNodeElementsVisibility` tests for node element visibility outside the native Obsidian preset;
- media descriptor, geometry, and visible-blob lifecycle tests;
- 10K files tree/list scroll tests.

Then implement shared projection/feature contracts, scroll/geometry coordination, decoration batching, render-tag/snippet node anatomy, node media slots, the view menu/preset contract, and real `viewTree` migration with tree visual contract recovery. Leave Map/ViewNodeMap for a separate future iteration and keep it out of selectable view options in the next release.
