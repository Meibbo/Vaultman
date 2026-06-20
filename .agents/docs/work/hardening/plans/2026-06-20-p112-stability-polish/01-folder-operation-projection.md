---
title: P112 Task 1 Folder Operation Projection
type: implementation-plan-task
status: active
lifecycle: active
parent: "[[docs/work/hardening/plans/2026-06-20-p112-stability-polish/index|P112 Stability Polish plan]]"
created: 2026-06-20T02:18:00
updated: 2026-06-20T02:18:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - vaultman/p112
  - vaultman/plan
---

# Task 1: Folder Operation Projection

**Files:**
- Modify: `src/components/containers/explorerFiles.ts`
- Modify: `src/services/serviceOperationQueue.ts`
- Modify: `src/logic/logicQueueWarnings.ts`
- Test: `test/unit/explorerFilesSource.test.ts`
- Test: `test/unit/queueWarnings.test.ts`
- Test: `test/unit/operationQueueConflictPolicy.test.ts`

- [ ] **Step 1: Add RED source guard for recursive folder delete payload**

In `test/unit/explorerFilesSource.test.ts`, extend the folder destructive action test:

```ts
expect(explorerFilesSource).toContain('const files = this._filesInsideFolder(folder);');
expect(explorerFilesSource).toContain('files,');
expect(explorerFilesSource).not.toContain('files: [],');
```

Run:

```powershell
corepack pnpm exec vitest run test/unit/explorerFilesSource.test.ts --config vitest.unit.config.mts
```

Expected: FAIL because `_queueFolderDelete` still stages `files: []`.

- [ ] **Step 2: Add RED queue warning tests for affected count and empty folder target**

In `test/unit/queueWarnings.test.ts`, replace the empty-folder expectation and add a recursive-folder count case:

```ts
it('keeps empty folder deletes valid while reporting zero affected files', () => {
	expect(warningsForQueuedChange({ type: 'file_delete', files: [], targetFolder: 'empty' }, 400)).toEqual([]);
});

it('uses recursive affected files as the folder delete warning count', () => {
	const files = Array.from({ length: 401 }, (_, index) => makeFile(`stress/${index}.md`));
	expect(warningsForQueuedChange({ type: 'file_delete', files, targetFolder: 'stress' }, 400)).toEqual([
		{ kind: 'large-target', severity: 'warning', targetCount: 401, threshold: 400 },
	]);
});
```

Run:

```powershell
corepack pnpm exec vitest run test/unit/queueWarnings.test.ts --config vitest.unit.config.mts
```

Expected: the new count case may pass already; the old special-case semantics should be reviewed before GREEN.

- [ ] **Step 3: Add RED operation queue test for non-empty folder delete executing once**

In `test/unit/operationQueueConflictPolicy.test.ts`, import `TFolder` and add helpers:

```ts
function makeFolder(path: string): TFolder {
	const name = path.split('/').pop() || path;
	return { children: [], isRoot: () => false, name, parent: null, path, vault: {} as TFolder['vault'] } satisfies TFolder;
}
```

Add test:

```ts
it('executes folder deletes through targetFolder even when affected files are present', async () => {
	const child = makeFile('folder/a.md');
	const folder = makeFolder('folder');
	const trashFile = vi.fn().mockResolvedValue(undefined);
	const app = {
		vault: { getAbstractFileByPath: vi.fn().mockReturnValue(folder) },
		fileManager: { trashFile },
	} as unknown as App;
	const service = new OperationQueueService(app);
	service.add({
		type: 'file_delete',
		action: 'delete',
		details: 'Delete folder "folder"',
		files: [child],
		targetFolder: 'folder',
		logicFunc: () => ({ [DELETE_FILE]: true }),
	});
	const result = await service.execute();
	expect(result).toMatchObject({ success: 1, errors: 0 });
	expect(trashFile).toHaveBeenCalledTimes(1);
	expect(trashFile).toHaveBeenCalledWith(folder);
});
```

Run:

```powershell
corepack pnpm exec vitest run test/unit/operationQueueConflictPolicy.test.ts --config vitest.unit.config.mts
```

Expected: FAIL because `isFolderDeleteChange` currently requires `change.files.length === 0`.

- [ ] **Step 4: Implement minimal folder payload and execution fix**

In `src/components/containers/explorerFiles.ts`, change `_queueFolderDelete` to:

```ts
private _queueFolderDelete(folder: TFolder): void {
	const files = this._filesInsideFolder(folder);
	this.plugin.queueService.addOrRun({
		type: 'file_delete',
		action: 'delete',
		details: `Delete folder "${folder.path}"`,
		files,
		targetFolder: folder.path,
		customLogic: true,
		logicFunc: () => ({ [DELETE_FILE]: true }),
	});
}
```

In `src/services/serviceOperationQueue.ts`, change `isFolderDeleteChange` so `targetFolder` is authoritative:

```ts
const targetFolder = (change as { targetFolder?: string }).targetFolder;
return (
	change.type === 'file_delete' &&
	typeof targetFolder === 'string' &&
	targetFolder.length > 0
);
```

In `src/logic/logicQueueWarnings.ts`, remove the `return 1` special case and keep empty folder targets valid:

```ts
if (change.type === 'file_delete' && change.targetFolder) return change.files.length;
```

Then keep `warningsForQueuedChange` from marking empty folder deletes as errors:

```ts
if (targetCount === 0) {
	if (change.type === 'file_delete' && change.targetFolder) return [];
	return [{ kind: 'empty-target', severity: 'error', targetCount }];
}
```

- [ ] **Step 5: Run focused GREEN gate**

```powershell
corepack pnpm exec vitest run test/unit/explorerFilesSource.test.ts test/unit/queueWarnings.test.ts test/unit/operationQueueConflictPolicy.test.ts --config vitest.unit.config.mts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/components/containers/explorerFiles.ts src/services/serviceOperationQueue.ts src/logic/logicQueueWarnings.ts test/unit/explorerFilesSource.test.ts test/unit/queueWarnings.test.ts test/unit/operationQueueConflictPolicy.test.ts
git commit -m "fix(queue): project folder delete affected files"
```
