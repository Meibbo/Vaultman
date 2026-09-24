import { describe, expect, it, vi } from 'vitest';
import { FilesExplorerPanel } from '../../src/components/containers/explorerFiles';

interface TestFile {
	path: string;
	extension: string;
}

interface TestFolder {
	path: string;
}

interface TestFilterService {
	activeFilter: {
		children: Array<{
			type: string;
			filterType: string;
			enabled: boolean;
			values?: string[];
		}>;
	};
	filteredVaultFiles: TestFile[];
	activeFolderFilterPaths: () => string[];
}

interface PanelHarness {
	plugin: {
		app: {
			vault: {
				getFiles: () => TestFile[];
				getAllFolders: () => TestFolder[];
			};
		};
		filterService: TestFilterService;
	};
	sortState: { filtered: boolean };
	viewMode: string;
	nodeTypeFilters: string[];
	_currentFiles: TestFile[];
	searchName: string;
	searchFolder: string;
	_filesForCurrentScope(): TestFile[];
	_foldersForCurrentView(): TestFolder[];
	_shouldShowEmptyFilteredState(): boolean;
	_syncSearchTermsFromActiveFilters(): void;
	_activeFolderFilterPaths(): string[];
}

function makePanel(filtered: boolean, filterService: TestFilterService) {
	const allFiles = [
		{ path: 'alpha/one.md', extension: 'md' },
		{ path: 'beta/two.png', extension: 'png' },
	];
	const folders = [{ path: 'alpha' }, { path: 'beta' }, { path: 'empty' }];
	const panel = Object.create(
		FilesExplorerPanel.prototype,
	) as unknown as PanelHarness;
	panel.plugin = {
		app: {
			vault: {
				getFiles: () => allFiles,
				getAllFolders: () => folders,
			},
		},
		filterService,
	};
	panel.sortState = { filtered };
	panel.viewMode = 'tree';
	panel.nodeTypeFilters = ['folders-only'];
	panel._currentFiles = filtered ? filterService.filteredVaultFiles : allFiles;
	panel.searchName = '';
	panel.searchFolder = '';
	return panel;
}

describe('FileScene filter projection stays local to its instance', () => {
	it('keeps the full folder list when one instance disables filtering', () => {
		const filterService = {
			activeFilter: {
				type: 'group',
				children: [{ type: 'rule', filterType: 'file_type', enabled: true }],
			},
			filteredVaultFiles: [{ path: 'alpha/one.md', extension: 'md' }],
			activeFolderFilterPaths: vi.fn(() => []),
		};
		const unfiltered = makePanel(false, filterService);
		const filtered = makePanel(true, filterService);

		expect(unfiltered._filesForCurrentScope().map((file) => file.path)).toEqual(
			['alpha/one.md', 'beta/two.png'],
		);
		expect(
			unfiltered._foldersForCurrentView().map((folder) => folder.path),
		).toEqual(['alpha', 'beta', 'empty']);
		expect(unfiltered._shouldShowEmptyFilteredState()).toBe(false);
		expect(
			filtered._foldersForCurrentView().map((folder) => folder.path),
		).toEqual(['alpha']);
		expect(filterService.filteredVaultFiles.map((file) => file.path)).toEqual([
			'alpha/one.md',
		]);
	});

	it('does not carry global name and folder rules into an unfiltered FileScene', () => {
		const filterService = {
			activeFilter: {
				type: 'group',
				children: [
					{
						type: 'rule',
						filterType: 'file_name',
						values: ['one'],
						enabled: true,
					},
					{
						type: 'rule',
						filterType: 'file_folder',
						values: ['alpha'],
						enabled: true,
					},
				],
			},
			filteredVaultFiles: [{ path: 'alpha/one.md', extension: 'md' }],
			activeFolderFilterPaths: vi.fn(() => ['alpha']),
		};
		const unfiltered = makePanel(false, filterService);
		const filtered = makePanel(true, filterService);
		unfiltered.searchName = 'stale';
		unfiltered.searchFolder = 'stale';

		unfiltered._syncSearchTermsFromActiveFilters();
		filtered._syncSearchTermsFromActiveFilters();

		expect([unfiltered.searchName, unfiltered.searchFolder]).toEqual(['', '']);
		expect([filtered.searchName, filtered.searchFolder]).toEqual([
			'one',
			'alpha',
		]);
		expect(unfiltered._activeFolderFilterPaths()).toEqual([]);
		expect(filtered._activeFolderFilterPaths()).toEqual(['alpha']);
		// The shared FilterScene source is not altered by either instance.
		expect(filterService.filteredVaultFiles).toHaveLength(1);
	});

	it('keeps a scoped folder visible even when it contains no matching files', () => {
		const filterService = {
			activeFilter: {
				children: [
					{
						type: 'rule',
						filterType: 'folder',
						values: ['alpha'],
						enabled: true,
					},
				],
			},
			filteredVaultFiles: [],
			activeFolderFilterPaths: vi.fn(() => ['alpha']),
		};
		const panel = makePanel(true, filterService);
		expect(panel._foldersForCurrentView().map((folder) => folder.path)).toEqual(
			['alpha'],
		);
		expect(panel._shouldShowEmptyFilteredState()).toBe(false);
	});
});
