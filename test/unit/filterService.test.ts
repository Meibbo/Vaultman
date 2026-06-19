import type { App, CachedMetadata, TFile, TFolder, Vault } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';

import { FilterService } from '../../src/services/serviceFilter';

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

function makeApp(
	markdownFiles: TFile[],
	allFiles: TFile[],
	frontmatterByPath: Record<string, Record<string, unknown>> = {},
): App {
	return {
		vault: {
			getMarkdownFiles: () => markdownFiles,
			getFiles: () => allFiles,
		},
		metadataCache: {
			getFileCache: (file: TFile) =>
				({
					frontmatter: frontmatterByPath[file.path] ?? {},
				}) as CachedMetadata,
		},
	} as unknown as App;
}

describe('FilterService vault-wide Files filtering', () => {
	it('keeps metadata filters markdown-scoped while Files can filter non-markdown extensions', () => {
		const md = makeFile('Data/Projects.md');
		const base = makeFile('Data/Projects.base');
		const service = new FilterService(makeApp([md], [md, base]));

		service.applyFilters();
		expect(service.filteredFiles.map((file) => file.path)).toEqual([
			'Data/Projects.md',
		]);
		expect(service.filteredVaultFiles.map((file) => file.path)).toEqual([
			'Data/Projects.md',
			'Data/Projects.base',
		]);

		service.setFileSearchRule('file_name', '.base');

		expect(service.filteredFiles.map((file) => file.path)).toEqual([]);
		expect(service.filteredVaultFiles.map((file) => file.path)).toEqual([
			'Data/Projects.base',
		]);
		expect(service.getFlatRules()).toEqual([
			{
				id: 'vaultman-search-file-name',
				rule: 'With extension',
				label: 'base',
				description: 'With extension: base',
				enabled: true,
			},
		]);
	});

	it('explains folder filters that only match non-note files', () => {
		const note = makeFile('Notes/Inbox.md');
		const image = makeFile('Screenshots/Capture.jpg');
		const service = new FilterService(makeApp([note], [note, image]));

		service.addNode({
			type: 'rule',
			filterType: 'folder',
			property: '',
			values: ['Screenshots'],
		});

		expect(service.filteredFiles.map((file) => file.path)).toEqual([]);
		expect(service.filteredVaultFiles.map((file) => file.path)).toEqual([
			'Screenshots/Capture.jpg',
		]);
		expect(service.getFlatRules()[0]).toMatchObject({
			rule: 'In folder',
			label: 'Screenshots',
			description: 'In folder: Screenshots',
			warning:
				'This folder filter matches only non-note files; note-scoped views show 0 files.',
		});
	});

	it('uses concise node labels for active filter rows', () => {
		const file = makeFile('People/Victoria.md');
		const service = new FilterService(
			makeApp([file], [file], {
				[file.path]: { Birthday: '1990-01-01', tags: ['person'] },
			}),
		);

		service.addNode({
			type: 'rule',
			filterType: 'has_property',
			property: 'Birthday',
			values: [],
		});
		service.addNode({
			type: 'rule',
			filterType: 'has_tag',
			property: '',
			values: ['#person'],
		});

		expect(
			service.getFlatRules().map((rule) => [rule.rule, rule.label]),
		).toEqual([
			['Has property', 'Birthday'],
			['Has tag', '#person'],
		]);
	});

	it('emits changed when the filter tree changes even if the file result list stays empty', () => {
		const first = makeFile('Notes/first.md');
		const second = makeFile('Notes/second.md');
		const service = new FilterService(
			makeApp([first, second], [first, second], {
				[first.path]: { status: 'done' },
				[second.path]: { status: 'done' },
			}),
		);
		const changed = vi.fn();
		service.on('changed', changed);

		service.addNode({
			type: 'rule',
			filterType: 'has_property',
			property: 'missing-one',
			values: [],
		});
		changed.mockClear();

		service.addNode({
			type: 'rule',
			filterType: 'has_property',
			property: 'missing-two',
			values: [],
		});

		expect(service.filteredFiles).toEqual([]);
		expect(service.getFlatRules()).toHaveLength(2);
		expect(changed).toHaveBeenCalledTimes(1);
	});

	it('applies content search matches as a visible active filter without changing the base search scope', () => {
		const first = makeFile('People/Birthday.md');
		const second = makeFile('People/Journal.md');
		const service = new FilterService(
			makeApp([first, second], [first, second], {
				[first.path]: { Birthday: '1990-01-01' },
				[second.path]: { Birthday: '1991-01-01' },
			}),
		);

		service.addNode({
			type: 'rule',
			filterType: 'has_property',
			property: 'Birthday',
			values: [],
		});
		const scopeSignatureBeforeContent =
			service.getContentSearchScopeSignature();
		service.setContentSearchRule('birthday', [first]);

		expect(service.filteredFiles.map((file) => file.path)).toEqual([
			'People/Birthday.md',
		]);
		expect(service.getContentSearchScopeSignature()).toBe(
			scopeSignatureBeforeContent,
		);
		expect(
			service.getFilesIgnoringContentSearch().map((file) => file.path),
		).toEqual(['People/Birthday.md', 'People/Journal.md']);
		expect(
			service.getFlatRules().map((rule) => [rule.rule, rule.label]),
		).toEqual([
			['Has property', 'Birthday'],
			['Content contains', 'birthday'],
		]);
	});

	it('uses active vault-wide filters as Content search candidates while ignoring only content search', () => {
		const note = makeFile('Projects/Alpha.md');
		const base = makeFile('Projects/Alpha.base');
		const other = makeFile('Projects/Beta.md');
		const service = new FilterService(
			makeApp([note, other], [note, base, other], {
				[note.path]: { project: 'alpha' },
				[base.path]: { project: 'alpha' },
				[other.path]: { project: 'beta' },
			}),
		);

		service.addNode({
			type: 'rule',
			filterType: 'specific_value',
			property: 'project',
			values: ['alpha'],
		});

		expect(
			service.getFilesIgnoringContentSearch(true).map((file) => file.path),
		).toEqual(['Projects/Alpha.md', 'Projects/Alpha.base']);

		service.setContentSearchRule('newes', [note]);

		expect(service.filteredVaultFiles.map((file) => file.path)).toEqual([
			'Projects/Alpha.md',
		]);
		expect(
			service.getFilesIgnoringContentSearch(true).map((file) => file.path),
		).toEqual(['Projects/Alpha.md', 'Projects/Alpha.base']);
	});

	it('projects multiple active folder filters as a union scope for the Files explorer', () => {
		const work = makeFile('Areas/Work/todo.md');
		const home = makeFile('Areas/Home/list.md');
		const archive = makeFile('Archive/old.md');
		const service = new FilterService(
			makeApp([work, home, archive], [work, home, archive]),
		);

		service.addNode({
			type: 'rule',
			filterType: 'folder',
			property: '',
			values: ['Areas/Work'],
		});
		service.addNode({
			type: 'rule',
			filterType: 'folder',
			property: '',
			values: ['Areas/Home'],
		});

		const activeFolders = service.activeFolderFilterPaths();
		expect(activeFolders).toEqual(['Areas/Work', 'Areas/Home']);
		expect(
			service
				.filteredVaultFilesForFolderScopes(activeFolders)
				.map((file) => file.path),
		).toEqual(['Areas/Home/list.md', 'Areas/Work/todo.md']);
		expect(
			service.filteredVaultFiles.map((file) => file.path),
		).not.toContain('Archive/old.md');
	});
});
