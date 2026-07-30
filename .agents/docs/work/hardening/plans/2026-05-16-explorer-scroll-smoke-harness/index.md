---
title: Explorer scroll smoke harness implementation plan
type: implementation-plan
status: completed
parent: "[[docs/work/hardening/index|Hardening]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T11:14:17-05:00
tags:
  - agent/plan
  - explorer/performance
  - explorer/scroll
  - plugin-dev
created_by: codex
updated_by: codex
---

# Explorer Scroll Smoke Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans or superpowers:subagent-driven-development to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Add a live `plugin-dev` scroll-burst smoke harness that visibly drives the Explorer up/down and fails when the viewport blanks under aggressive jumps.

**Architecture:** Extend the existing `window.__vaultmanPerfProbe` runner with a new burst scenario instead of creating a separate browser harness. A small Node script invokes Obsidian CLI with explicit `vault=plugin-dev`, reloads the plugin, opens Vaultman, runs the scenario, prints JSON, and fails on thresholds.

**Tech Stack:** TypeScript, Vitest component tests, existing Obsidian CLI, PowerShell-compatible Node script, existing `PerfProbe`.

---

## Files

- Modify: `src/dev/perfProbe.ts`
- Modify: `test/component/perfProbeDom.test.ts`
- Create: `scripts/run-explorer-scroll-smoke.mjs`
- Modify: `package.json`
- Modify: `.agents/docs/current/status.md`
- Modify: `.agents/docs/current/handoff.md`
- Modify: `.agents/docs/work/hardening/index.md`

## Tasks

- [x] **Task 1: Add RED component tests for burst behavior.**
  Extend `test/component/perfProbeDom.test.ts` with tests that expect `explorer-scroll-burst-live` to perform repeated ratio jumps, count rendered rows after each jump, expose a scroll-burst report, and mark blank windows as failure evidence.

- [x] **Task 2: Implement the burst probe.**
  Add the scenario, target detection, requestAnimationFrame/tick sampling, visible row measurement, event-loop delay measurement, and optional live overlay. Keep row identity/text as the measured acceptance signal.

- [x] **Task 3: Add RED script tests through static checks or focused behavior.**
  If a script unit seam is practical, test command construction. Otherwise verify via `node scripts/run-explorer-scroll-smoke.mjs --help` after implementation.

- [x] **Task 4: Implement the `plugin-dev` runner script.**
  Add CLI args for `--mode=smoke|stress`, `--view=auto|tree|list|table|grid|cards`, `--jumps`, `--visual-delay-ms`, `--no-build`, `--no-reload`, `--no-open`, and `--no-overlay`. Default vault must be `plugin-dev`.

- [x] **Task 5: Add package scripts.**
  Add `smoke:scroll` and `smoke:scroll:stress` that call the runner.

- [x] **Task 6: Update docs/handoff.**
  Link this plan from hardening/status/handoff and record the exact live smoke command.

- [x] **Task 7: Verify.**
  Run focused component tests, `node scripts/run-explorer-scroll-smoke.mjs --help`, `pnpm check`, and `git diff --check`. Run the live smoke only if Obsidian is available, always with `vault=plugin-dev`.

## Verification

- `pnpm exec vitest run --project component --config vitest.config.ts test/component/perfProbeDom.test.ts --fileParallelism=false`:
  passed, 1 file / 12 tests.
- `pnpm exec vitest run --project unit --config vitest.config.ts test/unit/scripts/explorerScrollSmokeScript.test.ts`:
  passed, 1 file / 1 test.
- `node scripts/run-explorer-scroll-smoke.mjs --help`: passed.
- `pnpm check`: passed, 0 errors / 0 warnings.
- `git diff --check`: passed. Git reported LF-to-CRLF working-copy warnings only.
- First live smoke attempt compiled and synced build artifacts, then failed at `obsidian plugin:reload id=vaultman vault=plugin-dev` because Obsidian was not running.
- Live verification exposed two runner defects and both now have regression coverage:
  - `vaultman:open` is a toggle command, so the runner now skips it when the requested scroll target or Vaultman frame already exists.
  - hidden/background Obsidian windows throttle `requestAnimationFrame` and timers, so the probe now uses microtask sampling and skips visual delay when `document.hidden` / `visibilityState=hidden`.
- Final full live command `pnpm smoke:scroll -- --view=tree --jumps=100` passed after build/sync/reload:
  `blankFrames=0`, `blank>100ms=0`, `blank>250ms=0`, `maxBlank=0ms`, `maxDelay=143ms`, and `obsidian dev:errors vault=plugin-dev` returned `No errors captured.`
