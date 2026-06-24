---
title: File queue contract
type: implementation-plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-06-cmenu-queue-repair/index|cmenu-queue-repair]]"
created: 2026-05-06T03:00:09
updated: 2026-05-06T03:18:00
tags:
  - agent/plan
  - initiative/hardening
  - explorer/files
  - logic/queue
---

# File Queue Contract

## Red Tests

1. In `test/unit/components/explorerFiles.test.ts`, prove `file.delete` does
   not call `plugin.app.fileManager.trashFile` directly from the context-menu
   action and instead stages queue-visible work.
2. Add builder-level tests for file rename and move so the modal and provider
   can be verified without opening Obsidian UI:
   - same filename or same folder returns no change;
   - rename returns `type: 'file_rename'` with `RENAME_FILE`;
   - move returns `type: 'file_move'` with `MOVE_FILE`.
3. Add queue-service tests only after a red file delete test proves the current
   queue cannot stage or commit deletion.

## Production Steps

1. Create a file queue builder module, likely
   `src/services/serviceFileQueue.ts`, with helpers:
   - `buildFileRenameChange(file: TFile, newName: string): PendingChange | null`;
   - `buildFileMoveChange(file: TFile, targetFolder: string): PendingChange | null`;
   - `buildFileDeleteChange(file: TFile): PendingChange`.
2. Refactor `modalFileRename.ts` and `modalFileMove.ts` so their private queue
   methods call these helpers. Preserve their previews and current visible UX.
3. Replace the direct `fileManager.trashFile` call in `explorerFiles.ts` with
   `queueService.add(buildFileDeleteChange(meta.file))`.
4. If `buildFileDeleteChange` needs a new special key, add the minimum
   queue-service contract:
   - `DELETE_FILE` constant in `src/types/typeOps.ts`;
   - `OpKind` entry `delete_file`;
   - `FileChange.type` entry `file_delete`;
   - `VirtualFileState.deleted?: boolean`;
   - `OperationQueueService.translateUpdate` maps `DELETE_FILE` to a staged op
     that marks the virtual file deleted;
   - `commitFile` trashes deleted files without rewriting file content first;
   - `indexOperations` maps staged `delete_file` to `file_delete`.
5. Keep the commit behavior conservative: deletion should happen only when the
   user applies the queue, never when the context menu item is clicked.

## Expected Result

File rename and move retain their modal UX but share testable builders. File
delete becomes a staged Vaultman operation instead of an immediate Obsidian
trash call.
