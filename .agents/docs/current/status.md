---
title: Current status
type: agent-status
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
archive_source: "docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-status.md"
created: 2026-05-04T01:36:20
updated: 2026-05-16T06:20:10-05:00
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
  `obsidian eval code="..." vault=plugin-dev`.

## Current Route

- Active initiative: [[docs/work/hardening/index|Hardening]].
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
- Task 19 `obsidian dev:errors vault=plugin-dev`: `No errors captured.`
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
  `obsidian dev:errors vault=plugin-dev` returned `No errors captured.`

## Known Residuals

- Map/ViewNodeMap remains deferred and is not exposed as a selectable
  next-release view after the post-review repair.
- `styles.css` is dirty after the required build artifact sync and is not
  staged in the Explorer handoff commit.
- Current working tree still contains unrelated/user changes including
  `.gitignore`, `README.md`, `manifest.json`, `package.json`, eslint
  rule/script paths, OpenSSF docs, and many deleted docs. Preserve them unless
  explicitly asked.

## Next Action

- Explorer platform pass is complete after post-review repair; next agent
  should commit/review the repair or follow the user's next explicit route.
- If resuming OpenSSF hardening, begin with
  [[docs/work/hardening/plans/2026-05-16-openssf-osps-baseline/01-scope-docs-workflow-permissions|Scope, public docs, and workflow permissions]].
