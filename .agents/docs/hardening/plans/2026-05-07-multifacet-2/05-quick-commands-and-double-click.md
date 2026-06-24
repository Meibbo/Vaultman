---
title: Quick commands and double-click clear
type: implementation-plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-07-multifacet-2/index|multifacet wave 2 plan]]"
created: 2026-05-07T02:30:00
updated: 2026-05-07T02:30:00
tags:
  - agent/plan
  - explorer/commands
created_by: claude
updated_by: claude
---

# Phase 5 — Quick Commands And Double-Click Clear

> Spec: [[docs/work/hardening/specs/2026-05-07-multifacet-2/03-quick-commands|Quick commands]]

## Tasks (Double-Click)

- [x] Add `useDoubleClick(handler, threshold = 250)` helper if none
      exists.
- [x] Wire double-click on each navbar active-filter pill to
      `serviceFilter.clearAll()`. Single click keeps current
      toggle behavior.
- [x] Wire double-click on the navbar queue badge to
      `OperationQueueService.clearAll()`. Single click keeps
      current popup behavior.

## Tasks (Commands)

- [x] Create `src/services/serviceCommands.ts` registering each
      command from spec §Obsidian Commands with `checkCallback`.
- [x] Implement `panelExplorer.focusFirstNode()` and have
      `vaultman:open` call it after `revealLeaf`.
- [x] Wire `vaultman:open-find-replace-active-explorer` to set
      `FnRIslandService.mode = 'replace'` and focus the searchbox.

## Tests

- [x] `test/unit/services/serviceCommandsRegistration.test.ts` —
      every command id is registered, `checkCallback` returns false
      when prerequisites missing.
- [x] `test/component/navbarPillDoubleClickClear.test.ts` —
      single click toggles, double click within 250 ms clears.
- [x] `test/component/navbarQueueDoubleClickClear.test.ts` — same
      contract for queue badge.
- [ ] `test/smoke/obsidianCommandsSmoke.test.ts` (Obsidian CLI) —
      run each command once, assert side effect. (Deferred: spec
      explicitly skips Obsidian CLI smoke for this phase; covered via
      component tests.)

## Verification

- [x] Focused unit + component runs.
- [x] `pnpm run check && pnpm run lint && pnpm run build`.
- [ ] Obsidian CLI: invoke each command via `obsidian
      command:run id=<cmd-id>` and assert outcome. (Deferred per spec.)

## Stop Conditions

- Stop if `useDoubleClick` swallows legitimate single clicks
  upstream of toggle handlers. Use `mousedown` + timer rather than
  `dblclick` if event ordering is wrong.
- Stop if `focusFirstNode` cannot land on the first virtual row due
  to TanStack lazy mounting. Defer to next animation frame and
  retry up to 3 times.
