import { describe, expect, it } from 'vitest';

import {
	bubbleMaxToFolders,
	buildFolderRecency,
	folderRecencyAt,
} from '../../src/logic/logicLastOpened';

describe('BT5-090 folder recency', () => {
	it('gives a folder the newest open beneath it', () => {
		const folders = buildFolderRecency({
			'a/b/c.md': 10,
			'a/b/d.md': 30,
			'a/e.md': 20,
		});
		expect(folderRecencyAt(folders, 'a/b')).toBe(30);
		// `a` owns the whole subtree, so it takes the maximum of everything.
		expect(folderRecencyAt(folders, 'a')).toBe(30);
	});

	it('bubbles a single open up every ancestor', () => {
		const folders = buildFolderRecency({ 'a/b/c/d.md': 42 });
		expect(folderRecencyAt(folders, 'a/b/c')).toBe(42);
		expect(folderRecencyAt(folders, 'a/b')).toBe(42);
		expect(folderRecencyAt(folders, 'a')).toBe(42);
	});

	it('leaves an unopened branch absent, which reads as never opened', () => {
		const folders = buildFolderRecency({ 'a/b.md': 5 });
		expect(folderRecencyAt(folders, 'other')).toBeNull();
	});

	it('never records the vault root as a folder', () => {
		const folders = buildFolderRecency({ 'root-note.md': 5, 'a/b.md': 7 });
		expect(folders.has('')).toBe(false);
		expect(folderRecencyAt(folders, 'a')).toBe(7);
	});

	it('keeps the maximum regardless of insertion order', () => {
		const older = buildFolderRecency({ 'a/x.md': 9, 'a/y.md': 1 });
		const newer = buildFolderRecency({ 'a/y.md': 1, 'a/x.md': 9 });
		expect(folderRecencyAt(older, 'a')).toBe(9);
		expect(folderRecencyAt(newer, 'a')).toBe(9);
	});

	it('ignores corrupt timestamps', () => {
		const folders = buildFolderRecency({
			'a/b.md': Number.NaN,
			'a/c.md': 12,
		});
		expect(folderRecencyAt(folders, 'a')).toBe(12);
	});

	it('reuses the same bubbling for any per-file value, such as mtime', () => {
		// The recency sort's tie-break is a folder's newest descendant mtime,
		// built by the same climb from a different value source.
		const folders = bubbleMaxToFolders([
			['a/b/c.md', 100],
			['a/d.md', 400],
		]);
		expect(folders.get('a/b')).toBe(100);
		expect(folders.get('a')).toBe(400);
	});
});
