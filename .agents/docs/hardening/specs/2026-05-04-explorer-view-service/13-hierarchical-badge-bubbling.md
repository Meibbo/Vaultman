---
title: Hierarchical badge bubbling
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|explorer-view-service]]"
created: 2026-05-04T18:05:00
updated: 2026-05-04T18:15:57
tags:
  - agent/spec
  - explorer/views
---

# Hierarchical Badge Bubbling

## Principle

Badge bubbling is a general hierarchy need based on semantic badge data.

Because all view modes will receive groups and therefore become hierarchical
render models, bubbling must not be implemented as a tree-only behavior. Tree,
table, grid, cards, and list projections may present the bubbled state
differently, but the inherited badge computation should be shared.

## Hierarchical Views

Groups make every view mode hierarchical even when the projection looks flat.
A list, table, grid, or cards view may render groups as sections, bands,
grouped rows, or card lanes, but the model still has parent/child
relationships.

Any behavior that depends on hidden descendants, such as bubbled badges,
counts, inherited warnings, or group summaries, should be defined once against
the hierarchy and then projected by each view.

Views may choose different visual affordances for hierarchy depth, but they
must not discard child layer data just because the current projection is not a
tree.

## Correct Location

- badge source data: `serviceViews`;
- inherited/bubbled computation: `serviceViews` hierarchy/group model builder
  or a shared hierarchy projection helper;
- visual display: each view projection.

## Rules

- when a parent/group hides descendants, badges from hidden descendants should
  bubble to the visible ancestor/group;
- bubbled badges should be marked `inherited: true`;
- duplicates should be collapsed by stable badge identity;
- user should still be able to inspect or act on inherited badges where safe.

## Child Badge Indicator Projection

The parent row/group should not necessarily render every inherited child badge
as a normal badge. The compact default should be a `childBadgeIndicator`: a
small circular color indicator that says "hidden descendants have badges".

Visual target:

- the indicator can sit at the right edge of a row, near count metadata in tree
  rows or equivalent summary metadata in other views;
- on hover, the circle extends into a pill toward available empty space;
- in the tree example, if the indicator is on the right next to the count, the
  pill expands left and can overlay label space instead of resizing the row;
- the expanded pill shows all bubbled child badges, preserving their full
  semantic data and action references;
- expansion should be overlay-style and should not cause layout shift.

## Own Badges Versus Child Badges

Own-node badges must stay separate from inherited child badges. If a parent has
its own operation badges and also has hidden child badges, render both concepts:

- keep the child badge indicator at its indicator position;
- render the parent's own badges as normal row badges;
- example: in Props, if a value child is deleted and the property parent has a
  rename operation, the property row shows the child badge indicator for the
  value delete and, to the indicator's left, the parent's own rename badge.

This separation matters because inherited badges explain hidden descendants,
while own badges describe direct state on the visible parent node.
