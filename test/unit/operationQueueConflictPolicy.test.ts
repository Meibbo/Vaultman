import { TFolder, type App, type TFile } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';

import { OperationQueueService } from '../../src/services/serviceOperationQueue';
import {
	APPLY_TEMPLATE,
	DELETE_FILE,
	DELETE_PROP,
	NATIVE_SET_PROP_TYPE,
	RENAME_FILE,
	type PendingChange,
} from '../../src/types/typeOps';

function makeFile(path: string): TFile {
	const name = path.split('/').pop() ?? path;
	const dot = name.lastIndexOf('.');
	const extension = dot >= 0 ? name.slice(dot + 1) : '';
	const basename = dot >= 0 ? name.slice(0, dot) : name;
	return {
		basename,
		extension,
		name,
		parent: null,
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault: {} as TFile['vault'],
	} satisfies TFile;
}

function makeFolder(path: string): TFolder {
	const name = path.split('/').pop() || path;
	const folder = new TFolder();
	Object.assign(folder, {
		children: [],
		isRoot: () => false,
		name,
		parent: null,
		path,
		vault: {} as TFolder['vault'],
	});
	return folder as TFolder;
}

function propertySet(files: TFile[], property: string, value: string): PendingChange {
	return {
		type: 'property',
		action: 'set',
		property,
		value,
		details: `Set ${property}`,
		files,
		customLogic: true,
		logicFunc: () => ({ [property]: value }),
	};
}

function propertyDelete(files: TFile[], property: string): PendingChange {
	return {
		type: 'property',
		action: 'delete',
		property,
		details: `Delete ${property}`,
		files,
		customLogic: true,
		logicFunc: () => ({ [DELETE_PROP]: property }),
	};
}

function propertyType(files: TFile[], property: string, type: string): PendingChange {
	return {
		type: 'property',
		action: 'change_type',
		property,
		value: type,
		details: `Change ${property} type`,
		files,
		customLogic: true,
		logicFunc: () => ({
			[NATIVE_SET_PROP_TYPE]: { propName: property, type },
		}),
	};
}

function tagChange(
	files: TFile[],
	tag: string,
	action: 'add' | 'delete' | 'rename',
	value?: string,
): PendingChange {
	return {
		type: 'tag',
		action,
		tag,
		value,
		details: `${action} ${tag}`,
		files,
		customLogic: true,
		logicFunc: () => ({ tags: [value ?? tag] }),
	} as PendingChange;
}

function fileRename(file: TFile, newName: string): PendingChange {
	return {
		type: 'file_rename',
		action: 'rename',
		newName,
		details: `Rename ${file.path}`,
		files: [file],
		logicFunc: () => ({ [RENAME_FILE]: newName }),
	};
}

function fileDelete(file: TFile): PendingChange {
	return {
		type: 'file_delete',
		action: 'delete',
		details: `Delete ${file.path}`,
		files: [file],
		logicFunc: () => ({ [DELETE_FILE]: true }),
	};
}

function templateApply(files: TFile[], templateFileStr: string): PendingChange {
	return {
		type: 'template',
		action: 'apply',
		templateFileStr,
		details: `Apply ${templateFileStr}`,
		files,
		logicFunc: () => ({ [APPLY_TEMPLATE]: templateFileStr }),
	};
}

describe('OperationQueueService conflict policy', () => {
	it('skips exact duplicate property operations', () => {
		const service = new OperationQueueService({} as App);
		const file = makeFile('a.md');
		let changes = 0;
		service.on('changed', () => {
			changes += 1;
		});

		service.add(propertySet([file], 'status', 'done'));
		service.add(propertySet([file], 'status', 'done'));

		expect(service.queue).toHaveLength(1);
		expect(changes).toBe(1);
	});

	it('merges partially overlapping duplicate operation targets', () => {
		const service = new OperationQueueService({} as App);
		const fileA = makeFile('a.md');
		const fileB = makeFile('b.md');
		const fileC = makeFile('c.md');

		service.add(propertySet([fileA, fileB], 'status', 'done'));
		service.add(propertySet([fileB, fileC], 'status', 'done'));

		expect(service.queue).toHaveLength(1);
		expect(service.queue[0].files.map((file) => file.path)).toEqual([
			'a.md',
			'b.md',
			'c.md',
		]);
	});

	it('blocks property operations that contradict a queued property operation on an overlapping file', () => {
		const service = new OperationQueueService({} as App);
		const fileA = makeFile('a.md');
		const fileB = makeFile('b.md');
		const fileC = makeFile('c.md');

		service.add(propertySet([fileA, fileB], 'status', 'done'));
		service.add(propertyDelete([fileB, fileC], 'status'));
		service.add(propertyType([fileB], 'status', 'checkbox'));

		expect(service.queue).toHaveLength(1);
		expect(service.queue[0].action).toBe('set');
	});

	it('blocks tag add/delete contradictions only when target files overlap', () => {
		const service = new OperationQueueService({} as App);
		const fileA = makeFile('a.md');
		const fileB = makeFile('b.md');

		service.add(tagChange([fileA], 'project', 'add'));
		service.add(tagChange([fileA], 'project', 'delete'));
		service.add(tagChange([fileB], 'project', 'delete'));

		expect(service.queue).toHaveLength(2);
		expect(service.queue.map((change) => change.action)).toEqual(['add', 'delete']);
	});

	it('skips duplicate file renames and blocks incompatible file path operations', () => {
		const service = new OperationQueueService({} as App);
		const file = makeFile('folder/a.md');

		service.add(fileRename(file, 'b.md'));
		service.add(fileRename(file, 'b.md'));
		service.add(fileRename(file, 'c.md'));
		service.add(fileDelete(file));

		expect(service.queue).toHaveLength(1);
		expect(service.queue[0]).toMatchObject({
			type: 'file_rename',
			newName: 'b.md',
		});
	});

	it('gates duplicate and contradictory action preset materialization in one batch', () => {
		const service = new OperationQueueService({} as App);
		const file = makeFile('a.md');

		service.addBatch([
			templateApply([file], 'Templates/base.md'),
			templateApply([file], 'Templates/base.md'),
			propertySet([file], 'status', 'done'),
			propertyDelete([file], 'status'),
		]);

		expect(service.queue).toHaveLength(2);
		expect(service.queue.map((change) => change.type)).toEqual([
			'template',
			'property',
		]);
	});

	it('blocks bypass execution when an immediate operation conflicts with the pending queue', () => {
		const processFrontMatter = vi.fn();
		const service = new OperationQueueService(
			{ fileManager: { processFrontMatter } } as unknown as App,
			{ bypassOperations: true },
		);
		const file = makeFile('a.md');

		service.setOperationMode('stage');
		service.add(propertySet([file], 'status', 'done'));
		service.setOperationMode('bypass');
		service.addOrRun(propertyDelete([file], 'status'));

		expect(service.queue).toHaveLength(1);
		expect(processFrontMatter).not.toHaveBeenCalled();
	});

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
});
