---
title: BT5-053 — Inclusive/exclusive/remove filter polarity
type: issue
status: in-progress
lifecycle: active
priority: P0
execution: HITL
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-22T13:05:00
updated: 2026-07-22T15:38:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/issue, triage/in-progress, initiative/polish, release/1.2.0, filters, interaction]
---

# BT5-053 — Inclusive/exclusive/remove filter polarity

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].
Corrects the incomplete exclusion work recorded around BT5-038.

## What to build

For Property, Value and Tag nodes in Filter mode: one click adds an inclusive
filter; a real fast double-click resolves to one exclusive filter; the next click
removes either polarity. Inclusive uses active color. Exclusive uses primary text
color for the cell highlight and its own bubble-dot color. Behavior and visuals
must agree in Tree, Table and Cards.

## Acceptance criteria

- [x] One click produces exactly one inclusive rule.
- [x] A double-click produces exactly one exclusive rule, not inclusive then exclusive writes.
- [x] A slow second click follows normal single-click semantics.
- [x] The next click removes `missing_property`, `not_specific_value` and `not_has_tag` too.
- [x] Property/Value/Tag nodes show persistent inclusive/exclusive cell highlights.
- [x] Bubble dots distinguish inclusive and exclusive descendant activity.
- [x] Tree/Table/Cards and mouse/keyboard/touch-accessible paths are covered.
- [x] Source uses current renderer classes and no obsolete `.vm-tree-row-surface` selector.

## Blocked by

None — can start immediately.

## Implementation evidence

- Product commit `cde64206`: `fix(filters): make polarity interaction reversible`.
- `DeferredFilterClickCoordinator` delays only an inactive single click for 250 ms. A fast
  pair cancels that timer and emits one exclusive effect; therefore no inclusive rule or
  intermediate `changed` event is written. Active removal is immediate and a short expiring
  tombstone absorbs the browser's second click from the same gesture.
- Coordinator keys are semantic (`property`, `property + value`, or tag), so Tree/Table/Cards
  repaints and view changes cannot split a gesture. Teardown cancels pending work; expired
  tombstones are purged during normal interaction.
- `FilterService.setPropertyNodePolarity` and `setTagNodePolarity` remove every matching
  positive/negative representation recursively and add at most one replacement before one
  `applyFilters`. The legacy remove helpers now remove either polarity too.
- Props/Tags row clicks and context-menu Include/Exclude actions converge on those atomic
  setters. The context menu cancels a pending single-click intent before applying its explicit
  choice.
- Tree rows now expose Enter/Space activation; Cards already did, and Table delegates through
  its row activation contract. The click coordinator is event-detail-independent, covering
  synthesized touch clicks as well as mouse and keyboard activation.
- Exclusive styling now targets the emitted `.vaultman-tree-row` class, not the dead
  `.vm-tree-row-surface`. Existing Table/Cards classes and the accent-vs-primary bubble colors
  remain shared.

## Verification

- Focused: 4 files, 41/41 tests green.
- Full unit: 146/147 files and 957/958 tests green. The only failure is the pre-existing
  foreign toolbar baseline: `toolbarUsesHorizontalScroll is not a function`.
- Changed-path ESLint, Stylelint, Prettier, `git diff --check` green.
- `pnpm run check` contains exactly the three preserved toolbar-overflow diagnostics from the
  unstaged foreign `src/logic/logicResponsiveLayout.ts` change; BT5-053 adds none.

## Remaining HITL

- Record one live Obsidian pass for Props/Values/Tags in Tree/Table/Cards: single click after
  the delay, fast double-click, slow pair, removal of either polarity, keyboard Enter/Space,
  and touch/pointer synthesis. Confirm the persistent primary-colored exclusive highlight and
  distinct collapsed-parent dot under the active theme.
