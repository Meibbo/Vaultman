import type { TFile, TFolder, Vault } from 'obsidian';
import { describe, expect, it } from 'vitest';

import {
	compareFilesForExplorer,
	normalizeExplorerSortBy,
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
		parent: makeFolder(path.includes('/') ? path.split('/').slice(0, -1).join('/') : '/'),
		path,
		stat: { ctime: stat.ctime, mtime: stat.mtime, size: stat.size ?? 0 },
		vault,
	} satisfies TFile;
}

describe('explorer sort helpers', () => {
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
});
