---
title: SDF-015 Queue duplicate and contradictory operation guards
type: issue
issue_id: SDF-015
status: completed
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T09:52:29
updated: 2026-06-06T12:20:12
labels:
  - completed
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - queue
  - operations/safety
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-015 Queue Duplicate And Contradictory Operation Guards

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Prevent Vaultman from staging several operations on the same target/mode that are duplicated,
impossible, or contradictory. Start by inspecting sandbox because that stream already repaired several
of these queue edge cases; then port the smallest stable-compatible behavior.

## Acceptance Criteria

- [x] Research the sandbox implementation before coding and document which queue edge cases were already
      solved there.
- [x] Define stable conflict keys for queued operations: target file(s), operation type, property/tag/path
      subject, mode/action, and value where relevant.
- [x] Duplicate operations on the same target and same mode are ignored, merged, or replaced by one
      deterministic operation instead of being staged repeatedly.
- [x] Contradictory operations are blocked or resolved deterministically, for example add/remove the same
      tag, set/change/delete the same property, or duplicate rename/move operations against the same file.
- [x] User feedback makes the resolution explicit: skipped duplicate, merged operation, replaced prior
      operation, or blocked contradiction.
- [x] Queue templates/action presets cannot materialize duplicated or contradictory operations when applied.
- [x] Bypass mode still goes through the same conflict policy before running operations immediately.
- [x] Unit tests cover duplicate detection, contradiction detection, template materialization, and bypass
      behavior.
- [x] `plugin-dev` smoke covers at least one duplicate and one contradiction from the explorer UI or queue
      island, with `dev:errors` clean.

## Blocked By

None - can start immediately, but it must begin with sandbox comparison.

## Notes

This issue is separate from the bulk-target warning work. Bulk warning protects target size; this issue
protects queue semantic consistency.

## Sandbox Research

`origin/sandbox` does not contain stable's `src/services/serviceOperationQueue.ts`. Its queue is
`src/services/serviceQueue.svelte.ts`, backed by per-file transactions/VFS, derived `pending` and
`queue` snapshots, `removeOp`, `dropForNode`, and `requestDelete`. Sandbox also has small builders:

- `src/services/serviceFileQueue.ts`: rename/move/delete builders avoid no-op rename/move and stage
  delete rather than trashing immediately.
- `src/services/serviceTagQueue.ts`: tag add/delete/rename builders normalize by stripping `#`,
  avoid blank/unchanged rename targets, and coalesce duplicate tag targets during rename.
- `test/unit/services/serviceQueueDeletePurge.test.ts`: delete conflicts are node-bound; the modal can
  drop conflicting rename/set/filter descriptors before enqueueing delete, and fails closed if no UI
  opener exists.
- `test/unit/services/serviceQueueRace.test.ts`: body-loading operations share a hydration lock so two
  concurrent adds against the same file do not duplicate VFS state.

Stable is not ready to port the full sandbox VFS transaction model in this release wave. The smallest
stable-compatible port is a semantic gate around the existing `PendingChange[]` queue.

## Implemented Stable Policy

Product file: `src/services/serviceOperationQueue.ts`.

- Operation identity is `(type, action, subject, payload)`:
  - property subject is the exact property name, without lowercasing;
  - tag subject strips one leading `#`, matching sandbox, without lowercasing;
  - property/tag/file/content/template payloads include the value, target path/value, or serialized
    details needed to distinguish rename/type/search/template intent.
- `add()` gates a single operation:
  - exact duplicate already fully covered by an existing queued op is skipped;
  - same operation with missing target files merges those targets into the existing op;
  - contradictory operation on any overlapping target file is blocked.
- `addBatch()` applies the same policy sequentially and emits one summarized `Notice`, so queue
  templates/action presets cannot materialize repeated or contradictory operations.
- `addOrRun()` applies the same policy before bypass execution. If the immediate operation conflicts
  with pending staged work, it is not run.
- Feedback uses i18n keys:
  - `queue.guard.duplicate`;
  - `queue.guard.merged`;
  - `queue.guard.conflict`;
  - `queue.guard.batch`.

Conservative conflict rules:

- Property: delete, clean-empty, rename, or change-type conflicts with any other non-identical
  operation on the same property and overlapping files. Set/add operations on the same property
  conflict only when their payload differs.
- Tag: add/delete/rename operations on the same tag conflict when actions are non-identical and files
  overlap.
- File: duplicate renames/moves are skipped or merged; incompatible rename/move operations on the same
  file are blocked; file delete conflicts with any operation on the same file.
- Content replace and template apply only dedupe/merge exact identical operations; different
  content/template operations remain sequentially allowed.

## Verification

- RED: `pnpm exec vitest run --config vitest.unit.config.mts test/unit/operationQueueConflictPolicy.test.ts`
  failed all 7 tests against the old push-only service.
- GREEN: same focused command passed 7/7 tests after the policy.
- Focused regression: `pnpm exec vitest run --config vitest.unit.config.mts test/unit/operationQueueMode.test.ts test/unit/queueTemplates.test.ts test/unit/operationQueueConflictPolicy.test.ts`
  passed 3 files / 15 tests.
- Type gate: `pnpm run check` passed with 0 Svelte/TS errors and 0 warnings.
- Full local gate: `pnpm run verify` passed with 19 unit files / 66 tests and scorecard 17 checks.
- Build sync: `node scripts/sync-test-build.mjs` synced artifacts to `dist/build` and
  `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`.
- Runtime reload: `obsidian vault=plugin-dev plugin:reload id=vaultman` passed; `vaultman:open`
  command executed after reload.
- Runtime smoke: `obsidian vault=plugin-dev eval ...` created dummy queued operations without applying
  them. Result:
  - property duplicate was skipped;
  - property partial duplicate merged from one file to two files;
  - property delete contradiction was blocked;
  - tag add/delete contradiction on the same file was blocked;
  - tag delete on a non-overlapping file remained allowed;
  - bypass conflict did not call `processFrontMatter` (`processCalls: 0`);
  - queue was cleared after the smoke (`afterClear: 0`).
- Final `obsidian vault=plugin-dev dev:errors` returned `No errors captured`.
- `obsidian vault=plugin-dev dev:console level=error` could not report because the debugger was not
  attached; this is not a product error and `dev:errors` was clean.
