import type { TFile } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { prioritizeStatisticsFiles } from '../../src/logic/logicStatisticsPriority';

function file(path: string, mtime: number): TFile {
	const name = path.split('/').pop() ?? path;
	const dot = name.lastIndexOf('.');
	return {
		basename: dot === -1 ? name : name.slice(0, dot),
		extension: dot === -1 ? '' : name.slice(dot + 1),
		name,
		parent: null,
		path,
		stat: { ctime: mtime, mtime, size: 0 },
		vault: {} as TFile['vault'],
	} satisfies TFile;
}

describe('statistics indexing priority (BT5-003)', () => {
	it('puts visible paths first in their supplied order, then newest files', () => {
		const visibleFirst = file('Visible/first.md', 1);
		const visibleSecond = file('Visible/second.md', 2);
		const newest = file('Recent/newest.md', 300);
		const older = file('Recent/older.md', 200);

		expect(
			prioritizeStatisticsFiles(
				[older, visibleSecond, newest, visibleFirst],
				[visibleFirst.path, visibleSecond.path],
			).map((candidate) => candidate.path),
		).toEqual([
			visibleFirst.path,
			visibleSecond.path,
			newest.path,
			older.path,
		]);
	});

	it('uses path as a deterministic tie-breaker for equal mtimes', () => {
		expect(
			prioritizeStatisticsFiles(
				[file('z.md', 10), file('a.md', 10), file('m.md', 10)],
				[],
			).map((candidate) => candidate.path),
		).toEqual(['a.md', 'm.md', 'z.md']);
	});
});
