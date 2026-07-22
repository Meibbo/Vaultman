---
title: BT5 final stable audit plan — rich queued rename
type: implementation-plan-shard
status: active
lifecycle: active
parent: "[[index|Operation regressions]]"
created: 2026-07-22T15:45:00
updated: 2026-07-22T15:45:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/plan, initiative/polish, release/1.2.0, operations]
---

# BT5-060 rich queued rename

**Read first:** [[../../../issues/bt5-final-stable-audit/060-rich-rename-modal-regression|BT5-060]].

**Modify:**

- `src/modals/modalFileRename.ts`
- `src/logic/logicContentContextMenu.ts`
- `src/logic/logicSnippetContextMenu.ts`
- `src/i18n/en.ts`, `src/i18n/es.ts`
- `test/unit/contentContextMenu.test.ts`
- `test/unit/renameModalSource.test.ts`
- `test/unit/addonIcons.test.ts`

**Create if executable caller tests cannot isolate Obsidian DOM:** `src/logic/logicRenameOperation.ts`, `test/unit/renameOperation.test.ts`.

## 1. Red — initial pattern is explicit and testable

Test first:

```ts
expect(initialFileRenamePattern([{ basename: 'pepito' } as TFile])).toBe('pepito');
expect(initialFileRenamePattern([
	{ basename: 'one' } as TFile,
	{ basename: 'two' } as TFile,
])).toBe('{basename}');
```

Then add:

```ts
export function initialFileRenamePattern(files: readonly TFile[]): string {
	return files.length === 1 ? files[0].basename : '{basename}';
}
```

Run the missing-export failure before implementation:

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/renameModalSource.test.ts test/unit/renameOperation.test.ts
```

Initialize `FileRenameModal.pattern` from the target list; preserve placeholder, preview, extension and validation logic.

## 2. Red — Content uses rich modal and queue

Change `contentContextMenu.test.ts` so the fake plugin exposes `propertyIndex` and `queueService.addOrRun`. Mock/inject the modal seam. Assert:

```ts
expect(openRename).toHaveBeenCalledWith([ctx.file]);
expect(promptForFileRename).not.toHaveBeenCalled();
expect(promptForFileDeletion).toHaveBeenCalledWith(ctx.file);
```

Use a shared entry point:

```ts
export function openFileRenameOperation(
	plugin: Pick<VaultmanPlugin, 'app' | 'propertyIndex' | 'queueService'>,
	files: TFile[],
): void {
	new FileRenameModal(
		plugin.app,
		plugin.propertyIndex,
		files,
		(change) => plugin.queueService.addOrRun(change),
	).open();
}
```

Use it from Files, Content and Bases where practical. Delete only `promptForFileRename` from the Content interface; retain native deletion.

## 3. Red — Snippet Rename has no pre-Apply filesystem effect

Replace the source guard tolerating `_RENAME_FILE` extraction/direct `adapter.rename` with behavior: modal callback sends a pending change to `queueService.addOrRun`; in stage mode `adapter.rename` remains untouched until queue execution. Pending change targets `.css`, uses `action:'rename'`, produces the rename-style badge and refreshes snippets after Apply.

If the synthetic `TFile` cannot use the generic file runner safely, add:

```ts
export function buildSnippetRenameChange(
	oldPath: string,
	newPath: string,
	onApplied: () => void,
): PendingChange
```

Its queue executor, not the modal callback, owns `adapter.rename`. Keep bypass mode behavior consistent with `addOrRun`.

## 4. Gates and caller audit

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/contentContextMenu.test.ts test/unit/renameModalSource.test.ts test/unit/renameOperation.test.ts test/unit/addonIcons.test.ts test/unit/fileOperationPresentation.test.ts
pnpm run check
git diff --check
```

- [ ] Audit every `new FileRenameModal`, `showInputModal`, `_RENAME_FILE`, and `promptForFileRename` caller.
- [ ] Keep Save Layout and domain-specific folder/property/value prompts when they are not file-pattern operations.
- [ ] Preserve Tag inline rename plus queue.
- [ ] Runtime: Content/Snippet badge, cancel and Apply.
- [ ] Commit product paths only: `fix(operations): restore rich queued rename flows`.
