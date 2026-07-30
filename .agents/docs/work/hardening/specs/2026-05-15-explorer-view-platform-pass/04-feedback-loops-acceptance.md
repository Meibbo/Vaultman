---
title: Feedback loops and acceptance criteria
type: spec-shard
status: active
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass spec]]"
created: 2026-05-15T18:00:10.0199112-05:00
updated: 2026-05-15T18:00:10.0199112-05:00
tags:
  - agent/spec
  - explorer/testing
  - explorer/performance
created_by: codex
updated_by: codex
---

# Feedback Loops And Acceptance Criteria

## Feedback Loops First

The implementation plan must start with characterization tests and probes. Code migration should not begin until the harness can expose regressions.

Required feedback loops:

- synthetic Explorer dataset generator for 10K, 50K, and 100K nodes;
- provider projection tests;
- view feature contract tests;
- view menu `btnNodeElementsVisibility` element visibility tests;
- native Obsidian preset restoration tests;
- tree visual contract snapshots or equivalent component assertions;
- tree box selection tests;
- scroll intent tests;
- geometry coordinator tests;
- decoration batching tests;
- media descriptor/lifecycle tests with render disabled by default;
- Obsidian CLI perfProbe scenarios for live `plugin-dev` validation.

## Synthetic Dataset Harness

The dataset harness should generate realistic Explorer shapes:

- flat file lists;
- deep folder hierarchies;
- mixed folder/file trees;
- provider rows for files/content/outline/props/tags/plugins/snippets where feasible;
- badges and action states;
- filtered states;
- selected states;
- media descriptors present but hidden by default;
- property/tag density variance;
- long labels and extension edge cases.

The harness should be deterministic so perf results can be compared across commits and against Notebook Navigator where applicable.

## Required Perf Scenarios

Initial scenarios:

- `files-list-10k-scroll-jump`;
- `files-tree-10k-scroll-jump`;
- `files-tree-50k-scroll-jump`;
- `projection-50k-build-or-refresh`;
- `projection-100k-proof`;
- `view-menu-element-toggle`;
- `view-mode-native-preset-restore`;
- `tree-box-selection`;
- `tree-filtered-highlight`;
- `node-media-descriptor-build`;
- `node-media-hidden-cost`;
- `node-media-visible-subscribe`.

Metrics:

- first visual feedback;
- ready visible;
- long frame count;
- max long frame duration;
- stale virtual range duration;
- cancelled intent count;
- visible node count;
- mounted node count;
- projection build time;
- geometry invalidation time;
- decoration layer build time;
- heap delta where available.

## Acceptance Criteria

The pass is acceptable only if:

- 10K is a release gate for tree/list and core platform paths;
- 50K is a must-pass gate for core, tree, and list;
- 100K proof benchmark runs without architectural collapse;
- `table`, `grid`, and `cards` have platform contracts and 10K gates, plus 50K characterizing benchmarks;
- `viewTree` is migrated to shared projection/scroll/geometry contracts;
- `viewTree` no longer acts as a god object for projection, scroll, selection, visual state, and render wiring;
- tree box selection works;
- selected rows are grey;
- filtered rows use accent left border and translucent accent background;
- selected + filtered rows use explicit, legible composition;
- file extensions align right;
- `.md` extension is hidden;
- media descriptors can exist for all nodes;
- image/media render defaults off in every view;
- hidden media has no material hot-path cost;
- Map/ViewNodeMap is not selectable;
- no arbitrary visual redesign lands under the refactor label.

## Review Gate

After the implementation plan is written, each phase should have an explicit review checkpoint. The tree migration phase requires a visual contract review before performance-only work can be considered complete.
