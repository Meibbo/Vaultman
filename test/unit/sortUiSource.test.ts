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
		expect(navbarSource).toContain('parentsFirst: true');
		expect(navbarSource).toContain("translate('sort.parents_first')");
		expect(popupSource).toContain('parentsFirst');
		expect(popupSource).toContain("translate('sort.parents_first')");
	});

	it('shows active sort-axis label on Props and Tags vert-col toggle', () => {
		expect(popupSource).toContain("translate('sort.vertcol.by_values')");
		expect(popupSource).toContain("translate('sort.vertcol.by_props')");
		expect(popupSource).toContain("translate('sort.vertcol.by_nested')");
		expect(popupSource).toContain("translate('sort.vertcol.by_root')");
	});

	it('names the Props context-menu action by the sort axis it will activate', () => {
		expect(navbarSource).toContain(
			"current.childLevel\n\t\t\t\t\t\t\t\t? translate('sort.vertcol.sort_props')",
		);
		expect(navbarSource).toContain(": translate('sort.vertcol.sort_values')");
		expect(en['sort.vertcol.sort_props']).toBe('Sort props');
		expect(en['sort.vertcol.sort_values']).toBe('Sort values');
		expect(es['sort.vertcol.sort_props']).toBe('Ordenar props');
		expect(es['sort.vertcol.sort_values']).toBe('Ordenar valores');
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

	it('offers Files word-count sorting and warms persisted stats on demand', () => {
		for (const source of [navbarSource, popupSource]) {
			expect(source).toContain("id: 'words'");
			expect(source).toContain("labelKey: 'sort.by.words'");
		}
		expect(filesSource).toContain(
			"if (normalizedSortBy === 'words') this._warmWordCountSort()",
		);
		expect(filesSource).toMatch(
			/_warmWordCountSort\(files = this\._filesForDisplay\(\)\)/,
		);
		expect(filesSource).toContain('.ensureFileStats(files)');
		expect(filesSource).toContain(
			'wordCountForFile: (file) =>\n\t\t\t\t\tthis.plugin.statisticsCache.getFileWordCount(file) ?? 0',
		);
		expect(en['sort.by.words']).toBe('Words');
		expect(es['sort.by.words']).toBe('Palabras');
	});
});
