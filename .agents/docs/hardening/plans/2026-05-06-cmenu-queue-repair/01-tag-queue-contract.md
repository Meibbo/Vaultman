---
title: Tag queue contract
type: implementation-plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-06-cmenu-queue-repair/index|cmenu-queue-repair]]"
created: 2026-05-06T03:00:09
updated: 2026-05-06T03:18:00
tags:
  - agent/plan
  - initiative/hardening
  - explorer/tags
  - logic/queue
---

# Tag Queue Contract

## Red Tests

1. In `test/unit/components/explorerTags.test.ts`, add a test that obtains the
   registered `tag.rename` action and proves executing it is not a no-op. The
   action must either stage a queue change after receiving a new tag name or
   expose a deterministic rename handoff that can stage a queue change.
2. Keep the existing `tag.delete` tests green and add one assertion that delete
   still goes through `plugin.queueService.add`.
3. Add builder-level tests for frontmatter tag forms:
   - array tags keep unrelated tags and replace only the normalized old tag;
   - scalar tag values are coerced consistently with existing delete/add logic;
   - blank or unchanged rename targets produce no queued change;
   - renaming to a tag already present in one file coalesces that file's
     duplicate tags while still allowing other files to be renamed.

## Production Steps

1. Create a small tag queue builder module, likely
   `src/services/serviceTagQueue.ts`, to own reusable helpers currently private
   to `explorerTags.ts`:
   - `normalizeTag(value: string): string`;
   - `tagValues(raw: unknown): string[]`;
   - `tagListContains(raw: unknown, tagPath: string): boolean`;
   - `removeTagValue(raw: unknown, tagPath: string): string[]`;
   - `replaceTagValue(raw: unknown, oldTag: string, newTag: string):
     string[] | null`.
2. Add `buildTagAddChange`, `buildTagDeleteChange`, and
   `buildTagRenameChange` helpers that return `PendingChange | null`.
3. Refactor `explorerTags.handleNodeClick` add mode and `_deleteTag` to call
   the builders instead of duplicating tag array logic inline.
4. Implement `tag.rename` with the smallest queueable handoff that matches the
   existing UX:
   - A0 may use the existing `showInputModal` prompt if this keeps the user path
     functional and testable.
   - If inline tree editing is easier to preserve, wire the provider's
     `onRename`/`onCancelRename` through `panelExplorer.svelte` and keep the
     queue builder as the only place that creates the change.
5. Filter the target files using the same operation scope already used by tag
   delete, then narrow rename/delete to files whose cached frontmatter contains
   the old tag.

## Expected Result

The registered `tag.rename` context-menu action can stage a `PendingChange`
with `type: 'tag'`, `action: 'rename'`, and logic that replaces the old tag in
frontmatter `tags`. It is no longer a comment-only action.
