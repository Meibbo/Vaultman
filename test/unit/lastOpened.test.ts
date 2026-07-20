import type { TFile, TFolder, Vault } from 'obsidian';
import { describe, expect, it } from 'vitest';

import {
	compareLastOpenedValues,
	lastOpenedAt,
	normalizeLastOpenedRecord,
	pruneMissingPaths,
	withDeletedPath,
	withFileOpened,
	withRenamedPath,
} from '../../src/logic/logicLastOpened';
import {
	DEFAULT_EXPLORER_SORT_DIR,
	compareFilesForExplorer,
} from '../../src/logic/logicSort';
import { SORT_MENU_OPTIONS } from '../../src/logic/logicSortMenu';
import { cellDef, cellsForExplorer } from '../../src/logic/logicCellRegistry';
import lastOpenedServiceSource from '../../src/services/serviceLastOpened.ts?raw';
import mainSource from '../../src/main.ts?raw';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';

const vault = {} as Vault;

function makeFolder(path: string): TFolder {
	return {
		children: [],
		isRoot: () => path === '/',
		name: path === '/' ? '' : (path.split('/').pop() ?? path),
		parent: null,
		path,
		vault,
	} satisfies TFolder;
}

function makeFile(path: string): TFile {
	const lastSlash = path.lastIndexOf('/');
	const fileName = lastSlash === -1 ? path : path.slice(lastSlash + 1);
	const dot = fileName.lastIndexOf('.');
	return {
		basename: dot === -1 ? fileName : fileName.slice(0, dot),
		extension: dot === -1 ? '' : fileName.slice(dot + 1),
		name: fileName,
		parent: makeFolder(lastSlash === -1 ? '/' : path.slice(0, lastSlash)),
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault,
	} satisfies TFile;
}

describe('BT5-013 last opened record', () => {
	it('keeps one timestamp per path instead of an event history', () => {
		let record = withFileOpened({}, 'a.md', 100);
		record = withFileOpened(record, 'a.md', 200);
		record = withFileOpened(record, 'a.md', 300);

		expect(Object.keys(record)).toEqual(['a.md']);
		expect(lastOpenedAt(record, 'a.md')).toBe(300);
	});

	it('records any file type and reports never-opened files as null', () => {
		const record = withFileOpened(
			withFileOpened({}, 'board.canvas', 10),
			'scan.pdf',
			20,
		);

		expect(lastOpenedAt(record, 'board.canvas')).toBe(10);
		expect(lastOpenedAt(record, 'scan.pdf')).toBe(20);
		expect(lastOpenedAt(record, 'never.md')).toBeNull();
	});

	it('ignores empty paths and non-positive timestamps', () => {
		expect(withFileOpened({}, '', 100)).toEqual({});
		expect(withFileOpened({}, 'a.md', 0)).toEqual({});
		expect(withFileOpened({}, 'a.md', Number.NaN)).toEqual({});
	});

	it('migrates the key on rename, including a renamed parent folder', () => {
		const record = withFileOpened(withFileOpened({}, 'old/a.md', 100), 'b.md', 5);

		const renamedFile = withRenamedPath(record, 'old/a.md', 'old/renamed.md');
		expect(lastOpenedAt(renamedFile, 'old/renamed.md')).toBe(100);
		expect(lastOpenedAt(renamedFile, 'old/a.md')).toBeNull();

		const renamedFolder = withRenamedPath(record, 'old', 'new');
		expect(lastOpenedAt(renamedFolder, 'new/a.md')).toBe(100);
		expect(lastOpenedAt(renamedFolder, 'old/a.md')).toBeNull();
		expect(lastOpenedAt(renamedFolder, 'b.md')).toBe(5);
	});

	it('purges the key on delete, including every file under a deleted folder', () => {
		const record = withFileOpened(
			withFileOpened({}, 'notes/a.md', 100),
			'notes.md',
			50,
		);

		const afterFile = withDeletedPath(record, 'notes/a.md');
		expect(lastOpenedAt(afterFile, 'notes/a.md')).toBeNull();

		const afterFolder = withDeletedPath(record, 'notes');
		expect(lastOpenedAt(afterFolder, 'notes/a.md')).toBeNull();
		// A sibling whose path merely starts with the folder name survives.
		expect(lastOpenedAt(afterFolder, 'notes.md')).toBe(50);
	});

	it('drops entries whose file no longer exists when the vault is known', () => {
		const record = withFileOpened(withFileOpened({}, 'a.md', 1), 'gone.md', 2);
		expect(pruneMissingPaths(record, new Set(['a.md']))).toEqual({ 'a.md': 1 });
	});

	it('reads persisted payloads defensively and keeps only path/timestamp', () => {
		expect(
			normalizeLastOpenedRecord({
				'a.md': 100,
				'b.md': '200',
				'c.md': -1,
				'': 300,
				'd.md': { at: 400 },
			}),
		).toEqual({ 'a.md': 100 });
		expect(normalizeLastOpenedRecord(null)).toEqual({});
		expect(normalizeLastOpenedRecord('nope')).toEqual({});
	});

	it('sorts most recent first by default and keeps never-opened deterministic', () => {
		expect(DEFAULT_EXPLORER_SORT_DIR.opened).toBe('desc');
		expect(compareLastOpenedValues(200, 100)).toBeGreaterThan(0);
		expect(compareLastOpenedValues(null, 100)).toBeLessThan(0);
		expect(compareLastOpenedValues(null, null)).toBe(0);

		const recent = makeFile('recent.md');
		const old = makeFile('old.md');
		const never = makeFile('never.md');
		const lastOpenedForFile = (file: TFile) =>
			({ 'recent.md': 200, 'old.md': 100 })[file.path] ?? null;

		const sorted = [never, old, recent].sort((a, b) =>
			compareFilesForExplorer(a, b, 'opened', 'desc', { lastOpenedForFile }),
		);
		expect(sorted.map((file) => file.path)).toEqual([
			'recent.md',
			'old.md',
			'never.md',
		]);
	});

	it('registers the cell and the sort option off by default', () => {
		expect(cellDef('opened')?.sortId).toBe('opened');
		expect(cellDef('opened')?.hoverId).toBe('opened');
		expect(
			cellsForExplorer('files', 'tree').map((definition) => definition.id),
		).toContain('opened');
		expect(
			cellDef('opened')?.supports.every((support) => !support.defaultOn),
		).toBe(true);
		expect(SORT_MENU_OPTIONS.files.map((option) => option.id)).toContain(
			'opened',
		);
	});

	it('coalesces writes and follows the vault lifecycle', () => {
		// One trailing write per burst, never a full settings save per event.
		expect(lastOpenedServiceSource).toContain('private _scheduleFlush()');
		expect(lastOpenedServiceSource).not.toContain('saveData(');
		expect(lastOpenedServiceSource).toContain('vault.adapter.write');
		expect(mainSource).toContain("workspace.on('file-open'");
		expect(mainSource).toContain("vault.on('rename'");
		expect(mainSource).toContain("vault.on('delete'");
		expect(explorerFilesSource).toContain('openedText');
	});
});
