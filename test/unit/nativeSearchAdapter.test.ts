import type { TFile, TFolder, Vault } from 'obsidian';
import { describe, expect, it } from 'vitest';

import {
	buildNativeSearchPreview,
	findContentOffsets,
	toNativeSearchQuery,
} from '../../src/services/serviceNativeSearchAdapter';

const vault = {} as Vault;

function makeFolder(path: string): TFolder {
	const name = path === '/' ? '' : (path.split('/').pop() ?? path);
	return {
		children: [],
		isRoot: () => path === '/',
		name,
		parent: null,
		path,
		vault,
	} satisfies TFolder;
}

function makeFile(path: string): TFile {
	const lastSlash = path.lastIndexOf('/');
	const parentPath = lastSlash === -1 ? '/' : path.slice(0, lastSlash);
	const name = path.split('/').pop() ?? path;
	const basename = name.replace(/\.md$/, '');
	return {
		basename,
		extension: 'md',
		name,
		parent: makeFolder(parentPath),
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault,
	} satisfies TFile;
}

describe('Native search adapter helpers', () => {
	it('maps native offsets into content preview snippets', () => {
		const file = makeFile('notes/example.md');
		const content = 'first line\nstatus: done\nlast line';

		const preview = buildNativeSearchPreview([
			{
				file,
				content,
				offsets: [[11, 17]],
			},
		]);

		expect(preview.totalMatches).toBe(1);
		expect(preview.files[0].file).toBe(file);
		expect(preview.files[0].matchCount).toBe(1);
		expect(preview.files[0].snippets[0]).toMatchObject({
			match: 'status',
			line: 1,
			ch: 0,
		});
	});

	it('formats regex searches for native Obsidian search syntax', () => {
		expect(toNativeSearchQuery('status', false)).toBe('status');
		expect(toNativeSearchQuery('status: (done|draft)', true)).toBe(
			'/status: (done|draft)/',
		);
		expect(toNativeSearchQuery('/status/', true)).toBe('/status/');
	});

	it('keeps all matched files even when the preview is capped', () => {
		const inputs = Array.from({ length: 12 }, (_, index) => ({
			file: makeFile(`notes/${index}.md`),
			content: 'birthday',
			offsets: [[0, 8]] as [number, number][],
		}));

		const preview = buildNativeSearchPreview(inputs);

		expect(preview.files).toHaveLength(10);
		expect(preview.moreFiles).toBe(2);
		expect(preview.matchedFiles?.map((file) => file.path)).toHaveLength(12);
	});

	it('finds literal and regex content offsets for the public fallback search', () => {
		expect(findContentOffsets('Base base BASE', 'base', false, false)).toEqual([
			[0, 4],
			[5, 9],
			[10, 14],
		]);
		expect(findContentOffsets('tag-1 tag-20', 'tag-\\d+', true, true)).toEqual([
			[0, 5],
			[6, 12],
		]);
	});
});
