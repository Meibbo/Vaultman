---
title: "Cursor affordance policy for broad explorer surfaces"
type: regression-report
status: triaged
initiative: hardening
priority: normal
task_size: small
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-07T05:59:24
updated: 2026-05-07T06:39:54
created_by: codex
updated_by: codex
tags:
  - agent/regression
  - hardening/ui
  - hardening/performance
---

# Cursor Affordance Policy For Broad Explorer Surfaces

## Problem

The user reported that the mouse changing to a hand cursor while hovering over
large clickable frame elements feels like added lag. Performance and perceived
responsiveness are project pillars, so broad hover affordances must be treated
as performance-sensitive interaction design rather than decorative polish.

`cursor: pointer` itself is not expected to be the main CPU bottleneck. The
practical issue is that broad hand-cursor zones on virtualized rows, tiles,
cards, and frame panels create noisy hover feedback and usually travel with
background, transition, shadow, or reveal-on-hover styles that can make
Vaultman feel slower on dense vaults.

## Decision

Keep the default cursor on broad clickable working surfaces:

- explorer tree rows and row surfaces;
- node grid tiles and cards;
- list/table rows that select, focus, or activate a node;
- frame-level panels or large surfaces whose click target is the surface itself.

Reserve `cursor: pointer` for explicit compact controls:

- icon buttons and text buttons;
- links;
- toggles, segmented controls, and checkbox-like controls;
- chevrons and disclosure controls;
- action badges;
- resize and drag handles;
- menu items whose whole row is a command rather than a selectable data row.

Hover styling may remain on broad surfaces when it is subtle, cheap, and needed
for orientation, but it must not imply that every row behaves like a button.

## Current Evidence

Read-only search on 2026-05-07 found many `cursor: pointer` declarations across
the frame, explorer, data, popup, nav, and primitive SCSS layers. The highest
risk areas for this policy are:

- `src/styles/explorer/_virtual-list.scss`
- `src/styles/explorer/_tree.scss`
- `src/styles/explorer/_cards.scss`
- `src/styles/explorer/_explorer.scss`
- `src/styles/data/_grid.scss`
- `src/styles/data/_file-list.scss`
- `src/styles/data/_filters.scss`
- `src/styles/data/_filters-page.scss`

The implementation should audit broad surfaces first and leave explicit compact
controls alone.

## Implementation Boundary

Start with SCSS-only changes:

- remove hand cursors from broad row, tile, card, and panel surfaces;
- keep hover states subtle and cheap;
- preserve existing focus, selection, active-filter, and pending-operation
  visuals.

The first pass is intentionally narrow. It covers only broad working surfaces:

- tree rows and row surfaces;
- node grid tiles and cards;
- file/list rows;
- filter/list rows.

It does not cover navbars, popup controls, primitives, badges, chevrons,
toggles, links, drag handles, resize handles, or explicit icon/text buttons.
Those remain a later, more precise audit because they are compact controls
where `cursor: pointer` is usually correct.

Touch Svelte only after a code audit shows that hover/reveal behavior mutates
reactive state, causes unnecessary renders, or couples hover to action logic.
Do not use this slice as a pretext to refactor selection, grid hierarchy, or
provider actions.

## Acceptance

- [ ] Broad explorer rows use the normal cursor while remaining clickable,
      selectable, focusable, and keyboard navigable.
- [ ] Broad grid/card/list surfaces use the normal cursor unless the specific
      target is an explicit compact command.
- [ ] Icon buttons, links, toggles, chevrons, action badges, drag handles, and
      resize handles retain their appropriate control cursors.
- [ ] Hover/focus/selected/active-filter visual states remain distinct.
- [ ] Scoped style verification passes and regenerated CSS is checked if SCSS is
      changed.

## Tasks

- [ ] Audit `cursor: pointer` declarations in explorer and data SCSS.
- [ ] Replace broad-surface hand cursors with default cursor semantics.
- [ ] Keep pointer or specialized cursors on compact explicit controls.
- [ ] Limit the first pass to rows, tiles, cards, file rows, and filter/list
      rows.
- [ ] Inspect Svelte hover/reveal handlers only if SCSS changes do not address
      the interaction feel issue or evidence shows reactive hover cost.
- [ ] Add or update focused visual regression/component coverage if the touched
      selectors have existing tests.
- [ ] Record verification commands and any exceptions to the policy.
