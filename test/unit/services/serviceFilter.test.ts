import { describe, it, expect } from 'vitest';
import { FilterService } from '../../../src/services/serviceFilter.svelte';
import type { FilterRule, FilterTemplate } from '../../../src/types/typeFilter';
import type { IFilesIndex } from '../../../src/types/typeContracts';
import { mockApp, mockTFile, type CachedMetadata } from '../../helpers/obsidian-mocks';

function makeIdx(files: ReturnType<typeof mockTFile>[]): IFilesIndex {
	return {
		get nodes() {
			return files.map((f) => ({ id: f.path, path: f.path, basename: f.basename, file: f }));
		},
		get flatIds() {
			return files.map((f) => f.path);
		},
		get revision() {
			return 1;
		},
		refresh: async () => {},
		subscribe: () => () => {},
		byId: (id) => {
			const f = files.find((x) => x.path === id);
			return f ? { id: f.path, path: f.path, basename: f.basename, file: f } : undefined;
		},
		getSearchBuffer: (id) => {
			const f = files.find((x) => x.path === id);
			return f ? `${f.basename}\n${f.path}\n${f.extension ?? ''}`.toLowerCase() : '';
		},
	};
}

function setup() {
	const a = mockTFile('Notes/a.md', { frontmatter: { status: 'draft', tags: ['idea'] } });
	const b = mockTFile('Notes/b.md', { frontmatter: { status: 'done' } });
	const c = mockTFile('Archive/c.md', { frontmatter: {} });
	const meta = new Map<string, CachedMetadata>([
		[a.path, { frontmatter: { status: 'draft', tags: ['idea'] } }],
		[b.path, { frontmatter: { status: 'done' } }],
		[c.path, { frontmatter: {} }],
	]);
	const app = mockApp({ files: [a, b, c], metadata: meta });
	const svc = new FilterService(app, makeIdx([a, b, c]));
	return { app, svc, a, b, c };
}

const draftRule: FilterRule = {
	type: 'rule',
	filterType: 'specific_value',
	property: 'status',
	values: ['draft'],
	id: 'r1',
	enabled: true,
};

describe('FilterService.applyFilters', () => {
	it('with empty tree returns all markdown files sorted by basename', () => {
		const { svc, a, b, c } = setup();
		const paths = svc.filteredFiles.map((f) => f.path);
		expect(paths.sort()).toEqual([a.path, b.path, c.path].sort());
	});

	it('addNode triggers re-evaluation', () => {
		const { svc, a } = setup();
		svc.addNode({ ...draftRule });
		expect(svc.filteredFiles.map((f) => f.path)).toEqual([a.path]);
	});

	it('search-name AND-combines with the active filter tree', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.setSearchFilter('zzz', '');
		expect(svc.filteredFiles).toHaveLength(0);
	});

	it('search-folder AND-combines on parent path', () => {
		const { svc, c } = setup();
		svc.setSearchFilter('', 'Archive');
		expect(svc.filteredFiles).toEqual([c]);
	});
});

describe('FilterService node mutation helpers', () => {
	it('starts and clears with an and root group', () => {
		const { svc } = setup();

		expect(svc.activeFilter.logic).toBe('and');

		svc.addNode({ ...draftRule });
		svc.clearFilters();

		expect(svc.activeFilter).toEqual(
			expect.objectContaining({
				type: 'group',
				logic: 'and',
				id: 'root',
				children: [],
				enabled: true,
			}),
		);
	});

	it('removeNodeByProperty removes has_property rule', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule, filterType: 'has_property' } as FilterRule);
		svc.removeNodeByProperty('status');
		expect(svc.activeFilter.children).toHaveLength(0);
	});

	it('removeNodeByProperty(value) removes specific_value rule', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.removeNodeByProperty('status', 'draft');
		expect(svc.activeFilter.children).toHaveLength(0);
	});

	it('removeNodeByTag removes has_tag rule', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule, filterType: 'has_tag', values: ['idea'] } as FilterRule);
		svc.removeNodeByTag('idea');
		expect(svc.activeFilter.children).toHaveLength(0);
	});

	it('toggleFilterRule flips enabled and re-evaluates', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.toggleFilterRule('r1');
		expect(svc.filteredFiles.length).toBe(3);
	});

	it('deleteFilterRule removes rule by id', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.deleteFilterRule('r1');
		expect(svc.activeFilter.children).toHaveLength(0);
	});

	it('sets a replaceable selected-files filter group with exact file children', () => {
		const { svc, a, b, c } = setup();
		const selectedSvc = svc as FilterService & {
			setSelectedFileFilter(files: Array<typeof a>): void;
		};

		selectedSvc.setSelectedFileFilter([a, b]);

		expect(svc.selectedFiles).toEqual([a, b]);
		expect(svc.filteredFiles.map((file) => file.path).sort()).toEqual([a.path, b.path].sort());
		expect(svc.activeFilter.children).toContainEqual(
			expect.objectContaining({
				type: 'group',
				logic: 'or',
				id: 'selected-files',
				label: '2 selected files',
				children: [
					expect.objectContaining({ filterType: 'file_path', values: [a.path] }),
					expect.objectContaining({ filterType: 'file_path', values: [b.path] }),
				],
			}),
		);

		selectedSvc.setSelectedFileFilter([c]);

		expect(svc.filteredFiles).toEqual([c]);
		expect(svc.activeFilter.children).toContainEqual(
			expect.objectContaining({
				type: 'group',
				id: 'selected-files',
				label: '1 selected file',
				children: [expect.objectContaining({ filterType: 'file_path', values: [c.path] })],
			}),
		);
	});

	it('toggles the selected-files filter off when the same file set is selected again', () => {
		const { svc, a } = setup();
		const selectedSvc = svc as FilterService & {
			setSelectedFileFilter(files: Array<typeof a>): void;
		};

		selectedSvc.setSelectedFileFilter([a]);
		selectedSvc.setSelectedFileFilter([a]);

		expect(svc.selectedFiles).toEqual([]);
		expect(svc.activeFilter.children.find((node) => node.id === 'selected-files')).toBeUndefined();
		expect(svc.filteredFiles).toHaveLength(3);
	});

	it('does not notify subscribers when search filter terms are unchanged', () => {
		const { svc } = setup();
		let calls = 0;
		svc.subscribe(() => calls++);

		svc.setSearchFilter('a', 'Notes');
		svc.setSearchFilter('a', 'Notes');

		expect(calls).toBe(1);
	});

	it('exposes file explorer search terms as active filter rules', () => {
		const { svc } = setup();

		svc.setSearchFilter('daily', 'Journal');

		expect(svc.getSearchFilterRules()).toEqual([
			expect.objectContaining({
				id: 'search:file_name',
				filterType: 'file_name',
				values: ['daily'],
			}),
			expect.objectContaining({
				id: 'search:file_folder',
				filterType: 'file_folder',
				values: ['Journal'],
			}),
		]);
	});

	it('can clear one or all file explorer search filter terms', () => {
		const { svc } = setup();

		svc.setSearchFilter('a', 'Notes');
		svc.clearSearchFilter('name');
		expect(svc.getSearchFilters()).toEqual({ name: '', folder: 'Notes' });

		svc.clearSearchFilter();
		expect(svc.getSearchFilters()).toEqual({ name: '', folder: '' });
	});
});

describe('FilterService introspection', () => {
	it('hasTagFilter / hasPropFilter / hasValueFilter detect existing rules', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.addNode({ ...draftRule, id: 'r2', filterType: 'has_tag', values: ['idea'] } as FilterRule);
		svc.addNode({ ...draftRule, id: 'r3', filterType: 'has_property', values: [] } as FilterRule);

		expect(svc.hasTagFilter('idea')).toBe(true);
		expect(svc.hasPropFilter('status')).toBe(true);
		expect(svc.hasValueFilter('status', 'draft')).toBe(true);
		expect(svc.hasValueFilter('status', 'something-else')).toBe(false);
	});

	it('getFlatRules returns description + enabled metadata', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		const rules = svc.getFlatRules();
		expect(rules).toHaveLength(1);
		expect(rules[0].description).toContain('status');
		expect(rules[0].enabled).toBe(true);
	});

	it('loadTemplate replaces the active filter and applies', () => {
		const { svc, a } = setup();
		const tpl: FilterTemplate = {
			name: 'drafts',
			root: { type: 'group', logic: 'all', children: [draftRule] },
		};
		svc.loadTemplate(tpl);
		expect(svc.filteredFiles.map((f) => f.path)).toEqual([a.path]);
	});

	it('loadTemplate recursively normalizes legacy group logic', () => {
		const { svc, a } = setup();
		const tpl: FilterTemplate = {
			name: 'legacy',
			root: {
				type: 'group',
				logic: 'all',
				children: [
					{
						type: 'group',
						logic: 'any',
						children: [draftRule],
					},
				],
			},
		};

		svc.loadTemplate(tpl);

		expect(svc.activeFilter.logic).toBe('and');
		const child = svc.activeFilter.children[0];
		expect(child).toEqual(expect.objectContaining({ type: 'group', logic: 'or' }));
		expect(svc.filteredFiles.map((f) => f.path)).toEqual([a.path]);
	});

	it('clearFilters resets the tree to empty', () => {
		const { svc } = setup();
		svc.addNode({ ...draftRule });
		svc.clearFilters();
		expect(svc.activeFilter.children).toHaveLength(0);
		expect(svc.filteredFiles.length).toBe(3);
	});
});
