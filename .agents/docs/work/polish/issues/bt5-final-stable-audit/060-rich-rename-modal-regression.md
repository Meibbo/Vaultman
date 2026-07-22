---
title: BT5-060 — Restore rich queued rename for individual nodes
type: issue
status: in-progress
lifecycle: active
priority: P0
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-22T13:05:00
updated: 2026-07-22T14:05:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/issue, triage/in-progress, initiative/polish, release/1.2.0, operations, regression]
---

# BT5-060 — Restore rich queued rename for individual nodes

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].
Corrects the Content slice of [[../bt5-next-release/036-node-menu-actions-and-config|BT5-036]].

## What to build

Replace `content.rename → promptForFileRename` introduced by `e0945039` with the
rich queued rename flow used by Files. Extend the rich modal to accept an initial
pattern: a single `pepito.md` opens with `pepito`, while multi-target operations
retain `{basename}` and other placeholders. Audit rename callers and migrate every
operation that uses a basic prompt or bypasses the queue when the rich operation
contract applies; preserve simple prompts for non-operation naming such as Save Layout.

## Acceptance criteria

- [x] Content/Text Rename opens the rich modal and stages a file rename operation.
- [x] Single-target initial input is the literal basename; multi-target remains pattern-based.
- [x] Preview, property placeholders, validation and extension handling remain available.
- [x] Queued Content rename projects `badge_rename` and is cancelable.
- [x] `contentContextMenu.test.ts` stops requiring the native rename prompt.
- [x] Snippet rename no longer extracts `_RENAME_FILE` and calls `adapter.rename` directly.
- [x] Folder/Property/Value/basic-modal callers are classified and migrated only when the
      richer operation contract fits their domain; Tag inline queue remains valid.
- [x] Delete confirmation remains separate and may keep the native Obsidian prompt.

## Blocked by

None — can start immediately.

## Implementation checkpoint — 2026-07-22

- Product commit: `45c86373 fix(operations): restore rich queued rename flows`.
- `FileRenameModal` now initializes a single target with its literal basename and accepts
  a typed change builder without losing preview/placeholders/validation.
- Content calls the rich modal and `queueService.addOrRun`; native deletion remains separate.
- Snippet rename is an explicit config-directory operation executed only by the queue. Its
  row and Content rows project the same cancellable pencil badge.
- Focused evidence: 7 files / 45 tests green; full unit suite 142/143 files and 932/933 tests
  green. The sole failure is the pre-existing BT5-045 baseline where
  `toolbarUsesHorizontalScroll` was commented out in the uncommitted
  `logicResponsiveLayout.ts` edit.
- ESLint on every changed TS/test path, Svelte autofixer, Svelte format and `git diff --check`
  are green. `pnpm run check` has only the same three overflow diagnostics recorded before
  this slice.

## Remaining before closing

- Dev/runtime smoke in Obsidian: initial input, preview, queue badge, cancellation and Apply
  for Content and Snippet. Keep status `in-progress` until that visible behavior is accepted.
