---
title: SDF-009 Content active tab header label
type: issue
issue_id: SDF-009
status: completed
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T07:53:25
updated: 2026-06-06T13:20:45
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - explorer/content
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-009 Content Active Tab Header Label

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

When Content is the active Data tab, show the Content label in its minimal filters header button so the header does not look empty when that button is the only visible control.

## Acceptance Criteria

- [x] Content active tab header button shows its label while Content is active.
- [x] Props and Tags keep the current minimal header behavior unless their active-tab affordance also becomes visually empty.
- [x] The label uses existing tab/header classes and does not introduce a separate visual language.
- [x] The behavior is reactive when switching Data tabs.
- [x] Runtime smoke confirms Content header is not visually blank in minimal style.

## Blocked By

None - can start immediately.

## Verification

- `pnpm exec vitest run --config vitest.unit.config.mts test/unit/fabIndicator.test.ts test/unit/navbarPillFabSource.test.ts test/unit/navbarFiltersSource.test.ts` passed 3 files / 9 tests.
- `pnpm run verify` passed with 21 unit files / 72 tests and scorecard 17 checks.
- Build synced to `plugin-dev` with `node scripts/sync-test-build.mjs`; `plugin:reload` and `vaultman:open` passed.
- Runtime smoke opened the minimal Data Tabs menu, selected Content, and confirmed:
  - `.vaultman-header-action-label` text is `Content`;
  - header visible text is `Content`;
  - Tabs button has `.vaultman-header-action-with-label`;
  - Tabs button aria label is `Tabs: Content`.
- Final `obsidian vault=plugin-dev dev:errors` returned `No errors captured`.
