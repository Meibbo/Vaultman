import type { App, TFile, TFolder, Vault } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { FilesLogic } from '../../src/logic/logicsFiles';

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

	const file = {
		basename,
		extension: dot === -1 ? '' : fileName.slice(dot + 1),
		name: fileName,
		parent: makeFolder(parentPath),
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault,
	} satisfies TFile;
	return file;
}

function makeApp(
	frontmatterByPath: Record<string, Record<string, unknown>>,
): App {
	return {
		metadataCache: {
			getFileCache(file: TFile) {
				return { frontmatter: frontmatterByPath[file.path] ?? {} };
			},
		},
	} as App;
}

describe('FilesLogic.buildFileTree', () => {
	it('creates ancestor folders and keeps folders before files at every level', () => {
		const files = [
			makeFile('alpha/beta/deep.md'),
			makeFile('alpha/aa-file.md'),
			makeFile('alpha/root.md'),
			makeFile('z-root.md'),
		];
		const logic = new FilesLogic(
			makeApp({
				'alpha/root.md': { status: 'draft' },
				'alpha/beta/deep.md': { status: 'done', rating: 5 },
			}),
		);

		const tree = logic.buildFileTree(files);

		expect(tree.map((node) => node.label)).toEqual(['alpha', 'z-root']);
		expect(tree[0].children?.map((node) => node.label)).toEqual([
			'beta',
			'aa-file',
			'root',
		]);
		expect(tree[0].children?.[0].children?.map((node) => node.label)).toEqual([
			'deep',
		]);
		expect(tree[0].children?.[0].depth).toBe(1);
		expect(tree[0].children?.[0].children?.[0].depth).toBe(2);
		expect(tree[0].children?.[0].children?.[0].count).toBe(2);
	});

	it('preserves caller-provided file order within a folder while keeping folders first', () => {
		const files = [
			makeFile('alpha/zeta.md'),
			makeFile('alpha/beta/deep.md'),
			makeFile('alpha/alpha.md'),
			makeFile('alpha/middle.md'),
		];
		const logic = new FilesLogic(makeApp({}));

		const tree = logic.buildFileTree(files);

		expect(tree[0].children?.map((node) => node.label)).toEqual([
			'beta',
			'zeta',
			'alpha',
			'middle',
		]);
	});

	it('returns ancestor folder ids for matched files so search can reveal results', () => {
		const files = [
			makeFile('alpha/root.md'),
			makeFile('alpha/beta/deep.md'),
			makeFile('alpha/beta/gamma/nested.md'),
			makeFile('z-root.md'),
		];
		const logic = new FilesLogic(makeApp({}));

		expect(logic.getAncestorFolderIds(files)).toEqual([
			'folder:alpha',
			'folder:alpha/beta',
			'folder:alpha/beta/gamma',
		]);
	});

	it('can include empty vault folders without reading file contents', () => {
		const logic = new FilesLogic(makeApp({}));

		const tree = logic.buildFileTree(
			[makeFile('alpha/root.md')],
			[makeFolder('alpha/empty'), makeFolder('beta')],
		);

		expect(tree.map((node) => node.label)).toEqual(['alpha', 'beta']);
		expect(tree[0].children?.map((node) => node.label)).toEqual([
			'empty',
			'root',
		]);
		expect(tree[1]).toMatchObject({
			id: 'folder:beta',
			label: 'beta',
			icon: 'lucide-folder',
			showCaret: true,
			meta: { isFolder: true, folderPath: 'beta' },
		});
	});

	it('matches files by extension when filtering by file name', () => {
		const logic = new FilesLogic(makeApp({}));
		const files = [
			makeFile('Data/Projects.base'),
			makeFile('Data/Projects.md'),
			makeFile('Data/Notes.canvas'),
		];

		expect(
			logic.filterFlat(files, '.base', '').map((file) => file.path),
		).toEqual(['Data/Projects.base']);
	});

	it('exposes file extensions as tree type cell text', () => {
		const logic = new FilesLogic(makeApp({}));

		const tree = logic.buildFileTree([makeFile('Data/Projects.base')]);

		expect(tree[0].children?.[0]).toMatchObject({
			label: 'Projects',
			typeText: 'base',
		});
	});

	it('omits markdown extension text because markdown is the default note type', () => {
		const logic = new FilesLogic(makeApp({}));

		const tree = logic.buildFileTree([makeFile('Data/Projects.md')]);

		expect(tree[0].children?.[0]).toMatchObject({
			label: 'Projects',
			typeText: undefined,
		});
	});

	it('assigns extension-aware fallback icons to file nodes', () => {
		const logic = new FilesLogic(makeApp({}));

		const tree = logic.buildFileTree([
			makeFile('Data/Board.canvas'),
			makeFile('Data/Project.base'),
			makeFile('Data/Sketch.png'),
			makeFile('Data/Spec.pdf'),
			makeFile('Data/Unknown.xyz'),
		]);

		const iconsByLabel = new Map(
			tree[0].children?.map((node) => [node.label, node.icon]) ?? [],
		);
		expect(iconsByLabel.get('Board')).toBe('lucide-layout-dashboard');
		expect(iconsByLabel.get('Project')).toBe('lucide-database');
		expect(iconsByLabel.get('Sketch')).toBe('lucide-image');
		expect(iconsByLabel.get('Spec')).toBe('lucide-file-text');
		expect(iconsByLabel.get('Unknown')).toBe('lucide-file-question');
	});
});
