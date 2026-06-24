---
title: Testing and exit criteria
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/index|user-facing-recovery-wave-a]]"
created: 2026-05-06T02:46:22
updated: 2026-05-06T02:46:22
tags:
  - agent/spec
  - initiative/hardening
  - testing
---

# Testing And Exit Criteria

## TDD Rule

Each implementation slice uses vertical TDD:

1. write one failing behavior test;
2. run it and confirm the expected failure;
3. implement the smallest change;
4. run the focused test green;
5. repeat for the next behavior.

Do not write all tests first.

## A0 Tests

Required behavior tests:

- `explorerTags` registered `tag.rename` action is not a no-op.
- `explorerTags` registered delete and rename actions stage queue-visible work.
- `explorerFiles` registered rename action has a testable operation builder or
  handoff state.
- `explorerFiles` registered move action has a testable operation builder or
  handoff state.
- `explorerFiles` delete action does not bypass Vaultman queue semantics while
  presenting itself as a Vaultman operation.

Focused commands should start with:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/components/explorerTags.test.ts test/unit/components/explorerFiles.test.ts
```

## A1 Tests

Required behavior tests:

- prop context-menu rename creates a rename handoff instead of opening
  `showInputModal`;
- value context-menu rename creates a value rename handoff;
- confirming the handoff queues the same logical operation as the current modal
  path;
- cancelling the handoff leaves the queue untouched;
- active scope is respected for selected, filtered, and all files.

## A2 Tests

Required behavior tests:

- tag rename queues tag replacement through frontmatter tags;
- file rename queues `file_rename` using existing `RENAME_FILE` semantics;
- multi-selection behaves consistently with selected nodes from
  `panelExplorer`;
- file/tag context-menu tests run through registered actions, not private
  methods.

## A3 Tests

Required behavior tests:

- navbar shows active filter count without opening the active filters island;
- navbar shows queue count without opening the queue island;
- quick-action badges can queue a supported operation and do not activate the
  row underneath;
- existing queue badges still remove staged operations on click.

## Wave Exit Criteria

Wave A is not complete until:

- A0 through A3 focused tests pass;
- `pnpm run lint`, `pnpm run check`, `pnpm run build`, focused unit/component
  suites, and relevant Obsidian reload checks pass;
- tag and file context-menu actions can send operations to queue or a typed
  queueable handoff;
- prop/value rename no longer depends on `showInputModal` as the main user
  path;
- navbar gives visible queue/filter state without opening islands;
- user receives a slice completion update after each slice with the next slice
  named explicitly.

