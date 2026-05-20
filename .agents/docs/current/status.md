---
title: Current status
type: agent-status
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
archive_source: "docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-status.md"
created: 2026-05-04T01:36:20
updated: 2026-05-20T00:00:00-05:00
tags:
  - agent/current
created_by: dec
updated_by: codex
---

# Current Status

Compact route index after archiving the oversized current status:
[[docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-status|2026-05-11 status archive]].

## Active Rules

- `main` must contain zero AI workflow files.
- Active detail belongs in source records, not this index.
- Do not revert or overwrite unrelated user/agent changes.
- Obsidian CLI runtime tests and live smokes must target `plugin-dev`
  explicitly, using command-specific syntax such as
  `obsidian vault=plugin-dev eval code="..."`.

## Current Route

- Active initiative: [[docs/work/hardening/index|Hardening]].
- **NEXT (post-release 2026-05-20)**: [[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella]]
  — proto-v5 ↔ production merge + release pipeline renumerado `v1.2.0→v2.0.0` después del
  catch-up `1.1.0`. A.R spec + plan existen para `v1.2.0`; implementation queda gateada por
  0-A C12/C13.
- A.R records imported from `claude/pensive-khorana-ed62bd`:
  [[docs/work/hardening/specs/2026-05-20-explorer-AR-action-routing/index|A.R Action Routing spec]]
  and
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/index|A.R implementation plan]].
- Release catch-up complete:
  [[docs/work/hardening/plans/2026-05-20-release-1-1-0-catch-up|Release 1.1.0 catch-up]].
- Completed Explorer Phase 0 sub-system B:
  [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index|serviceTheme token-layer spec]]
  and
  [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/index|executed 0-B implementation plan]].
- Completed Explorer Phase 0 sub-system O:
  [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|frameVaultman decomposition spec]]
  and
  [[docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|executed O implementation plan]].
- Completed Explorer platform spec:
  [[docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass spec]].
- Completed Explorer platform plan:
  [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass implementation plan]].
- Verification and live probe record:
  [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/perf-baseline|Explorer View Platform perf baseline]].
- Post-review performance/Menu repair:
  [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/07-performance-comparison-repair|Explorer platform performance comparison repair]].
- OpenSSF hardening route captured from 2026-05-16 external research:
  [[docs/work/hardening/research/2026-05-16-openssf-osps-baseline/index|OpenSSF OSPS baseline research]]
  and
  [[docs/work/hardening/plans/2026-05-16-openssf-osps-baseline/index|OpenSSF OSPS baseline implementation plan]].
- Active Explorer scroll forensics:
  [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/index|Notebook Navigator scroll forensics]].
- Active multiview virtualization research:
  [[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index|Multiview virtualization research]].
- Completed Explorer scroll smoke harness plan:
  [[docs/work/hardening/plans/2026-05-16-explorer-scroll-smoke-harness/index|Explorer scroll smoke harness implementation plan]].
- Active Explorer variable scroll repair:
  [[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/index|Explorer variable scroll repair]].
- Toolbar architecture map captured for Polish:
  [[docs/work/polish/research/2026-05-17-toolbar-architecture/index|Toolbar architecture and primitive ordering map]].
- Codebase architecture cluster phases 01-09 captured:
  [[docs/work/research/2026-05-17-codebase-architecture-cluster/index|Codebase architecture cluster]];
  latest layer:
  [[docs/work/research/2026-05-17-codebase-architecture-cluster/09-residual-src-support-layer|Residual src support layer]].

## Explorer Platform Outcome

- Tasks 1-20 of the Explorer View Platform pass are implemented, verified, and
  committed on `claude/explorer`.
- Post-review repair is implemented but not yet committed in this worktree:
  Notebook Navigator comparison bridge, faster 50K Vaultman projection, and
  Markmap removed from selectable view menu.
- Latest Explorer platform commits:
  - `6aa23aa` `refactor: migrate tree rows to explorer projection`
  - `f1ba4ac` `refactor: route tree reveal through scroll coordinator`
  - `25c9d6b` `refactor: align panel tree list projection adapters`
  - `8056ef5` `refactor: add platform contracts to table grid cards`
  - `4f609af` `test: verify explorer platform focused gates`
  - `c457d01` `test: record live explorer platform perf probe`
- Earlier task commits remain in branch history from `883cb0a` through
  `a79f905`; `9df9e50` is an unrelated theme-plan commit in between.

## Verification Snapshot

- Release 1.1.0 catch-up final gate on 2026-05-20:
  - Clean candidate `pnpm run verify`: exit 0.
  - Clean candidate `pnpm run security:audit`: exit 0 for high+ threshold.
  - Main after PR #22 passed CI, CodeQL, and OpenSSF Scorecard.
  - GitHub Release `1.1.0` published with `main.js`, `manifest.json`, `styles.css`,
    `SHA256SUMS`, and `sbom.cdx.json`.
- Explorer 0-B final gate on 2026-05-17:
  - `pnpm verify` passed: unit 140 files / 882 tests; component 73 files /
    398 tests; lint 11 pre-existing warnings, 0 errors.
  - Required legacy-symbol queries returned zero matches for
    `applyVaultmanTheme`, `vm-glass-blur`, body-scoped `vm-theme`,
    `normalizeLayoutTheme` / `LAYOUT_THEME_OPTIONS` / `LayoutTheme`, and
    `updateGlassBlur`.
  - Targeted theme gates passed: unit 4 files / 61 tests; component 3 files /
    23 tests.
  - `dist/build/styles.css` contains `.vm-theme-native` and
    `.vm-theme-vaultman`; each block has six `--vm-*` properties.
  - Live `plugin-dev` smoke was partial: reload/open succeeded and
    `dev:errors` initially returned `No errors captured`; later DOM/eval
    inspection commands timed out.
- Task 17 focused unit gate passed: 5 files / 17 tests.
- Task 17 focused component gate passed: 5 files / 54 tests.
- Task 18 `pnpm check` passed: 0 errors / 0 warnings.
- Task 18 `pnpm run build` passed and synced build artifacts to `plugin-dev`.
- Task 18 `pnpm verify` passed:
  - Unit: 135 files / 821 tests.
  - Component: 69 files / 372 tests.
  - Lint: 8 warnings in pre-existing unrelated files, 0 errors.
- Task 18 `git diff --check` passed.
- Task 19 live Obsidian CLI target confirmed as `plugin-dev`.
- Task 19 live scenarios ran through `window.__vaultmanPerfProbe`; details are
  in the perf baseline.
- Task 19 `obsidian vault=plugin-dev dev:errors`: `No errors captured.`
- Post-review repair `pnpm verify` passed:
  - Unit: 136 files / 824 tests.
  - Component: 69 files / 372 tests.
  - Lint: 8 pre-existing warnings, 0 errors.
- Notebook Navigator original focused tests passed with Node 24.15.0:
  4 files / 19 tests.
- Notebook Navigator comparison bridge passed with logged medians:
  Notebook Navigator list `61.1534 ms`; Vaultman projection `26.9575 ms`;
  Notebook Navigator lookups `0.7050 ms`; Vaultman lookups `0.1517 ms`.
- Live `plugin-dev` view menu smoke after reload:
  `["Tree","List","Table","Grid","Cards"]`, `hasMarkmap=false`, and
  `obsidian vault=plugin-dev dev:errors` returned `No errors captured.`
- Explorer Sub-system O final gate on 2026-05-18:
  - `frameVaultman.svelte` reduced from 866 LOC pre-O to 335 LOC.
  - Targeted O component matrix passed: 10 files / 60 tests.
  - `pnpm check` passed: 0 errors / 0 warnings.
  - `pnpm verify` was invoked once as required. It passed lint, check, build,
    unit tests (140 files / 882 tests), then failed in component full-suite
    load on three pre-existing timing-sensitive files. User explicitly
    accepted the exception after targeted reruns passed:
    `viewTableStress.test.ts`, `pageFiltersRenameHandoff.test.ts`, and
    `vmDialogPortal.test.ts`.
  - Final live `plugin-dev` smoke returned `No errors captured.`

## Known Residuals

- User-reported Explorer blanking regression has a current code repair:
  variable-height fallbacks are bounded by scroll position, and live
  `plugin-dev` smoke passed with zero blank frames in Tree/List/Table/Grid/Cards.
  Treat event-loop delay spikes as the remaining performance issue.
- 2026-05-16 research found no safe wholesale virtualizer replacement. Keep
  TanStack as the default, add a shared layout/index service, and prototype
  `virtua` only behind the same live blank-frame harness.
- Scroll smoke harness is implemented in `src/dev/perfProbe.ts` and
  `scripts/run-explorer-scroll-smoke.mjs`. Live runs use
  `pnpm smoke:scroll -- --view=<mode>` or direct script invocation, both
  targeting `vault=plugin-dev`.
- Live multiview smoke after variable scroll repair passed with
  `blankFrames=0`, `blank>100ms=0`, `blank>250ms=0`, `maxBlank=0ms`, and no
  Obsidian dev errors for Tree/List/Table/Grid/Cards. Max event-loop delay
  remained uneven: Tree 108 ms, List 258 ms, Table 1312 ms, Grid 600 ms,
  Cards 24 ms.
- Follow-up scroll-idle jank pass in Table/Grid defers variable row measurement
  and virtualizer resizing until 96 ms after active scroll. Fresh zero-delay
  live smokes passed with no blanks and no dev errors: Table maxDelay 29 ms,
  Grid 58 ms, List 37 ms.
- Map/ViewNodeMap remains deferred and is not exposed as a selectable
  next-release view after the post-review repair.
- Current worktree dirt is the active variable scroll repair plus its docs/tests;
  no unrelated dirty files were visible in `git status --short --branch` at
  2026-05-16T12:52-05:00.

## Next Action

- **PRIMARY (post A.R spec/plan import 2026-05-20)**: close remaining 0-A commits
  (C12 flicker fix + C13 verification gates). A.R implementation plan has Gate-0 and must not start
  until 0-A is closed.
- Then execute A.R implementation for `v1.2.0` from
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/index|A.R implementation plan]].
- Explorer 0-B and O are complete. Next Phase 0 consumer is 0-A View Feature
  Contract / native DOM contract.
- For Explorer scroll work, continue from the variable scroll repair record:
  add runner-level view switching, add percentile/histogram reporting for scroll
  burst delay, investigate Grid's remaining 58 ms peak if it persists, and
  confirm the matrix against explicit 50k/100k datasets.
- If resuming OpenSSF hardening, begin with
  [[docs/work/hardening/plans/2026-05-16-openssf-osps-baseline/01-scope-docs-workflow-permissions|Scope, public docs, and workflow permissions]].
- If continuing the architecture cluster, next run coverage reconciliation:
  compare tracked source/config/test/doc paths against phases 01-09, mark
  generated-artifact exclusions, and produce a final coverage matrix.
