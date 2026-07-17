---
title: ViewTree latency and performance-test repair
type: implementation-record
status: done
created: 2026-05-09T09:30:00
updated: 2026-05-09T09:30:00
tags:
  - agent/performance
  - vaultman/viewtree
  - vaultman/tests
  - vaultman/svar
created_by: codex
updated_by: codex
---

# ViewTree Latency And Performance-Test Repair

## User Problem

The user reported that a Gemini update worsened explorer responsiveness by
adding latency, most visibly in `viewTree`, and warned that the performance
tests were also Gemini-written. The user also requested proper component
mounting for a library-backed element.

## Findings

- Commit `d9fa9ee` added a trailing-only 250 ms debounce on explorer refresh
  paths in `main.ts`, delaying the first visible explorer update.
- `perfProbeDom.test.ts` measured a fake tree DOM instead of mounting the real
  `ViewTree` component, so it could not catch TanStack/Svelte integration
  regressions.
- `test/integration/stress.test.ts` manually registered
  `test/vaults/stress-vault`, but that fixture contains plugin build files and
  no real markdown corpus; vault readiness failed before assertions.
- `test/integration/performance.test.ts` read `process.cwd()` through
  `evalInObsidian` instead of the global setup temp vault, so it was sampling
  the wrong live Obsidian app.
- Early boot marks were emitted before `OpsLogService` was subscribed, so even
  a correctly targeted integration test could miss `vaultman:boot:start` and
  `vaultman:boot:settings-loaded`.
- The new SVAR filemanager wrapper compiled only after fixing lifecycle cleanup
  to use Obsidian `EventRef`/`offref` and adding real mount coverage with SVAR
  Svelte mocks.

## Changes

- Added `leadingDebounce` in `src/utils/utilDebounce.ts` and switched explorer
  refresh scheduling in `src/main.ts` to immediate-first, trailing-coalesced
  behavior.
- Initialized and bound `OpsLogService` before the first boot mark, then applied
  settings retention after `loadSettings()`.
- Made `OpsLogService.bind()` idempotent for PerfMeter and queue subscriptions.
- Replaced the fake tree perf probe test with a real mounted `ViewTree`
  component path.
- Replaced the broken integration stress test with an in-memory unit stress
  suite over real index, filter, and view services.
- Pointed the integration performance test at `getTempVault().path`.
- Added PageStats note preview rendering through Obsidian
  `MarkdownRenderer.render(app, markdown, host, file.path, Component)` with
  lifecycle unload coverage.
- Added `VaultmanFileSuggestModal` via `FuzzySuggestModal<TFile>` for the
  PageStats note picker.
- Fixed and covered the SVAR filemanager wrapper with mounted component tests
  and library mocks.

## Verification

- `pnpm exec vp test run --project unit --config vitest.config.ts test/unit/utils/utilDebounce.test.ts test/unit/services/serviceOpsLog.test.ts test/unit/components/framePages.test.ts test/unit/performance/stress.test.ts test/unit/services/serviceCommandsRegistration.test.ts`
  passed with 5 files and 24 tests.
- `pnpm exec vp test run --project component --config vitest.config.ts test/component/pageStatsNotePreview.test.ts test/component/perfProbeDom.test.ts test/component/viewSvarFileManager.test.ts --fileParallelism=false`
  passed with 3 files and 9 tests.
- `pnpm run lint` passed with 0 warnings and 0 errors.
- `pnpm run check` passed with 0 errors and 0 warnings.
- `pnpm run build` passed and synced build artifacts.
- `pnpm exec vp test run --project integration --config vitest.config.ts test/integration/performance.test.ts`
  passed with 1 file and 2 tests against the temp vault from global setup.
