import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import popupSource from '../../src/components/layout/popupSort.svelte?raw';
import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';
import viewGridSource from '../../src/components/layout/viewGrid.ts?raw';
import filesSource from '../../src/components/containers/explorerFiles.ts?raw';
import frameSource from '../../src/VaultmanFrame.svelte?raw';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import {
	byLevelModel,
	NODE_TYPE_MENU_OPTIONS,
	SORT_MENU_OPTIONS,
	visibleSortOptions,
} from '../../src/logic/logicSortMenu';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import { viewMenuCells } from '../../src/logic/logicCellRegistry';

describe('explorer sort UI source', () => {
	it('exposes modified and created time instead of the ambiguous date sort', () => {
		const options = Object.values(SORT_MENU_OPTIONS).flat();
		expect(options.some((option) => option.id === 'mtime')).toBe(true);
		expect(options.some((option) => option.id === 'ctime')).toBe(true);
		expect(
			options.some(
				(option) => option.id === 'date' && option.labelKey === 'sort.by.date',
			),
		).toBe(false);
	});

	it('transports Files Parents First through native and popup sort controls', () => {
		const model = byLevelModel(
			'files',
			normalizeExplorerSortState('files', null),
			true,
		);
		expect(model?.items.map((item) => item.id)).toContain('parentsFirst');
		expect(navbarSource).toContain("option.id === 'parentsFirst'");
		expect(popupSource).toContain("item.id === 'parentsFirst'");
	});

	it('offers explicit per-tab sort levels in native and popup controls', () => {
		expect(navbarSource).toContain("translate('sort.level.title')");
		expect(
			byLevelModel(
				'props',
				normalizeExplorerSortState('props', null),
				true,
			)?.items.map((item) => item.id),
		).toEqual(['nested', 'scope-separator', 'properties', 'values']);
		expect(
			byLevelModel(
				'files',
				normalizeExplorerSortState('files', null),
				true,
			)?.items.map((item) => item.id),
		).toEqual([
			'nested',
			'parentsFirst',
			'fixedFolders',
			'scope-separator',
			'drill',
			'all',
		]);
		expect(popupSource).toContain('activeScope');
		expect(popupSource).toContain('selectScope(');
		expect(popupSource).toContain("translate('sort.level.title')");
		expect(en['sort.level.title']).toBe('By level');
		expect(es['sort.level.title']).toBe('Por nivel');
		expect('sort.vertcol.sort_props' in en).toBe(false);
		expect('sort.vertcol.sort_values' in en).toBe(false);
		expect('sort.vertcol.sort_props' in es).toBe(false);
		expect('sort.vertcol.sort_values' in es).toBe(false);
	});

	it('captures a drill level with one click in dashed pick mode (BT4-009/D29)', () => {
		expect(navbarSource).not.toContain('new LongPressGesture()');
		expect(navbarSource).toContain("closest<HTMLElement>('[data-id]')");
		// Picking a row selects its LEVEL: the parent scope, like the index drill.
		expect(navbarSource).toContain('panel?.scopeRootForNode(nodeId)');
		expect(navbarSource).toContain("classList.add('vaultman-sort-pick-mode')");
		expect(navbarSource).toContain(
			"classList.remove('vaultman-sort-pick-mode')",
		);
		expect(navbarSource).toContain('handleScopeChangeForTab(');
		const start = navbarSource.indexOf('function handleScopeChangeForTab(');
		const end = navbarSource.indexOf('\n\tfunction ', start + 1);
		const handler = navbarSource.slice(start, end);
		expect(handler).toContain('sortStateByTab =');
		expect(handler).not.toContain('applySortState(');
		expect(navbarSource).toContain(
			'const sortState = untrack(\n\t\t\t() => sortStateByTab[tab]',
		);
	});

	it('labels Files count sort as Props without renaming generic count sorts', () => {
		expect(
			SORT_MENU_OPTIONS.files.find((option) => option.id === 'count')?.labelKey,
		).toBe('sort.by.props');
		expect(
			SORT_MENU_OPTIONS.props.find((option) => option.id === 'count')?.labelKey,
		).toBe('sort.by.count');
	});

	it('uses one physical direction policy on popup, native menu, table and Content', () => {
		expect(popupSource).toContain('sortDirectionIcon(activeSort.direction)');
		expect(popupSource).toContain('sortDirectionGlyph(activeSort.direction)');
		expect(navbarSource).toContain('sortDirectionGlyph(activeSort.direction)');
		expect(viewGridSource).toContain('sortDirectionIcon(this.sortDirection)');
		expect(pageFiltersSource).toContain(
			'sortDirectionGlyph(contentSortDirection)',
		);
	});

	it('moves node types into an L2 native submenu and keeps multiselect state', () => {
		expect(navbarSource).toContain("translate('explorer.sort.type')");
		expect(navbarSource).toContain('setSubmenu: () => Menu');
		expect(navbarSource).toContain('selectedNodeTypes.includes(option.id)');
		expect(navbarSource).toContain('toggleNodeTypeFilter(');
		expect(popupSource).toContain('nodeTypeFilters.includes(opt.id)');
		expect(popupSource).toContain('toggleNodeTypeFilter(nodeTypeFilters, id)');
	});

	it('puts the Files Folders toggle directly below All types', () => {
		expect(NODE_TYPE_MENU_OPTIONS.files.slice(0, 2).map((option) => option.id)).toEqual([
			'all',
			'folders-only',
		]);
		expect(NODE_TYPE_MENU_OPTIONS.files[1]?.labelKey).toBe('sort.type.folders');
		expect(navbarSource).toContain('...NODE_TYPE_MENU_OPTIONS.files');
		expect(en['sort.type.folders']).toBe('Folders');
		expect(es['sort.type.folders']).toBe('Carpetas');
	});

	it('applies node filters without applying a newly selected sort scope', () => {
		expect(popupSource).toContain(
			'onFilterChange?: (state: ExplorerSortState) => void;',
		);
		expect(popupSource).toContain('onFilterChange?.(sortState);');
		expect(navbarSource).toContain('function handleFilterChange(');
		expect(navbarSource).toContain('sorts: appliedState.sorts');
		expect(navbarSource).toContain('activeScope: appliedState.activeScope');
		expect(navbarSource).toContain('onFilterChange={handleFilterChange}');
	});

	it('offers Files statistics sorting and warms persisted stats on demand', () => {
		expect(SORT_MENU_OPTIONS.files).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'words', labelKey: 'sort.by.words' }),
				expect.objectContaining({ id: 'tasks', labelKey: 'sort.by.tasks' }),
			]),
		);
		expect(filesSource).toContain('this._warmStatisticsCache()');
		expect(filesSource).toMatch(
			/_warmStatisticsCache\(files = this\._filesForDisplay\(\)\)/,
		);
		expect(filesSource).toContain('private _usesStatisticsSort(): boolean');
		expect(filesSource).toMatch(
			/Object\.values\(this\.sortState\.sorts\)\.some\([\s\S]{0,120}sort\?\.sortBy === 'tasks'/,
		);
		expect(filesSource).toMatch(/\.ensureFileStats\(\s*files,\s*\{/);
		expect(filesSource).toContain(
			'wordCountForFile: (file) =>\n\t\t\t\t\tthis.plugin.statisticsCache.getFileWordCount(file) ?? 0',
		);
		expect(filesSource).toContain('node.meta.file?.name ?? node.label');
		expect(en['sort.by.words']).toBe('Words');
		expect(es['sort.by.words']).toBe('Palabras');
	});

	it('keeps Remaining Tasks sorting wired when Files uses Table view', () => {
		expect(viewGridSource).toContain("| 'tasks'");
		expect(viewGridSource).toContain(
			'getTaskCount?: (file: TFile) => number | null',
		);
		expect(viewGridSource).toContain(
			'taskCountForFile: this.callbacks.getTaskCount',
		);
		expect(filesSource.match(/tasks:\s*'tasks'/g)).toHaveLength(2);
		expect(filesSource).toContain(
			'getTaskCount: (file: TFile) =>\n\t\t\t\t\tthis.plugin.statisticsCache.getFileRemainingTasks(file)',
		);
	});
});

describe('By level phase 2 source guards (BT4-009 / D29-D33)', () => {
	it('groups Nested, Folders first and Fixed folders ahead of the scope radios', () => {
		const enabled = byLevelModel(
			'files',
			normalizeExplorerSortState('files', {
				sorts: { all: { sortBy: 'name', direction: 'asc' } },
				activeScope: 'all',
				nodeTypeFilter: null,
				parentsFirst: true,
				fixedFolders: true,
			}),
			true,
		);
		expect(enabled?.items.map((item) => item.id)).toEqual([
			'nested',
			'parentsFirst',
			'fixedFolders',
			'scope-separator',
			'drill',
			'all',
		]);
		const disabled = byLevelModel(
			'files',
			{
				...normalizeExplorerSortState('files', null),
				parentsFirst: false,
			},
			true,
		);
		expect(disabled?.items.map((item) => item.id)).not.toContain(
			'fixedFolders',
		);
	});

	it('moves Nested out of the view-menu cells and renders inline by default', () => {
		// BT5-010: the registry decides which cells reach the view menu, so
		// Nested is excluded there by role instead of by an inline filter.
		// BT5-011: the navbar now reads cellMenuOrder, which wraps viewMenuCells
		// and adds the activation projection.
		expect(navbarSource).toContain('cellMenuOrder(');
		expect(viewMenuCells('files', 'tree').map((cell) => cell.id)).not.toContain(
			'nested',
		);
		expect(navbarSource).toContain('sortLevelInline = true');
		expect(navbarSource).toContain('addByLevelItems(menu, activeTab, current)');
		expect(DEFAULT_SETTINGS.sortLevelInline).toBe(true);
	});

	it('hides contextual options and shows the six-char drill scope label', () => {
		expect(
			visibleSortOptions(
				'files',
				normalizeExplorerSortState('files', null),
				true,
			).map((option) => option.id),
		).not.toContain('path');
		expect(navbarSource).toContain('visibleSortOptions(');
		expect(navbarSource).toContain('drillScopeTitle(tab, current)');
		expect(navbarSource).toContain('chars.slice(0, 6)');
	});

	it('lets the floating index drill drive the sort scope behind its setting', () => {
		expect(DEFAULT_SETTINGS.tocDrillSyncsSort).toBe(false);
		expect(frameSource).toContain('applyExternalSortScope');
		expect(filesSource).toContain(
			'applyExternalSortScope(drillNodeId: string | null)',
		);
	});
});
