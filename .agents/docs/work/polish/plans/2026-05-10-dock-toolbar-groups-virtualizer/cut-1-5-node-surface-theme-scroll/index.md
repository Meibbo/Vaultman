---
title: Dock Toolbar Cut 1.5 Node Surface Theme And Scroll Plan
type: agent-plan
status: in_progress
parent: "[[docs/work/polish/plans/2026-05-10-dock-toolbar-groups-virtualizer/index|Dock Toolbar Groups Virtualizer]]"
created: 2026-05-10T19:53:58
updated: 2026-05-10T20:26:00
tags:
  - agent/plan
  - polish
  - vaultman/product
created_by: codex
updated_by: codex
---

# Dock Toolbar Cut 1.5 Node Surface Theme And Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use TDD for every behavioral change. Do not commit unless the user explicitly asks.

**Goal:** Insert a small, verified cut before Cut 2 that normalizes node decoration, generic queue-badge actions, Props search labels, ViewTree scrolling, theme/node-surface settings, scrollable compact controls, and grouped Queue child-row presentation.

**Architecture:** Keep semantic decoration decisions in services (`serviceViews`, new `serviceTheme`, new `serviceScroll`) and keep Svelte views as renderers. Split behavior into independent facets so separate agents can implement without sharing write scope except for the final integration pass.

**Tech Stack:** Svelte 5 runes, SCSS modules, Vitest unit/component tests, existing Vaultman service/index/provider contracts.

---

## Why This Is A Separate Cut

This request touches seven surfaces that would make Cut 2 too broad if handled inline. The work should be implemented as Cut 1.5, then Cut 2 can resume settings and row-layout completion from a cleaner baseline.

## Plan Shards

- [[01-scope-and-boundaries|Scope, constraints, and file ownership]]
- [[02-tests-first|Tests-first checklist]]
- [[03-implementation-facets|Implementation facets]]
- [[04-verification-and-handoff|Verification and handoff]]

## Facet Order

1. Filter decoration and hover-primary visibility.
2. Generic queue badges and Props search category labels.
3. `serviceTheme`, node-surface settings, and ViewCards background controls.
4. `serviceScroll` for ViewTree scroll stabilization and PretextJS audit answer.
5. Scrollable compact controls.
6. Queue explorer grouped parent/child presentation.
7. Final Svelte autofix, focused tests, and `pnpm run check`.

## Non-Goals

- Do not redo the `@dnd-kit/svelte` migration.
- Do not rewrite all explorer views.
- Do not force PretextJS/service text measurement onto fixed-height views just to say it is global.
- Do not remove active-filter decoration from the Active Filters explorer itself; the default-off change applies to ordinary explorer nodes that match active filters.
- Do not commit.

## Expected Final Answer From Executing Agent

The executing agent must report:

- Whether matched active-filter node decoration is default-off and opt-in through Settings.
- Whether queue badges can remove queued operations from tree/grid/cards/table.
- Whether Props search starts in `all` mode and labels are `Props`/`Values`.
- Whether ViewTree now uses `serviceScroll` and whether lag/blank gaps improved in focused tests/manual browser pass.
- Whether PretextJS/service text measurement is actually applied to every dynamic node surface; if not, state which views use it and why fixed-height views do not.
- Which settings/body classes control node backgrounds/borders and base theme variants.
- Which controls were made horizontally scrollable.
- Whether Queue child rows no longer carry operation icon/row decoration/redundant labels/boxed cancel action.
