---
title: BT5-001..005 outcome and verification
type: verification
status: completed
lifecycle: active
parent: "[[docs/work/polish/plans/2026-07-19-bt5-001-005/index|BT5-001..005 implementation plan]]"
created: 2026-07-19T12:43:51
updated: 2026-07-19T12:43:51
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/verification, initiative/polish, release/bt5]
---

# BT5-001..005 outcome and verification

## Product commits

- `c60e3bc7 fix: resolve BT5 explorer lifecycle and sorting blockers`
  - BT5-001 settings revision without frame/panel remount.
  - BT5-002 exact-leaf activation/resize viewport refresh.
  - BT5-003 complete statistics schema, migration, visible/newest priority, batching,
    cancellation, persistence and Tasks convergence.
  - BT5-005 shared sort defaults and physical arrows; Name/Path semantics and Table
    Remaining Tasks adapter.
- `14de6fbb feat: add tag-pinned release bulletin policy`
  - manifest-driven once-per-version Notice and manual modal.
  - exact tag-pinned bulletin URL, accumulated public editorial document and strict
    release preflight/post-publish verification.

Both commits are on `C:/tmp/vaultman-release-beta2-final2`, branch
`codex/bt5-001-005`, immediately after the dev documentation checkpoint `1bedd4ce`.
No push, tag, merge or extra worktree occurred.

## Automated evidence

Fresh `pnpm run verify` after the last adversarial fixes:

- ESLint: pass.
- `tsc` + `svelte-check`: 0 errors, 0 warnings.
- Prettier Svelte check: pass.
- Stylelint: pass.
- production plugin build: pass.
- Vitest unit: 105 files, 594/594 tests.
- scorecard regression scan: 17/17 checks.
- `git diff --check`: pass before commits.

Focal RED→GREEN additionally covered legacy/malformed tasks, IndexedDB round-trip,
visible-first/mtime ordering, cancellation/resume/old-file completion, performance
records, settings teardown, exact workspace leaf activation, release anchor/link policy,
Tasks default direction and the Table adapter.

## Runtime evidence — only plugin-dev

The dev constrained every modified-build Obsidian command to explicit
`vault=plugin-dev`. The integration harness was not rerun because its global setup chooses
an arbitrary registered vault as IPC transport. `pnpm run build` synchronized only to
`C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`; SHA-256 matched for
`main.js`, `manifest.json` and `styles.css`.

- BT5-001: 18 settings transitions plus real Auto-reveal; same frame root, listener set
  fixed at 1, rows remained visible, originals restored, no runtime errors.
- BT5-002: temporary main Vaultman leaf retained 45 rows and the same root after new-tab
  return from both focused and unfocused states; no scroll; temporary leaves removed.
- BT5-003: 10 visible files completed in 416.5 ms; controlled 85-file sample completed in
  10,329.5 ms, exact priority order, 85/85 memory+IndexedDB records. A real file with one
  unchecked task returned 1 in memory and persisted storage; reload hydrated 88 records.
- BT5-004: manual command rendered title for `1.2.0-beta.4` plus What's new, Copy bulletin
  link and Got it; it was closed without opening the network.
- Final plugin reload: no captured Obsidian errors or console errors.

## Remaining gates

- BT5-002: dev visual/runtime matrix for sidebar, popout, every Files view mode, other
  virtualized explorers, sidebar collapse/reopen and scroll/selection/expansion retention.
- BT5-003: benchmark on `Start of The Road` against the recorded beta.4 baseline. This was
  intentionally not run after the dev prohibited modified-build testing outside
  `plugin-dev`.
- BT5-004: dev approval of final editorial copy/media for the chosen target version and
  post-publication verification against the new immutable tag.

These remaining gates do not leave uncommitted product code; they determine issue/release
acceptance and must not be inferred from unit coverage.
