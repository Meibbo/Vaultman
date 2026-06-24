---
title: Toolbar coexistence + F&R + recents + merge stack — implementation plan
type: implementation-plan
status: draft
parent: "[[docs/work/polish/specs/2026-05-13-toolbar-coexistence-fnr-recents/index|toolbar-coexistence-fnr-recents spec]]"
created: 2026-05-13T19:00:00
updated: 2026-05-13T19:00:00
tags:
  - agent/plan
  - initiative/polish
  - toolbar
  - search-island
  - fnr
  - recent-searches
  - merge-stack-island
  - overlay-state
created_by: opus
updated_by: opus
---

# Toolbar Coexistence + F&R + Recents + Merge Stack — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three coordinated UX upgrades to Vaultman's frame — coexistent search/stack/nav surfaces with an inline-toolbar variant, an F&R two-input search island with per-tab recent searches and a row stepper, and a `mergedStackIsland` setting that collapses Filters + Queue into a single arrow-nav shell.

**Architecture:** Search island lifts into `serviceOverlayState` as a third sibling overlay (`search-island`) at `$vm-z-index-island`. Filters↔Queue stay XOR by default but consolidate into one shell when `mergedStackIsland` is on. F&R reuses the existing `FnRIslandService` and extends it with a `replacement` field. Recent searches consume the existing `searchHistory` prop, filtered per-tab, capped by a settable row count. Theme builder (Spec 4) is out of scope; settings live in `settingsVM.ts` for now.

**Tech Stack:** Svelte 5 runes, TypeScript, Obsidian Plugin API, Vitest (unit + component), `svelte-check`, ESLint, esbuild (`vp build`), SCSS.

---

## Order of Execution

| Shard                            | Focus                                                                   | Depends on |
| -------------------------------- | ----------------------------------------------------------------------- | ---------- |
| [[01-spec1-search-coexistence\|01]] | Lift search to overlay state, relax stack-vs-search exclusion, inline-toolbar variant. | —          |
| [[02-spec2-fnr-recents\|02]]       | F&R two-input (B2 default, B1 setting), recent searches per-tab, row stepper. | 01         |
| [[03-spec3-merge-stack\|03]]       | `mergedStackIsland` setting + arrow-nav single shell.                   | —          |

Shards 01 and 03 are independent (parallel-safe). Shard 02 depends on 01 because it modifies the same Toolbar search island and assumes the overlay-state integration is in place.

## Verification Gate (run after each shard)

```bash
pnpm run lint:full
pnpm run check
pnpm run test:unit
pnpm run test:component
pnpm run build:plugin
```

Expected: zero errors / zero failing tests. Performance regression tests
(`test/unit/performance/stress.test.ts`,
`test/component/viewTableStress.test.ts`) are known to be unstable; they
remain deferred per the active hardening status.

## Settings Keys Introduced

All four keys land in `src/types/typeSettings.ts` and surface in
`src/components/settings/SettingsUI.svelte`. Defaults preserve current
behavior so existing installations boot unchanged.

| Key                          | Type                  | Default   | Shard |
| ---------------------------- | --------------------- | --------- | ----- |
| `toolbarSearchMode`          | `'island' \| 'inline'`| `'island'`| 01    |
| `fnrReplaceAlwaysVisible`    | `boolean`             | `false`   | 02    |
| `recentSearchesRows`         | `number` (1..8)       | `4`       | 02    |
| `mergedStackIsland`          | `boolean`             | `false`   | 03    |

## Branching & Commits

- Work on this worktree's existing branch (`claude/busy-mahavira-4aaf98`)
  unless redirected.
- Commit after every step that produces a passing test or compiling
  refactor. Conventional Commits: `feat(toolbar): ...`,
  `test(toolbar): ...`, `refactor(overlays): ...`.
- Do not push, tag, or merge.
- Do not amend prior commits.

## Out of Scope

- Theme builder WYSIWYG (Spec 4 brainstorm + plan).
- Live `plugin-dev` smoke (run separately if requested).
- The deferred performance stress tests.
