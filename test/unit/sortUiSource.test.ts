import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import popupSource from '../../src/components/layout/popupSort.svelte?raw';
import filesSource from '../../src/components/containers/explorerFiles.ts?raw';

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
		expect(es['sort.level.title']).toBe('Nivel de orden');
		expect('sort.vertcol.sort_props' in en).toBe(false);
		expect('sort.vertcol.sort_values' in en).toBe(false);
		expect('sort.vertcol.sort_props' in es).toBe(false);
		expect('sort.vertcol.sort_values' in es).toBe(false);
	});

	it('captures a drill target by long press without applying a sort immediately', () => {
		expect(navbarSource).toContain('new LongPressGesture()');
		expect(navbarSource).toContain("closest<HTMLElement>('[data-id]')");
		expect(navbarSource).toContain('handleScopeChangeForTab(tab, {');
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

	it('offers Files word-count sorting and warms persisted stats on demand', () => {
		for (const source of [navbarSource, popupSource]) {
			expect(source).toContain("id: 'words'");
			expect(source).toContain("labelKey: 'sort.by.words'");
		}
		expect(filesSource).toContain(
			'if (this._usesWordSort()) this._warmWordCountSort();',
		);
		expect(filesSource).toMatch(
			/_warmWordCountSort\(files = this\._filesForDisplay\(\)\)/,
		);
		expect(filesSource).toContain('private _usesWordSort(): boolean');
		expect(filesSource).toMatch(
			/Object\.values\(this\.sortState\.sorts\)\.some\([\s\S]{0,80}sort\?\.sortBy === 'words'/,
		);
		expect(filesSource).toContain('.ensureFileStats(files)');
		expect(filesSource).toContain(
			'wordCountForFile: (file) =>\n\t\t\t\t\tthis.plugin.statisticsCache.getFileWordCount(file) ?? 0',
		);
		expect(en['sort.by.words']).toBe('Words');
		expect(es['sort.by.words']).toBe('Palabras');
	});
});
