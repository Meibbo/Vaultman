import type { TFile, TFolder, Vault } from 'obsidian';
import { describe, expect, it } from 'vitest';

import {
	changedItemsRemainOrdered,
	compareFilesForExplorer,
	DEFAULT_EXPLORER_SORT_DIR,
	nextExplorerSortDirection,
	normalizeExplorerSortBy,
	sortDirectionGlyph,
	sortDirectionIcon,
} from '../../src/logic/logicSort';

const vault = {} as Vault;

function makeFolder(path: string): TFolder {
	return {
		children: [],
		isRoot: () => path === '/',
		name: path.split('/').pop() ?? path,
		parent: null,
		path,
		vault,
	} satisfies TFolder;
}

function makeFile(
	path: string,
	stat: { ctime: number; mtime: number; size?: number },
): TFile {
	const name = path.split('/').pop() ?? path;
	const dot = name.lastIndexOf('.');
	return {
		basename: dot === -1 ? name : name.slice(0, dot),
		extension: dot === -1 ? '' : name.slice(dot + 1),
		name,
		parent: makeFolder(
			path.includes('/') ? path.split('/').slice(0, -1).join('/') : '/',
		),
		path,
		stat: { ctime: stat.ctime, mtime: stat.mtime, size: stat.size ?? 0 },
		vault,
	} satisfies TFile;
}

describe('explorer sort helpers', () => {
	it('defaults Remaining Tasks to descending, then toggles to ascending', () => {
		expect(DEFAULT_EXPLORER_SORT_DIR.tasks).toBe('desc');
		expect(nextExplorerSortDirection('name', 'asc', 'tasks')).toBe('desc');
		expect(nextExplorerSortDirection('tasks', 'desc', 'tasks')).toBe('asc');
	});

	it('defaults semantic State and Type sorts to their meaningful directions', () => {
		expect(DEFAULT_EXPLORER_SORT_DIR.state).toBe('desc');
		expect(DEFAULT_EXPLORER_SORT_DIR.type).toBe('asc');
	});

	it('maps semantic direction to the physical flow shown in every UI', () => {
		expect(sortDirectionGlyph('asc')).toBe('↓');
		expect(sortDirectionIcon('asc')).toBe('lucide-arrow-down');
		expect(sortDirectionGlyph('desc')).toBe('↑');
		expect(sortDirectionIcon('desc')).toBe('lucide-arrow-up');
	});

	it('migrates the legacy date sort id to modified time', () => {
		expect(normalizeExplorerSortBy('date')).toBe('mtime');
		expect(normalizeExplorerSortBy('ctime')).toBe('ctime');
	});

	it('sorts files by modified and created timestamps independently', () => {
		const oldCreatedNewModified = makeFile('Notes/a.md', {
			ctime: 10,
			mtime: 200,
		});
		const newCreatedOldModified = makeFile('Notes/b.md', {
			ctime: 100,
			mtime: 20,
		});

		expect(
			compareFilesForExplorer(
				oldCreatedNewModified,
				newCreatedOldModified,
				'mtime',
				'desc',
			),
		).toBeLessThan(0);
		expect(
			compareFilesForExplorer(
				oldCreatedNewModified,
				newCreatedOldModified,
				'ctime',
				'desc',
			),
		).toBeGreaterThan(0);
	});

	it('sorts files by cached word count with a stable path tie-breaker', () => {
		const short = makeFile('Notes/z-short.md', { ctime: 1, mtime: 1 });
		const longA = makeFile('Notes/a-long.md', { ctime: 1, mtime: 1 });
		const longB = makeFile('Notes/b-long.md', { ctime: 1, mtime: 1 });
		const words = new Map<TFile, number>([
			[short, 10],
			[longA, 200],
			[longB, 200],
		]);
		const sorted = [short, longB, longA].sort((a, b) =>
			compareFilesForExplorer(a, b, 'words', 'desc', {
				wordCountForFile: (file) => words.get(file),
			}),
		);

		expect(sorted.map((file) => file.path)).toEqual([
			'Notes/a-long.md',
			'Notes/b-long.md',
			'Notes/z-short.md',
		]);
	});

	it('sorts Name by file.name and Path by the complete file.path', () => {
		const txt = makeFile('A/note.txt', { ctime: 1, mtime: 1 });
		const markdown = makeFile('Z/note.md', { ctime: 1, mtime: 1 });
		const rootFile = makeFile('z.md', { ctime: 1, mtime: 1 });
		const nestedFile = makeFile('A/a.md', { ctime: 1, mtime: 1 });

		expect(
			[txt, markdown]
				.sort((a, b) => compareFilesForExplorer(a, b, 'name', 'asc'))
				.map((file) => file.path),
		).toEqual(['Z/note.md', 'A/note.txt']);
		expect(
			[rootFile, nestedFile]
				.sort((a, b) => compareFilesForExplorer(a, b, 'path', 'asc'))
				.map((file) => file.path),
		).toEqual(['A/a.md', 'z.md']);
	});

	it('detects whether refreshed sort keys cross an existing neighbor', () => {
		const items = [
			{ id: 'a', words: 30 },
			{ id: 'b', words: 20 },
			{ id: 'c', words: 10 },
		];
		const compare = (a: (typeof items)[number], b: (typeof items)[number]) =>
			b.words - a.words || a.id.localeCompare(b.id);

		items[1].words = 25;
		expect(
			changedItemsRemainOrdered(items, ['b'], (item) => item.id, compare),
		).toBe(true);

		items[1].words = 5;
		expect(
			changedItemsRemainOrdered(items, ['b'], (item) => item.id, compare),
		).toBe(false);
	});
});
