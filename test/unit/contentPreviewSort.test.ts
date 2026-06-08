import type { TFile } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { sortContentPreviewFiles } from '../../src/logic/logicContentPreview';
import type { ContentPreviewResult } from '../../src/types/typeUI';

function makeEntry(
	path: string,
	matchCount: number,
	stat: { mtime: number; ctime: number },
): ContentPreviewResult['files'][number] {
	const name = path.split('/').pop() ?? path;
	return {
		file: {
			basename: name.replace(/\.md$/, ''),
			extension: 'md',
			name,
			parent: null,
			path,
			stat: { ...stat, size: 0 },
			vault: {} as TFile['vault'],
		} satisfies TFile,
		matchCount,
		snippets: [],
	};
}

describe('sortContentPreviewFiles', () => {
	const entries = [
		makeEntry('z.md', 2, { mtime: 20, ctime: 1 }),
		makeEntry('a.md', 5, { mtime: 10, ctime: 3 }),
		makeEntry('m.md', 1, { mtime: 30, ctime: 2 }),
	];

	it('sorts content results by occurrence count', () => {
		expect(
			sortContentPreviewFiles(entries, 'count', 'desc').map(
				(entry) => entry.file.path,
			),
		).toEqual(['a.md', 'z.md', 'm.md']);
	});

	it('sorts content results by file name and timestamps', () => {
		expect(
			sortContentPreviewFiles(entries, 'name', 'asc').map(
				(entry) => entry.file.path,
			),
		).toEqual(['a.md', 'm.md', 'z.md']);
		expect(
			sortContentPreviewFiles(entries, 'mtime', 'asc').map(
				(entry) => entry.file.path,
			),
		).toEqual(['a.md', 'z.md', 'm.md']);
		expect(
			sortContentPreviewFiles(entries, 'ctime', 'desc').map(
				(entry) => entry.file.path,
			),
		).toEqual(['a.md', 'm.md', 'z.md']);
	});
});
