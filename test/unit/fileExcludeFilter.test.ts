import type { TFile, TFolder, Vault } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { evalNode } from '../../src/utils/filter-evaluator';
import {
	migrateExcludedPathsToFilter,
	purgeFilterPath,
	renameFilterPath,
} from '../../src/logic/logicExclusionFilter';
import type { FilterGroup } from '../../src/types/typeFilter';
import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import settingsSource from '../../src/VaultmanSettings.ts?raw';

const vault = {} as Vault;

function folder(path: string): TFolder {
	return {
		children: [],
		isRoot: () => path === '/',
		name: path === '/' ? '' : (path.split('/').pop() ?? path),
		parent: null,
		path,
		vault,
	} satisfies TFolder;
}

function file(path: string): TFile {
	const slash = path.lastIndexOf('/');
	const name = slash === -1 ? path : path.slice(slash + 1);
	const dot = name.lastIndexOf('.');
	return {
		basename: dot === -1 ? name : name.slice(0, dot),
		extension: dot === -1 ? '' : name.slice(dot + 1),
		name,
		parent: folder(slash === -1 ? '/' : path.slice(0, slash)),
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault,
	} satisfies TFile;
}

function group(children: FilterGroup['children'] = []): FilterGroup {
	return { type: 'group', logic: 'all', children, id: 'root', enabled: true };
}

const noMeta = () => null;

describe('BT5-009 file exclusion runs through the filter pipeline', () => {
	it('excludes exactly one path, never a substring neighbour', () => {
		const universe = [
			file('a/note.md'),
			file('a/note.md.backup'),
			file('b/note.md'),
		];
		const root = group([
			{
				type: 'rule',
				filterType: 'file_exclude',
				property: '',
				values: ['a/note.md'],
				id: 'x',
				enabled: true,
			},
		]);
		const matched = evalNode(root, universe, noMeta);
		expect(matched.has('a/note.md')).toBe(false);
		expect(matched.has('a/note.md.backup')).toBe(true);
		expect(matched.has('b/note.md')).toBe(true);
	});

	it('migrates the legacy persisted list into filter rules once', () => {
		const root = group();
		const migrated = migrateExcludedPathsToFilter(
			['a/note.md', 'b/old.md'],
			root,
		);
		expect(migrated).toBe(true);
		expect(
			root.children.map((node) =>
				node.type === 'rule' ? node.values[0] : null,
			),
		).toEqual(['a/note.md', 'b/old.md']);
		expect(
			root.children.every(
				(node) => node.type === 'rule' && node.filterType === 'file_exclude',
			),
		).toBe(true);

		// Idempotent: a path already present is not duplicated, and an empty
		// legacy list is a no-op.
		expect(migrateExcludedPathsToFilter(['a/note.md'], root)).toBe(false);
		expect(migrateExcludedPathsToFilter([], root)).toBe(false);
		expect(root.children).toHaveLength(2);
	});

	it('migrates the exclusion key on rename', () => {
		const root = group();
		migrateExcludedPathsToFilter(['a/note.md'], root);
		expect(renameFilterPath(root, 'a/note.md', 'a/renamed.md')).toBe(true);
		const values = root.children.map((n) =>
			n.type === 'rule' ? n.values[0] : null,
		);
		expect(values).toEqual(['a/renamed.md']);
		// A folder rename carries every excluded file beneath it.
		migrateExcludedPathsToFilter(['a/renamed.md', 'sub/deep.md'], root);
		expect(renameFilterPath(root, 'sub', 'moved')).toBe(true);
		expect(
			root.children.some(
				(n) => n.type === 'rule' && n.values[0] === 'moved/deep.md',
			),
		).toBe(true);
	});

	it('purges the exclusion on delete', () => {
		const root = group();
		migrateExcludedPathsToFilter(['a/note.md', 'keep.md'], root);
		expect(purgeFilterPath(root, 'a/note.md')).toBe(true);
		expect(
			root.children.map((n) => (n.type === 'rule' ? n.values[0] : null)),
		).toEqual(['keep.md']);
		// Deleting a folder purges every excluded file inside it.
		migrateExcludedPathsToFilter(['x/one.md', 'x/two.md'], root);
		expect(purgeFilterPath(root, 'x')).toBe(true);
		expect(
			root.children.some((n) => n.type === 'rule' && n.values[0] === 'keep.md'),
		).toBe(true);
		expect(
			root.children.some(
				(n) => n.type === 'rule' && String(n.values[0]).startsWith('x/'),
			),
		).toBe(false);
	});

	it('routes the exclude action through the filter service, not a render list', () => {
		expect(explorerFilesSource).toContain(
			"filterType: 'file_exclude'",
		);
		expect(explorerFilesSource).toContain('this.plugin.filterService.addNode({');
		// The parallel excluded-paths filter in the render path is gone; the only
		// remaining reference is the one-time migration that clears it.
		expect(explorerFilesSource).not.toContain(
			'const excluded = new Set(this.plugin.settings.excludedFilePaths',
		);
		expect(explorerFilesSource).toContain('_migrateLegacyExclusions()');
	});

	it('removes the excluded-files settings section', () => {
		expect(settingsSource).not.toContain('settings.excluded_files');
	});
});
