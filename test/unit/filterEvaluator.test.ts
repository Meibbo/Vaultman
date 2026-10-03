import type { TFile, TFolder, Vault } from 'obsidian';
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
	it('matches present-empty values without matching missing properties or literal placeholders', () => {
		// Given: the same empty representations counted by PropsLogic.
		const values = [null, '', [], [null], [''], false, 0, 'Empty', 'null'];
		const files = [...values.map((_, index) => makeFile(`empty-${index}.md`)), makeFile('missing.md')];
		// When: the explorer filters the raw Empty value, not its display text.
		const result = evalNode(
			{ type: 'rule', filterType: 'specific_value', property: 'example', values: [''] },
			files,
			(file) => ({ frontmatter: file.path === 'missing.md' ? {} : { example: values[Number(file.basename.slice(6))] } }),
		);
		// Then: only files with a present empty property match.
		expect([...result]).toEqual(['empty-0.md', 'empty-1.md', 'empty-2.md', 'empty-3.md', 'empty-4.md']);
	});

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
			() => ({ frontmatter: { Birthday: '1990-01-01' } }),
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
			() => ({ frontmatter: {} }),
		);

		expect([...result]).toEqual(['Data/Projects.base']);
	});

	it('matches root tag filters against nested descendant tags', () => {
		const files = [
			makeFile('Projects/Root.md'),
			makeFile('Projects/Child.md'),
			makeFile('Projects/Similar.md'),
			makeFile('Areas/Other.md'),
		];

		const result = evalNode(
			{
				type: 'rule',
				filterType: 'has_tag',
				property: '',
				values: ['#project'],
			},
			files,
			(file) =>
				({
					frontmatter: {
						tags:
							file.path === 'Projects/Root.md'
								? ['project']
								: file.path === 'Projects/Child.md'
									? ['project/client']
									: file.path === 'Projects/Similar.md'
										? ['projectile']
										: ['area/project'],
					},
				}),
		);

		expect([...result]).toEqual([
			'Projects/Root.md',
			'Projects/Child.md',
		]);
	});

	it('narrows all-group candidates after each rule instead of scanning the whole vault per rule', () => {
		const files = Array.from({ length: 100 }, (_, index) =>
			makeFile(`Notes/${index}.md`),
		);
		let metadataReads = 0;

		const result = evalNode(
			{
				type: 'group',
				logic: 'all',
				children: [
					{
						type: 'rule',
						filterType: 'has_property',
						property: 'first',
						values: [],
					},
					{
						type: 'rule',
						filterType: 'has_property',
						property: 'second',
						values: [],
					},
					{
						type: 'rule',
						filterType: 'specific_value',
						property: 'kind',
						values: ['keep'],
					},
				],
			},
			files,
			(file) => {
				metadataReads += 1;
				const index = Number(file.basename);
				return {
					frontmatter: {
						...(index < 10 ? { first: true } : {}),
						...(index < 5 ? { second: true } : {}),
						...(index < 2 ? { kind: 'keep' } : {}),
					},
				};
			},
		);

		expect([...result]).toEqual(['Notes/0.md', 'Notes/1.md']);
		expect(metadataReads).toBeLessThanOrEqual(files.length);
	});
});
