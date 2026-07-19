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

describe('explorer sort UI source', () => {
	it('exposes modified and created time instead of the ambiguous date sort', () => {
		for (const source of [navbarSource, popupSource]) {
			expect(source).toContain("id: 'mtime'");
			expect(source).toContain("id: 'ctime'");
			expect(source).not.toMatch(
				/\{\s*id:\s*'date'[\s\S]{0,100}labelKey:\s*'sort\.by\.date'/,
			);
		}
	});

	it('transports Files Parents First through native and popup sort controls', () => {
		expect(navbarSource).toContain(
			'const parentsFirst = current.parentsFirst ?? true;',
		);
		expect(navbarSource).toContain("translate('sort.parents_first')");
		expect(popupSource).toContain('parentsFirst');
		expect(popupSource).toContain("translate('sort.parents_first')");
	});

	it('offers explicit per-tab sort levels in native and popup controls', () => {
		expect(navbarSource).toContain("translate('sort.level.title')");
		expect(navbarSource).toContain("translate('sort.level.properties')");
		expect(navbarSource).toContain("translate('sort.level.values')");
		expect(navbarSource).toContain("translate('sort.level.all')");
		expect(navbarSource).toContain("translate('sort.level.drill')");
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
		expect(navbarSource).toContain("labelKey: 'sort.by.props'");
		expect(popupSource).toContain("labelKey: 'sort.by.props'");
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

	it('applies node filters without applying a newly selected sort scope', () => {
		expect(popupSource).toContain('onFilterChange?: (state: ExplorerSortState) => void;');
		expect(popupSource).toContain('onFilterChange?.(sortState);');
		expect(navbarSource).toContain('function handleFilterChange(');
		expect(navbarSource).toContain('sorts: appliedState.sorts');
		expect(navbarSource).toContain('activeScope: appliedState.activeScope');
		expect(navbarSource).toContain('onFilterChange={handleFilterChange}');
	});

	it('offers Files statistics sorting and warms persisted stats on demand', () => {
		for (const source of [navbarSource, popupSource]) {
			expect(source).toContain("id: 'words'");
			expect(source).toContain("labelKey: 'sort.by.words'");
			expect(source).toContain("id: 'tasks'");
			expect(source).toContain("labelKey: 'sort.by.tasks'");
		}
		expect(filesSource).toContain('this._warmStatisticsCache()');
		expect(filesSource).toMatch(
			/_warmStatisticsCache\(files = this\._filesForDisplay\(\)\)/,
		);
		expect(filesSource).toContain('private _usesStatisticsSort(): boolean');
		expect(filesSource).toMatch(
			/Object\.values\(this\.sortState\.sorts\)\.some\([\s\S]{0,120}sort\?\.sortBy === 'tasks'/,
		);
		expect(filesSource).toContain('.ensureFileStats(files, {');
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
		const group = navbarSource.slice(
			navbarSource.indexOf('function addByLevelItems('),
			navbarSource.indexOf('function sortLevelOptions('),
		);
		const nested = group.indexOf("translate('sort.level.nested')");
		const folders = group.indexOf("translate('sort.parents_first')");
		const fixed = group.indexOf("translate('sort.level.fixed_folders')");
		expect(nested).toBeGreaterThan(-1);
		expect(folders).toBeGreaterThan(nested);
		expect(fixed).toBeGreaterThan(folders);
		// Fixed folders only shows while Folders first is on.
		expect(group).toContain('if (parentsFirst) {');
		// Scope: drill precedes All levels (D29 order).
		const levels = navbarSource.slice(
			navbarSource.indexOf('function sortLevelOptions('),
			navbarSource.indexOf('function nodeTypeOptionsForActiveTab('),
		);
		expect(levels.indexOf("scope: 'drill'")).toBeLessThan(
			levels.indexOf("scope: 'all'"),
		);
	});

	it('moves Nested out of the view-menu cells and renders inline by default', () => {
		expect(navbarSource).toContain("(cellId) => cellId !== 'nested'");
		expect(navbarSource).toContain('sortLevelInline = true');
		expect(navbarSource).toContain('addByLevelItems(menu, activeTab, current)');
		expect(DEFAULT_SETTINGS.sortLevelInline).toBe(true);
	});

	it('hides contextual options and shows the six-char drill scope label', () => {
		expect(navbarSource).toContain('isSortOptionVisible(option.id, {');
		expect(navbarSource).toContain('drillScopeTitle(tab, current)');
		expect(navbarSource).toContain('chars.slice(0, 6)');
	});

	it('lets the floating index drill drive the sort scope behind its setting', () => {
		expect(DEFAULT_SETTINGS.tocDrillSyncsSort).toBe(false);
		expect(frameSource).toContain('applyExternalSortScope');
		expect(filesSource).toContain('applyExternalSortScope(drillNodeId: string | null)');
	});
});
