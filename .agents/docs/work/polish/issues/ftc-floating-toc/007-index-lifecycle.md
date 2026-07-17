---
title: FTC-007 — Index lifecycle, scoped collapse, and soft scroll
type: issue
status: completed
parent: "[[docs/work/polish/issues/ftc-floating-toc/index|FTC index]]"
spec: "[[docs/work/polish/specs/2026-07-15-v1-2-beta1-floating-toc-fixes/01-ftc-007-index-lifecycle|FTC-007 spec]]"
created: 2026-07-15T00:00:00
created_by: codex-gpt-5
tags: [agent/issue, initiative/polish, floating-toc, release/1.2.0-beta.1]
---

# FTC-007 — Index lifecycle, scoped collapse, and soft scroll

## Goal

Make the Floating TOC lifecycle follow the explorer hierarchy and route a real optional
smooth scroll through the virtualized reveal seam.

## Scope

- Close/off action is literal first.
- Scoped action becomes Back one level.
- Typed `collapse-node` and `collapse-all` events reconcile `tocRootId`.
- Pure ancestry resolver for current/ancestor/unrelated collapse cases.
- Replace user-facing `tocHardJump` with off-default `tocSoftScroll`.
- Forward `ScrollBehavior` through router, panel, Tree, FilesGrid, and Grid.
- Suppress redundant same-group scrub navigation.

## DoD — nonvisual

- [x] Scope resolver RED/GREEN tests cover current root, ancestor, sibling, top level,
      and no scope.
- [x] Three panels emit typed collapse events without changing expansion behavior.
- [x] Close persists off and Back traverses one parent only.
- [x] Router and virtualized view tests prove `auto`/`smooth` forwarding.
- [x] Focused tests + Svelte autofixer + check/lint/build pass.
- [x] Code-only commit; no `.agents`, push, tag, merge, or visual automation.

## Implementation

Landed code-only in `409b15ed fix(explorer): synchronize floating index lifecycle`.
Integrated branch gates were re-run after FTC-009: full unit 70 files / 345 tests,
TypeScript + Svelte 0/0, production bundle, ESLint, and Stylelint all passed.

## Non-goals

Props/Tags table-grid reveal support · DOM-query scrolling · any 1.1.6 patch.
