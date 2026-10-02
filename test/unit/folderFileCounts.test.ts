import { expect, it, vi } from 'vitest';
import { folderFileCounts } from '../../src/logic/logicFolderFileCounts';

it('does not allocate segment arrays while counting ancestor paths', () => {
	const split = vi.spyOn(String.prototype, 'split');
	folderFileCounts([{ path: 'a/b/c/file.md' }]);
	const calls = split.mock.calls.length;
	split.mockRestore();
	expect(calls).toBe(0);
});

it('counts each file in every ancestor without counting the vault root', () => {
	const files = [{ path: 'a/b/one.md' }, { path: 'a/b/two.md' },
		{ path: 'a/three.md' }, { path: 'a-sibling/four.md' }, { path: 'root.md' }];
	expect(folderFileCounts(files)).toEqual(new Map([
		['a/b', 2], ['a', 3], ['a-sibling', 1],
	]));
});

it('preserves deep and unicode folder paths and handles an empty input', () => {
	expect(folderFileCounts([{ path: '資料/子/孫/file.md' }])).toEqual(new Map([
		['資料/子/孫', 1], ['資料/子', 1], ['資料', 1],
	]));
	expect(folderFileCounts([])).toEqual(new Map());
});
