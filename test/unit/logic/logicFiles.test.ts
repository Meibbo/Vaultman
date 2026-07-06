import { describe, it, expect } from 'vitest';
import {
	buildFileTree,
	filterFlat,
	sortFileDescriptors,
	fileIconFor,
	fileCountLabelFor,
	isHiddenPath,
	type FileDescriptor,
} from '../../../src/logic/logicFiles';

function desc(
	path: string,
	overrides: Partial<FileDescriptor> = {},
): FileDescriptor {
	const segs = path.split('/');
	const name = segs[segs.length - 1];
	const dot = name.lastIndexOf('.');
	const extension = dot >= 0 ? name.slice(dot + 1) : '';
	const basename = dot >= 0 ? name.slice(0, dot) : name;
	const parentPath = segs.slice(0, -1).join('/');
	return {
		path,
		basename,
		extension,
		folderPath: parentPath,
		parentPath,
		mtime: 0,
		ctime: 0,
		propCount: 0,
		ref: { path },
		...overrides,
	};
}

describe('logicFiles.buildFileTree', () => {
	it('groups files under their parent folder nodes with namespaced ids', () => {
		const files = [desc('Notes/a.md'), desc('Notes/Sub/b.md'), desc('Other/c.md')];
		const tree = buildFileTree(files);

		const notes = tree.find((n) => n.id === 'folder.Notes');
		expect(notes).toBeDefined();
		expect(notes!.children?.some((n) => n.id === 'file.Notes/a.md')).toBe(true);
		const sub = notes!.children?.find((n) => n.id === 'folder.Notes/Sub');
		expect(sub?.children?.[0].id).toBe('file.Notes/Sub/b.md');

		const other = tree.find((n) => n.id === 'folder.Other');
		expect(other?.children?.[0].id).toBe('file.Other/c.md');
	});

	it('namespaced file ids round-trip the raw path in meta.file.path', () => {
		const tree = buildFileTree([desc('Notes/a.md')]);
		const fileNode = tree.find((n) => n.id === 'folder.Notes')?.children?.[0];
		expect(fileNode?.id).toBe('file.Notes/a.md');
		expect(fileNode?.meta.file?.path).toBe('Notes/a.md');
		expect(fileNode?.meta.isFolder).toBe(false);
	});

	it('count = supplied propCount; markdown only', () => {
		const tree = buildFileTree([
			desc('Notes/Sub/b.md', { propCount: 2 }),
			desc('Assets/img.png', { propCount: 5 }),
		]);
		const md = tree
			.find((n) => n.id === 'folder.Notes')
			?.children?.find((n) => n.id === 'folder.Notes/Sub')
			?.children?.find((n) => n.id === 'file.Notes/Sub/b.md');
		expect(md?.count).toBe(2);
		const png = tree
			.find((n) => n.id === 'folder.Assets')
			?.children?.find((n) => n.id === 'file.Assets/img.png');
		expect(png?.count).toBeUndefined();
		expect(png?.countLabel).toBe('png');
	});

	// SDF-003 regression: builder must preserve caller-provided sibling order.
	it('preserves caller file order inside a sibling group (SDF-003)', () => {
		// deliberately reverse-alphabetical caller order
		const files = [desc('Notes/zeta.md'), desc('Notes/alpha.md'), desc('Notes/mid.md')];
		const tree = buildFileTree(files);
		const notes = tree.find((n) => n.id === 'folder.Notes');
		expect(notes!.children?.map((n) => n.label)).toEqual(['zeta', 'alpha', 'mid']);
	});

	it('folders-first partitions without re-sorting file siblings', () => {
		const files = [
			desc('beta.md'),
			desc('alpha.md'),
			desc('Projects/p.md'),
			desc('Projects/zz/deep.md'),
		];
		const tree = buildFileTree(files, { foldersFirst: true });
		expect(tree.map((n) => n.id)).toEqual(['folder.Projects', 'file.beta.md', 'file.alpha.md']);
		const projects = tree.find((n) => n.id === 'folder.Projects');
		expect(projects?.children?.map((n) => n.id)).toEqual([
			'folder.Projects/zz',
			'file.Projects/p.md',
		]);
	});

	it('keeps natural order when folders-first is disabled', () => {
		const files = [desc('alpha.md'), desc('beta.md'), desc('Projects/p.md')];
		const tree = buildFileTree(files, { foldersFirst: false });
		expect(tree.map((n) => n.id)).toEqual(['file.alpha.md', 'file.beta.md', 'folder.Projects']);
	});

	it('creates missing ancestor folders with correct depth', () => {
		const tree = buildFileTree([desc('Root/Child/file.md')]);
		const root = tree.find((n) => n.id === 'folder.Root');
		const child = root?.children?.find((n) => n.id === 'folder.Root/Child');
		expect(root?.depth).toBe(0);
		expect(child?.depth).toBe(1);
		expect(child?.children?.[0]).toMatchObject({ id: 'file.Root/Child/file.md', depth: 2 });
	});

	it('tags structural nodes with the holarchy relation kind', () => {
		const tree = buildFileTree([desc('Notes/a.md')]);
		const folder = tree.find((n) => n.id === 'folder.Notes');
		expect(folder?.relation).toBe('holarchy');
		expect(folder?.children?.[0].relation).toBe('holarchy');
	});

	it('assigns extension-aware icons (image, base, canvas, unknown)', () => {
		const tree = buildFileTree([
			desc('cover.png'),
			desc('db.base'),
			desc('board.canvas'),
			desc('weird.xyz'),
		]);
		expect(tree.find((n) => n.id === 'file.cover.png')?.icon).toBe('lucide-image');
		expect(tree.find((n) => n.id === 'file.db.base')?.icon).toBe('lucide-database');
		expect(tree.find((n) => n.id === 'file.board.canvas')?.icon).toBe('lucide-layout-dashboard');
		expect(tree.find((n) => n.id === 'file.weird.xyz')?.icon).toBe('lucide-file-question');
	});
});

describe('logicFiles.filterFlat', () => {
	it('name filters basename, folder filters path', () => {
		const files = [desc('Notes/a.md'), desc('Notes/Sub/b.md'), desc('Other/c.md')];
		expect(filterFlat(files, 'a', '').map((f) => f.path)).toEqual(['Notes/a.md']);
		expect(filterFlat(files, '', 'Sub').map((f) => f.path)).toEqual(['Notes/Sub/b.md']);
		expect(filterFlat(files, '', '').length).toBe(3);
	});

	it('consumes precomputed lowercase search buffers by path', () => {
		const files = [desc('Notes/a.md'), desc('Notes/Sub/b.md')];
		const buffers = new Map(files.map((f) => [f.path, `${f.basename}\n${f.path}`.toLowerCase()]));
		expect(
			filterFlat(files, 'B', 'NOTES/SUB', (path) => buffers.get(path) ?? '').map((f) => f.path),
		).toEqual(['Notes/Sub/b.md']);
	});
});

describe('logicFiles.sortFileDescriptors', () => {
	it('sorts by name asc/desc using basename localeCompare', () => {
		const files = [desc('c.md'), desc('a.md'), desc('b.md')];
		expect(sortFileDescriptors(files, 'name', 'asc').map((f) => f.basename)).toEqual([
			'a',
			'b',
			'c',
		]);
		expect(sortFileDescriptors(files, 'name', 'desc').map((f) => f.basename)).toEqual([
			'c',
			'b',
			'a',
		]);
	});

	it('sorts by date using mtime (desc = newest first for asc per legacy)', () => {
		const files = [
			desc('old.md', { mtime: 1 }),
			desc('new.md', { mtime: 3 }),
			desc('mid.md', { mtime: 2 }),
		];
		// legacy comparator: asc dir multiplies (b.mtime - a.mtime) => newest first
		expect(sortFileDescriptors(files, 'date', 'asc').map((f) => f.basename)).toEqual([
			'new',
			'mid',
			'old',
		]);
	});

	it('sorts by count using supplied propCount', () => {
		const files = [
			desc('a.md', { propCount: 1 }),
			desc('b.md', { propCount: 3 }),
			desc('c.md', { propCount: 2 }),
		];
		expect(sortFileDescriptors(files, 'count', 'asc').map((f) => f.basename)).toEqual([
			'a',
			'c',
			'b',
		]);
	});

	it('does not mutate the input array', () => {
		const files = [desc('b.md'), desc('a.md')];
		const before = files.map((f) => f.path);
		sortFileDescriptors(files, 'name', 'asc');
		expect(files.map((f) => f.path)).toEqual(before);
	});
});

describe('logicFiles helpers', () => {
	it('fileCountLabelFor returns extension for non-md, undefined for md', () => {
		expect(fileCountLabelFor('md')).toBeUndefined();
		expect(fileCountLabelFor('pdf')).toBe('pdf');
		expect(fileCountLabelFor('')).toBeUndefined();
	});

	it('fileIconFor maps known extensions', () => {
		expect(fileIconFor('png')).toBe('lucide-image');
		expect(fileIconFor('md')).toBe('lucide-file-text');
		expect(fileIconFor('ts')).toBe('lucide-file-code');
	});

	it('isHiddenPath detects dot segments anywhere in the path', () => {
		expect(isHiddenPath('Notes/.draft.md')).toBe(true);
		expect(isHiddenPath('.vaultman/cache.md')).toBe(true);
		expect(isHiddenPath('Notes/a.md')).toBe(false);
	});
});
