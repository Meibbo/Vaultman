import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OperationQueueService, serializeFile } from '../../../src/services/serviceQueue.svelte';
import {
	buildRenameHandoffChange,
	createFnRState,
	startPropRenameHandoff,
	updateRenameHandoffReplacement,
} from '../../../src/services/serviceFnR';
import {
	DELETE_PROP,
	NATIVE_RENAME_PROP,
	RENAME_FILE,
	MOVE_FILE,
	DELETE_FILE,
	FIND_REPLACE_CONTENT,
	APPLY_TEMPLATE,
	type PendingChange,
	type PropertyChange,
	type ContentChange,
	type FileChange,
	type TemplateChange,
	type TagChange,
} from '../../../src/types/typeOps';
import { mockApp, mockTFile, type CachedMetadata, type TFile } from '../../helpers/obsidian-mocks';

function buildPropChange(file: TFile, prop: string, value: string): PropertyChange {
	return {
		type: 'property',
		files: [file],
		action: 'set',
		details: `${prop}=${value}`,
		logicFunc: () => ({ [prop]: value }),
		customLogic: false,
		property: prop,
		value,
	};
}

function buildDeleteChange(file: TFile, prop: string): PendingChange {
	return {
		type: 'property',
		files: [file],
		action: 'delete',
		details: `delete ${prop}`,
		logicFunc: () => ({ [DELETE_PROP]: prop }),
		customLogic: false,
		property: prop,
	};
}

function buildRenameChange(file: TFile, newName: string): FileChange {
	return {
		type: 'file_rename',
		files: [file],
		action: 'rename',
		details: newName,
		newName,
		logicFunc: () => ({ [RENAME_FILE]: newName }),
	};
}

function buildMoveChange(file: TFile, folder: string): FileChange {
	return {
		type: 'file_move',
		files: [file],
		action: 'move',
		details: folder,
		targetFolder: folder,
		logicFunc: () => ({ [MOVE_FILE]: folder }),
	};
}

function buildContentReplaceChange(file: TFile): ContentChange {
	return {
		type: 'content_replace',
		files: [file],
		action: 'replace',
		details: 'foo→bar',
		find: 'foo',
		replace: 'bar',
		isRegex: false,
		caseSensitive: false,
		logicFunc: () => ({
			[FIND_REPLACE_CONTENT]: {
				pattern: 'foo',
				replacement: 'bar',
				isRegex: false,
				caseSensitive: false,
			},
		}),
	};
}

function buildTemplateChange(file: TFile, content: string): TemplateChange {
	return {
		type: 'template',
		files: [file],
		action: 'apply_template',
		details: 'tpl',
		templateFileStr: 't.md',
		templateContent: content,
		logicFunc: () => ({ [APPLY_TEMPLATE]: content }),
	};
}

function buildTagDeleteChange(file: TFile, tag: string): TagChange {
	return {
		type: 'tag',
		files: [file],
		action: 'delete',
		details: `delete ${tag}`,
		tag,
		logicFunc: (_file, metadata) => {
			const raw = metadata.tags;
			const tags = Array.isArray(raw) ? raw.map(String) : raw ? [String(raw)] : [];
			return { tags: tags.filter((item) => item !== tag) };
		},
		customLogic: true,
	};
}

function buildFileDeleteChange(file: TFile): FileChange {
	return {
		type: 'file_delete',
		files: [file],
		action: 'delete',
		details: `delete ${file.path}`,
		logicFunc: () => ({ [DELETE_FILE]: true }),
	};
}

function buildNativeRenamePropChange(
	file: TFile,
	oldName: string,
	newName: string,
): PropertyChange {
	return {
		type: 'property',
		files: [file],
		action: 'rename',
		details: `${oldName}→${newName}`,
		logicFunc: () => ({ [NATIVE_RENAME_PROP]: { oldName, newName } }),
		customLogic: true,
		property: oldName,
	};
}

function setupAppWithFile(content = '---\nstatus: draft\n---\nbody-line\n') {
	const file = mockTFile('a.md', { frontmatter: { status: 'draft' } });
	const adapterFiles = new Map([[file.path, content]]);
	const meta = new Map<string, CachedMetadata>([[file.path, { frontmatter: { status: 'draft' } }]]);
	const app = mockApp({ files: [file], metadata: meta, adapterFiles });
	const svc = new OperationQueueService(app);
	return { app, svc, file, adapterFiles };
}

beforeEach(() => {
	vi.useFakeTimers();
});

describe('serializeFile', () => {
	it('returns body alone when fm is empty', () => {
		expect(serializeFile({}, 'plain body')).toBe('plain body');
	});

	it('emits a YAML block for non-empty fm', () => {
		const out = serializeFile({ a: 1 }, 'body');
		expect(out.startsWith('---\n')).toBe(true);
		expect(out).toContain('a: 1');
		expect(out.endsWith('body')).toBe(true);
	});
});

describe('OperationQueueService.add (property set)', () => {
	it('collapses 2 set ops on the same file into one VFS with opCount=2', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.addAsync(buildPropChange(file, 'author', 'Alice'));
		await svc.addAsync(buildPropChange(file, 'version', '1.0'));
		expect(svc.fileCount).toBe(1);
		expect(svc.opCount).toBe(2);
		const tx = svc.getTransaction(file.path);
		expect(tx?.fm.author).toBe('Alice');
		expect(tx?.fm.version).toBe('1.0');
	});

	it('emits "changed" once per add (not silenced)', async () => {
		const { svc, file } = setupAppWithFile();
		const cb = vi.fn();
		svc.on('changed', cb);
		await svc.addAsync(buildPropChange(file, 'a', '1'));
		await svc.addAsync(buildPropChange(file, 'b', '2'));
		expect(cb).toHaveBeenCalledTimes(2);
	});

	it('does not read markdown body when enqueuing frontmatter-only changes', async () => {
		const { app, svc, file } = setupAppWithFile();
		const read = vi.spyOn(app.vault, 'read');

		await svc.addAsync(buildPropChange(file, 'author', 'Alice'));

		expect(read).not.toHaveBeenCalled();
		expect(svc.getTransaction(file.path)?.bodyLoaded).toBe(false);
		expect(svc.getTransaction(file.path)?.fm.author).toBe('Alice');
	});

	it('replaces transaction snapshots instead of mutating previous staged state', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.addAsync(buildPropChange(file, 'author', 'Alice'));
		const first = svc.getTransaction(file.path)!;
		const firstFm = first.fm;

		await svc.addAsync(buildPropChange(file, 'version', '1.0'));
		const second = svc.getTransaction(file.path)!;

		expect(second).not.toBe(first);
		expect(firstFm).toMatchObject({ status: 'draft', author: 'Alice' });
		expect(firstFm.version).toBeUndefined();
		expect(second.fm).toMatchObject({ status: 'draft', author: 'Alice', version: '1.0' });
	});
});

describe('OperationQueueService.addBatch', () => {
	it('emits "changed" exactly once for the whole batch', async () => {
		const { svc, file } = setupAppWithFile();
		const cb = vi.fn();
		svc.on('changed', cb);
		await svc.addBatch([
			buildPropChange(file, 'a', '1'),
			buildPropChange(file, 'b', '2'),
			buildPropChange(file, 'c', '3'),
		]);
		expect(cb).toHaveBeenCalledTimes(1);
		expect(svc.opCount).toBe(3);
	});

	it('returns early without emitting on empty batch', async () => {
		const { svc } = setupAppWithFile();
		const cb = vi.fn();
		svc.on('changed', cb);
		await svc.addBatch([]);
		expect(cb).not.toHaveBeenCalled();
	});

	it('distinguishes logical operation count from touched file operation count', async () => {
		const fileA = mockTFile('a.md', { frontmatter: { status: 'draft' } });
		const fileB = mockTFile('b.md', { frontmatter: { status: 'done' } });
		const meta = new Map<string, CachedMetadata>([
			[fileA.path, { frontmatter: { status: 'draft' } }],
			[fileB.path, { frontmatter: { status: 'done' } }],
		]);
		const app = mockApp({ files: [fileA, fileB], metadata: meta });
		const svc = new OperationQueueService(app);

		await svc.addAsync({
			type: 'property',
			files: [fileA, fileB],
			action: 'delete',
			details: 'delete status',
			logicFunc: () => ({ [DELETE_PROP]: 'status' }),
			customLogic: false,
			property: 'status',
		});

		expect(svc.opCount).toBe(2);
		expect(svc.logicalOpCount).toBe(1);
		expect(svc.size).toBe(1);
	});

	it('derives pending and legacy queue entries from staged transactions', async () => {
		const fileA = mockTFile('a.md', { frontmatter: { status: 'draft' } });
		const fileB = mockTFile('b.md', { frontmatter: { status: 'done' } });
		const meta = new Map<string, CachedMetadata>([
			[fileA.path, { frontmatter: { status: 'draft' } }],
			[fileB.path, { frontmatter: { status: 'done' } }],
		]);
		const app = mockApp({ files: [fileA, fileB], metadata: meta });
		const svc = new OperationQueueService(app);

		await svc.addAsync({
			id: 'delete-status',
			type: 'property',
			files: [fileA, fileB],
			action: 'delete',
			details: 'delete status',
			logicFunc: () => ({ [DELETE_PROP]: 'status' }),
			customLogic: false,
			property: 'status',
		});

		expect(svc.pending).toHaveLength(1);
		expect(svc.pending[0]).toMatchObject({
			id: 'delete-status',
			type: 'property',
			action: 'delete',
			details: 'delete status',
			property: 'status',
		});
		expect(svc.pending[0].files).toEqual([fileA, fileB]);
		expect(svc.queue.map((change) => change.id)).toEqual(['delete-status']);
	});
});

describe('OperationQueueService op kinds', () => {
	it('DELETE_PROP removes a key from fm', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.addAsync(buildDeleteChange(file, 'status'));
		expect(svc.getTransaction(file.path)?.fm.status).toBeUndefined();
	});

	it('RENAME_FILE sets newPath replacing the basename', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.addAsync(buildRenameChange(file, 'renamed.md'));
		expect(svc.getTransaction(file.path)?.newPath).toBe('renamed.md');
	});

	it('MOVE_FILE rewrites newPath under the target folder', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.addAsync(buildMoveChange(file, 'Archive'));
		expect(svc.getTransaction(file.path)?.newPath).toBe('Archive/a.md');
	});

	it('DELETE_FILE stages deletion without touching the vault immediately', async () => {
		const { app, svc, file } = setupAppWithFile();
		const trashFile = vi.spyOn(app.fileManager, 'trashFile');
		await svc.addAsync(buildFileDeleteChange(file));
		const tx = svc.getTransaction(file.path);

		expect(tx?.deleted).toBe(true);
		expect(tx?.ops[0].kind).toBe('delete_file');
		expect(trashFile).not.toHaveBeenCalled();
	});

	it('FIND_REPLACE_CONTENT mutates body', async () => {
		const { svc, file } = setupAppWithFile('---\nstatus: draft\n---\nfoo bar foo\n');
		await svc.addAsync(buildContentReplaceChange(file));
		expect(svc.getTransaction(file.path)?.body).toContain('bar bar bar');
	});

	it('APPLY_TEMPLATE appends to body', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.addAsync(buildTemplateChange(file, '## Appended'));
		expect(svc.getTransaction(file.path)?.body).toContain('## Appended');
	});

	it('classifies tag changes as tag staged ops', async () => {
		const file = mockTFile('tagged.md', { frontmatter: { tags: ['project', 'archive'] } });
		const meta = new Map<string, CachedMetadata>([
			[file.path, { frontmatter: { tags: ['project', 'archive'] } }],
		]);
		const app = mockApp({ files: [file], metadata: meta });
		const svc = new OperationQueueService(app);

		await svc.addAsync(buildTagDeleteChange(file, 'project'));

		const tx = svc.getTransaction(file.path);
		expect(tx?.ops[0].kind).toBe('delete_tag');
		expect(tx?.fm.tags).toEqual(['archive']);
	});

	it('NATIVE_RENAME_PROP expands only across scoped matching files', async () => {
		const fileA = mockTFile('a.md', { frontmatter: { status: 'draft' } });
		const fileB = mockTFile('b.md', { frontmatter: { status: 'done' } });
		const fileC = mockTFile('c.md', { frontmatter: { other: 'x' } });
		const adapterFiles = new Map<string, string>([
			[fileA.path, '---\nstatus: draft\n---\n'],
			[fileB.path, '---\nstatus: done\n---\n'],
			[fileC.path, '---\nother: x\n---\n'],
		]);
		const meta = new Map<string, CachedMetadata>([
			[fileA.path, { frontmatter: { status: 'draft' } }],
			[fileB.path, { frontmatter: { status: 'done' } }],
			[fileC.path, { frontmatter: { other: 'x' } }],
		]);
		const app = mockApp({ files: [fileA, fileB, fileC], metadata: meta, adapterFiles });
		const svc = new OperationQueueService(app);

		await svc.addAsync(buildNativeRenamePropChange(fileA, 'status', 'state'));

		const aTx = svc.getTransaction(fileA.path);
		const bTx = svc.getTransaction(fileB.path);
		const cTx = svc.getTransaction(fileC.path);
		expect(aTx?.fm.state).toBe('draft');
		expect(aTx?.fm.status).toBeUndefined();
		expect(bTx).toBeUndefined();
		expect(cTx).toBeUndefined();
	});

	it('queues prop rename handoff changes through native rename expansion', async () => {
		const fileA = mockTFile('a.md', { frontmatter: { status: 'draft' } });
		const fileB = mockTFile('b.md', { frontmatter: { status: 'done' } });
		const fileC = mockTFile('c.md', { frontmatter: { other: 'x' } });
		const meta = new Map<string, CachedMetadata>([
			[fileA.path, { frontmatter: { status: 'draft' } }],
			[fileB.path, { frontmatter: { status: 'done' } }],
			[fileC.path, { frontmatter: { other: 'x' } }],
		]);
		const app = mockApp({ files: [fileA, fileB, fileC], metadata: meta });
		const svc = new OperationQueueService(app);
		let state = startPropRenameHandoff(createFnRState(), {
			propName: 'status',
			files: [fileA, fileB],
			scope: 'filtered',
		});
		state = updateRenameHandoffReplacement(state, 'state');
		const change = buildRenameHandoffChange(state.rename);

		expect(change).toBeTruthy();
		await svc.addAsync(change!);

		expect(svc.getTransaction(fileA.path)?.fm).toMatchObject({ state: 'draft' });
		expect(svc.getTransaction(fileA.path)?.fm.status).toBeUndefined();
		expect(svc.getTransaction(fileB.path)?.fm).toMatchObject({ state: 'done' });
		expect(svc.getTransaction(fileB.path)?.fm.status).toBeUndefined();
		expect(svc.getTransaction(fileC.path)).toBeUndefined();
	});
});

describe('OperationQueueService.removeOp', () => {
	it('rebuilds VFS state from initial when an op is removed', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.addAsync(buildPropChange(file, 'x', '1'));
		await svc.addAsync(buildPropChange(file, 'y', '2'));
		const tx = svc.getTransaction(file.path)!;
		const firstOpId = tx.ops[0].id;
		svc.removeOp(file.path, firstOpId);

		const after = svc.getTransaction(file.path)!;
		expect('x' in after.fm).toBe(false);
		expect('y' in after.fm).toBe(true);
		expect(svc.opCount).toBe(1);
	});

	it('removeOp leaves the previous staged transaction snapshot unchanged', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.addAsync(buildPropChange(file, 'x', '1'));
		await svc.addAsync(buildPropChange(file, 'y', '2'));
		const before = svc.getTransaction(file.path)!;
		const beforeFm = before.fm;
		const firstOpId = before.ops[0].id;

		svc.removeOp(file.path, firstOpId);
		const after = svc.getTransaction(file.path)!;

		expect(after).not.toBe(before);
		expect(beforeFm).toMatchObject({ status: 'draft', x: '1', y: '2' });
		expect(after.fm).toMatchObject({ status: 'draft', y: '2' });
		expect(after.fm.x).toBeUndefined();
	});

	it('drops the entire VFS when the last op is removed', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.addAsync(buildPropChange(file, 'only', 'v'));
		const id = svc.getTransaction(file.path)!.ops[0].id;
		svc.removeOp(file.path, id);
		expect(svc.getTransaction(file.path)).toBeUndefined();
		expect(svc.fileCount).toBe(0);
	});

	it('is a no-op when opId is unknown', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.addAsync(buildPropChange(file, 'x', '1'));
		const before = svc.opCount;
		svc.removeOp(file.path, 'op-9999');
		expect(svc.opCount).toBe(before);
	});
});

describe('OperationQueueService.remove', () => {
	it('emits one changed event after removing an individual staged op by id', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.addAsync(buildPropChange(file, 'x', '1'));
		const id = svc.getTransaction(file.path)!.ops[0].id;
		const cb = vi.fn();
		svc.on('changed', cb);

		svc.remove(id);

		expect(svc.getTransaction(file.path)).toBeUndefined();
		expect(cb).toHaveBeenCalledTimes(1);
	});
});

describe('OperationQueueService.removeFile + clear + counters', () => {
	it('removeFile drops the file and emits changed', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.addAsync(buildPropChange(file, 'x', '1'));
		const cb = vi.fn();
		svc.on('changed', cb);
		svc.removeFile(file.path);
		expect(svc.fileCount).toBe(0);
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it('clear empties everything', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.addAsync(buildPropChange(file, 'x', '1'));
		svc.clear();
		expect(svc.isEmpty).toBe(true);
		expect(svc.fileCount).toBe(0);
		expect(svc.opCount).toBe(0);
	});
});

describe('OperationQueueService.simulateChanges', () => {
	it('returns a before/after snapshot for each pending file', async () => {
		const { svc, file } = setupAppWithFile();
		await svc.addAsync(buildPropChange(file, 'newProp', 'v'));
		const diff = svc.simulateChanges();
		const entry = diff.get(file.path);
		expect(entry?.before.status).toBe('draft');
		expect(entry?.after.newProp).toBe('v');
	});
});

describe('OperationQueueService.execute', () => {
	it('writes serialized fm + body via vault.process and clears the queue', async () => {
		const { svc, file, adapterFiles } = setupAppWithFile();
		await svc.addAsync(buildPropChange(file, 'reviewer', 'Bob'));
		const promise = svc.execute();
		await vi.runAllTimersAsync();
		const result = await promise;

		expect(result.success).toBe(1);
		expect(result.errors).toBe(0);
		expect(svc.isEmpty).toBe(true);
		const written = adapterFiles.get(file.path) ?? '';
		expect(written).toContain('reviewer: Bob');
		expect(written).toContain('body-line');
	});

	it('trashes queued file deletes only when the queue executes', async () => {
		const { app, svc, file } = setupAppWithFile();
		const process = vi.spyOn(app.vault, 'process');
		const trashFile = vi.spyOn(app.fileManager, 'trashFile');
		await svc.addAsync(buildFileDeleteChange(file));

		expect(trashFile).not.toHaveBeenCalled();

		const promise = svc.execute();
		await vi.runAllTimersAsync();
		const result = await promise;

		expect(result.success).toBe(1);
		expect(process).not.toHaveBeenCalled();
		expect(trashFile).toHaveBeenCalledWith(file);
		expect(svc.isEmpty).toBe(true);
	});
});
