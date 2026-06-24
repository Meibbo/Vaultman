---
title: Performance diagnosis loop implementation plan
type: plan-index
status: completed
parent: "[[docs/work/hardening/specs/2026-05-05-performance-diagnosis-loop/index|performance-diagnosis-loop]]"
created: 2026-05-05T20:58:26
updated: 2026-05-05T21:45:00
tags:
  - agent/plan
  - initiative/hardening
  - performance
  - explorer/views
---

# Performance Diagnosis Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a repeatable Obsidian-run performance probe that measures explorer search, scroll, filter selection, view/decorator hot paths, and operation badge updates before any architecture rewrite.

**Architecture:** Add a dev-facing perf probe service with no product UI. Instrument only the render and service boundaries needed to count hot-path work, then expose `window.__vaultmanPerfProbe.run(...)` from `main.ts` for Obsidian CLI/manual execution. Record a baseline report before deciding whether to optimize `serviceViews`, `serviceDecorate`, virtual scrolling, or context menu.

**Tech Stack:** TypeScript, Svelte 5 runes, Vitest unit/component tests, Obsidian CLI `obsidian eval`, existing `ViewService`, `DecorationManager`, `PanelExplorer`, `ViewTree`, and `docs` research notes.

---

## File Map

- Create `src/dev/perfProbe.ts`: perf counters, timers, scenario runner, global installer, and DOM helpers.
- Modify `src/main.ts`: install and uninstall `window.__vaultmanPerfProbe` after services are constructed.
- Modify `src/services/serviceViews.svelte.ts`: record `ViewService.getModel`, selection mutations, and focus mutations.
- Modify `src/services/serviceDecorate.ts`: record `DecorationManager.decorate` calls.
- Modify `src/components/containers/panelExplorer.svelte`: record provider refreshes, `getTree`, `getFiles`, and badge bubbling.
- Modify `src/components/views/viewTree.svelte`: record flattening, visible windows, and scroll bursts.
- Create `test/unit/dev/perfProbe.test.ts`: pure counter/timer and installer tests.
- Create `test/component/perfProbeDom.test.ts`: DOM scenario runner tests in jsdom.
- Create `docs/work/hardening/research/2026-05-05-performance-baseline/index.md`: baseline report populated after probe runs.

## Shards

1. [[docs/work/hardening/plans/2026-05-05-performance-diagnosis-loop/01-perf-probe-contract|Perf probe contract]]
2. [[docs/work/hardening/plans/2026-05-05-performance-diagnosis-loop/02-render-hot-path-instrumentation|Render hot path instrumentation]]
3. [[docs/work/hardening/plans/2026-05-05-performance-diagnosis-loop/02-render-hot-path-instrumentation-part-2|Render hot path instrumentation part 2]]
4. [[docs/work/hardening/plans/2026-05-05-performance-diagnosis-loop/03-obsidian-scenario-runner|Obsidian scenario runner]]
5. [[docs/work/hardening/plans/2026-05-05-performance-diagnosis-loop/04-baseline-report|Baseline report]]
6. [[docs/work/hardening/plans/2026-05-05-performance-diagnosis-loop/05-final-verification|Final verification]]

## Guardrails

- Do not add TanStack, DnD, CodeQL, or context-menu rewrites in this plan.
- Do not change product-visible behavior except for adding a dev global hook.
- Do not leave console logging in hot paths.
- Do not commit unless the user explicitly asks.
- Avoid running Vite/Svelte verification commands in parallel.

## Execution Order

Use TDD per shard. First prove the pure probe contract, then add narrow instrumentation, then add Obsidian scenarios, then collect a baseline report. Stop after identifying the top one or two hot paths; optimization work belongs in the next plan.
