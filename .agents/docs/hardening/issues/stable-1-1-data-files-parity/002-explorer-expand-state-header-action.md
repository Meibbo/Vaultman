---
title: SDF-002 Explorer expand state drives header action
type: issue
issue_id: SDF-002
status: done
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T07:53:25
updated: 2026-06-06T08:49:57
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - explorer/views
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-002 Explorer Expand State Drives Header Action

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Make the explorer header expand/collapse action derive from real expanded-node state for Files, Props,
Tags, and Content where applicable.

## Acceptance Criteria

- [x] If any node in the active explorer is expanded, the header action shows `Collapse all`.
- [x] If no node in the active explorer is expanded, the header action shows `Expand all`.
- [x] Manual row expansion, search-driven expansion, sparse auto-expansion, and auto-reveal all update the header action reactively.
- [x] Switching explorer tabs preserves each explorer's correct header action state.
- [x] Focused tests or runtime smoke cover row-level expansion followed by header label update.

## Blocked By

None - can start immediately.

## Verification

- Run focused navbar/explorer tests where available.
- Build, sync, reload `plugin-dev`, manually expand one row in each explorer, and inspect header text with `obsidian-cli`.

## Closeout - 2026-06-06

- Implemented in product worktree `hotfix/1.0.2-css-scorecard`.
- Files, Props, and Tags panels now expose `setExpansionChangeHandler()`.
- Panel expansion paths notify the header after row toggle, expand all, collapse all, Files auto reveal, Files search/sparse auto-expansion, and create-note/folder ancestor expansion.
- `NavbarFilters` registers panel expansion callbacks and refreshes its expansion state on the next animation frame, avoiding Svelte effect update loops.
- Initial implementation produced `effect_update_depth_exceeded`; corrected by removing synchronous callback invocation inside panel setter and clearing the error buffer before final reload.
- `pnpm run verify`: pass; unit suite `14` files / `47` tests; scorecard scan `17` checks.
- Final sync: `node scripts/sync-test-build.mjs`.
- `obsidian vault=plugin-dev plugin:reload id=vaultman`: pass.
- Fresh `obsidian vault=plugin-dev dev:errors`: `No errors captured`.
- DOM smoke: clicking a Files folder changed the Files header from `Expand all` to `Collapse all`; clicking a Props caret changed the Data/Props header from `Expand all` to `Collapse all`. Both headers were collapsed again after smoke.
