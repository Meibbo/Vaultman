import { describe, expect, it } from 'vitest';
import type { TFile } from 'obsidian';

import {
	planCoreResultUpdate,
	toCoreSearchResult,
} from '../../src/logic/logicCoreResultDom';
import type { NativeSearchInput } from '../../src/services/serviceNativeSearchAdapter';

function file(path: string): TFile {
	const name = path.split('/').pop() ?? path;
	return {
		basename: name.replace(/\.md$/, ''),
		extension: 'md',
		name,
		parent: null,
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault: {} as TFile['vault'],
	} satisfies TFile;
}

function input(path: string, offsets: [number, number][]): NativeSearchInput {
	return { file: file(path), content: `content of ${path}`, offsets };
}

describe('translating our matches into core’s result shape', () => {
	it('hands core exactly the object its own matcher produces', () => {
		// Probed live on 1.12.3: a result item's `result` is `{ content: [[from,
		// to], ...] }` and nothing else. Our adapter already carries offsets in
		// that form, so this is a rename, not a transformation.
		expect(toCoreSearchResult(input('a.md', [[0, 4]]))).toEqual({
			content: [[0, 4]],
		});
	});

	it('keeps every match instead of the first three', () => {
		// `MAX_SNIPPETS = 3` was ours. Core shows every match in a file and
		// virtualises the rows, so the cap only ever hid results.
		const offsets: [number, number][] = Array.from({ length: 40 }, (_, i) => [
			i * 10,
			i * 10 + 4,
		]);
		expect(toCoreSearchResult(input('a.md', offsets)).content).toHaveLength(40);
	});
});

describe('planning an incremental update of core’s result DOM', () => {
	it('adds every file on the first pass', () => {
		const plan = planCoreResultUpdate([], [input('a.md', [[0, 4]])]);
		expect(plan.add.map((entry) => entry.file.path)).toEqual(['a.md']);
		expect(plan.remove).toEqual([]);
	});

	it('leaves an unchanged file alone so its collapse state survives', () => {
		// `addResult` replaces the item. Re-adding an untouched file would rebuild
		// its row on every poll — the expansion the user opened would snap shut,
		// and the scan publishes many polls per second.
		const previous = [input('a.md', [[0, 4]])];
		const plan = planCoreResultUpdate(previous, [input('a.md', [[0, 4]])]);
		expect(plan.add).toEqual([]);
		expect(plan.remove).toEqual([]);
	});

	it('re-adds a file whose matches grew', () => {
		const plan = planCoreResultUpdate(
			[input('a.md', [[0, 4]])],
			[
				input('a.md', [
					[0, 4],
					[9, 13],
				]),
			],
		);
		expect(plan.add.map((entry) => entry.file.path)).toEqual(['a.md']);
	});

	it('re-adds a file whose match positions moved', () => {
		// Same count, different offsets: the file was edited under a live search.
		const plan = planCoreResultUpdate(
			[input('a.md', [[0, 4]])],
			[input('a.md', [[7, 11]])],
		);
		expect(plan.add.map((entry) => entry.file.path)).toEqual(['a.md']);
	});

	it('removes a file that stopped matching', () => {
		const plan = planCoreResultUpdate(
			[input('a.md', [[0, 4]]), input('b.md', [[0, 4]])],
			[input('a.md', [[0, 4]])],
		);
		expect(plan.remove.map((f) => f.path)).toEqual(['b.md']);
		expect(plan.add).toEqual([]);
	});

	it('drops a file whose matches emptied rather than showing an empty row', () => {
		const plan = planCoreResultUpdate(
			[input('a.md', [[0, 4]])],
			[input('a.md', [])],
		);
		expect(plan.remove.map((f) => f.path)).toEqual(['a.md']);
		expect(plan.add).toEqual([]);
	});

	it('never asks core to add and remove the same file in one pass', () => {
		const plan = planCoreResultUpdate(
			[input('a.md', [[0, 4]]), input('b.md', [[0, 4]])],
			[input('a.md', [[0, 9]]), input('c.md', [[0, 4]])],
		);
		const added = new Set(plan.add.map((entry) => entry.file.path));
		for (const removed of plan.remove) {
			expect(added.has(removed.path)).toBe(false);
		}
		expect([...added].sort()).toEqual(['a.md', 'c.md']);
		expect(plan.remove.map((f) => f.path)).toEqual(['b.md']);
	});

	it('carries no cap of any kind', () => {
		// The whole point. `MAX_FILES = 200` was ours; core keeps the full set and
		// renders a window of it. Measured live: 737 files held with two rows in
		// the DOM.
		const many = Array.from({ length: 5000 }, (_, i) =>
			input(`f${i}.md`, [[0, 4]]),
		);
		expect(planCoreResultUpdate([], many).add).toHaveLength(5000);
	});
});
