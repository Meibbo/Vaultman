import type { CachedMetadata, TFile, TFolder, Vault } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { evalNode } from '../../src/utils/filter-evaluator';

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
	const fileName = lastSlash === -1 ? path : path.slice(lastSlash + 1);
	const dot = fileName.lastIndexOf('.');
	const basename = dot === -1 ? fileName : fileName.slice(0, dot);

	return {
		basename,
		extension: dot === -1 ? '' : fileName.slice(dot + 1),
		name: fileName,
		parent: makeFolder(parentPath),
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault,
	} satisfies TFile;
}

describe('filter evaluator file rules', () => {
	it('matches property presence using the exact property casing supplied by the explorer', () => {
		const files = [makeFile('People/Victoria.md')];

		const result = evalNode(
			{
				type: 'rule',
				filterType: 'has_property',
				property: 'Birthday',
				values: [],
			},
			files,
			() => ({ frontmatter: { Birthday: '1990-01-01' } }) as CachedMetadata,
		);

		expect([...result]).toEqual(['People/Victoria.md']);
	});

	it('matches file_name rules against filename extensions and paths', () => {
		const files = [
			makeFile('Data/Projects.base'),
			makeFile('Data/Projects.md'),
			makeFile('Archive/Notes.canvas'),
		];

		const result = evalNode(
			{
				type: 'rule',
				filterType: 'file_name',
				property: '',
				values: ['.base'],
			},
			files,
			() => ({ frontmatter: {} }) as CachedMetadata,
		);

		expect([...result]).toEqual(['Data/Projects.base']);
	});
});
