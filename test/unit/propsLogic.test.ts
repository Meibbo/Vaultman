import type { App, CachedMetadata, TFile, TFolder, Vault } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { PropsLogic } from '../../src/logic/logicProps';

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

function makeFile(path: string): TFile {
	const name = path.split('/').pop() ?? path;
	const dot = name.lastIndexOf('.');
	return {
		basename: dot === -1 ? name : name.slice(0, dot),
		extension: dot === -1 ? '' : name.slice(dot + 1),
		name,
		parent: makeFolder(path.includes('/') ? path.split('/').slice(0, -1).join('/') : '/'),
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault,
	} satisfies TFile;
}

function makeApp(
	files: TFile[],
	frontmatterByPath: Record<string, Record<string, unknown>>,
	propertyInfos: Record<string, { type: string }> = {},
): App {
	return {
		vault: {
			getMarkdownFiles: () => files,
		},
		metadataCache: {
			getAllPropertyInfos: () => propertyInfos,
			getFileCache: (file: TFile) =>
				({
					frontmatter: frontmatterByPath[file.path] ?? {},
				}) as CachedMetadata,
		},
	} as unknown as App;
}

describe('PropsLogic', () => {
	it('shows the actual frontmatter property casing instead of lowercasing native index keys', () => {
		const file = makeFile('People/Victoria.md');
		const logic = new PropsLogic(
			makeApp(
				[file],
				{
					[file.path]: { Birthday: '1990-01-01' },
				},
				{
					birthday: { type: 'date' },
				},
			),
		);

		const tree = logic.getTree();

		expect(tree).toHaveLength(1);
		expect(tree[0].id).toBe('Birthday');
		expect(tree[0].label).toBe('Birthday');
		expect(tree[0].meta.propName).toBe('Birthday');
		expect(tree[0].meta.propType).toBe('date');
		expect(tree[0].count).toBe(1);
	});

	it('uses all property text as the default search mode', () => {
		const first = makeFile('Daily/one.md');
		const second = makeFile('Daily/two.md');
		const logic = new PropsLogic(
			makeApp([first, second], {
				[first.path]: { mood: 'journal' },
				[second.path]: { journalTopic: 'release' },
			}),
		);

		const results = logic.filterTree(logic.getTree(), 'journal', 0);

		expect(results.map((node) => node.label)).toEqual(['mood', 'journalTopic']);
		expect(results.find((node) => node.label === 'mood')?.children).toEqual([
			expect.objectContaining({ label: 'journal' }),
		]);
	});

	it('can scope property search to property names only', () => {
		const first = makeFile('Daily/one.md');
		const second = makeFile('Daily/two.md');
		const logic = new PropsLogic(
			makeApp([first, second], {
				[first.path]: { mood: 'journal' },
				[second.path]: { journalTopic: 'release' },
			}),
		);

		const results = logic.filterTree(logic.getTree(), 'journal', 1);

		expect(results.map((node) => node.label)).toEqual(['journalTopic']);
	});

	it('expands only ancestors needed to reveal descendant search matches', () => {
		const first = makeFile('Daily/one.md');
		const second = makeFile('Daily/two.md');
		const logic = new PropsLogic(
			makeApp([first, second], {
				[first.path]: { mood: 'journal' },
				[second.path]: { journalTopic: 'release' },
			}),
		);
		const tree = logic.getTree();

		expect(
			[...logic.expansionIdsForSearchMatches(tree, 'journalTopic', 0)],
		).toEqual([]);
		expect([...logic.expansionIdsForSearchMatches(tree, 'journal', 0)]).toEqual(
			['mood'],
		);
	});
});
