import { describe, expect, it } from 'vitest';

import filesSource from '../../src/components/containers/explorerFiles.ts?raw';
import propsSource from '../../src/components/containers/explorerProps.ts?raw';
import tagsSource from '../../src/components/containers/explorerTags.ts?raw';
import snippetsSource from '../../src/components/containers/explorerSnippets.ts?raw';
import pluginsSource from '../../src/components/containers/explorerPlugins.ts?raw';
import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';

describe('explorer setter source guards', () => {
	it('keeps repeated Files explorer setter calls from re-rendering', () => {
		expect(filesSource).toContain('function sameStringSet');
		expect(filesSource).toContain('if (this.viewMode === mode) return;');
		expect(filesSource).toContain('if (sameStringSet(this.visibleCells, cells)) return;');
		expect(filesSource).toContain(
			'setSortState(state: ExplorerSortState): void',
		);
		expect(filesSource).toContain(
			'sameExplorerSortState(this.sortState, normalizedState)',
		);
		expect(filesSource).toContain(
			'sameNodeTypeFilters(this.nodeTypeFilters, nextNodeTypeFilters)',
		);
		expect(filesSource).toContain(
			"all: activeScopeSort('files', this.sortState, 'all')",
		);
		expect(filesSource).toContain('drillNodeId: this.sortState.drillNodeId');
		expect(filesSource).not.toContain('childLevel');
		expect(filesSource).toContain(
			'if (this.searchName === name && this.searchFolder === folder) return;',
		);
	});

	it('keeps repeated Props explorer setter calls from re-rendering', () => {
		expect(propsSource).toContain('function sameStringSet');
		expect(propsSource).toContain(
			'if (this.searchTerm === term && this.searchMode === mode) return;',
		);
		expect(propsSource).toContain('if (this.viewMode === mode) return;');
		expect(propsSource).toContain('if (sameStringSet(this.visibleCells, cells)) return;');
		expect(propsSource).toContain(
			'setSortState(state: ExplorerSortState): void',
		);
		expect(propsSource).toContain('sortTwoLevel(');
		expect(propsSource).toContain(
			'sameNodeTypeFilters(this.nodeTypeFilters, nextNodeTypeFilters)',
		);
		expect(propsSource).not.toContain('sortChildLevel');
		expect(propsSource).not.toContain('childLevel');
	});

	it('keeps repeated Tags explorer setter calls from re-rendering', () => {
		expect(tagsSource).toContain('function sameStringSet');
		expect(tagsSource).toContain(
			'if (this.searchTerm === term && this.searchMode === mode) return;',
		);
		expect(tagsSource).toContain('if (this.viewMode === mode) return;');
		expect(tagsSource).toContain('if (sameStringSet(this.visibleCells, cells)) return;');
		expect(tagsSource).toContain(
			'setSortState(state: ExplorerSortState): void',
		);
		expect(tagsSource).toContain('sortAllWithDrill(');
		expect(tagsSource).toContain(
			'sameNodeTypeFilters(this.nodeTypeFilters, nextNodeTypeFilters)',
		);
		expect(tagsSource).not.toContain('sortChildLevel');
		expect(tagsSource).not.toContain('childLevel');
	});
});

describe('pane reactivation re-render (BT4-022)', () => {
	it('exposes refreshViewport on every explorer panel and wires activation', () => {
		for (const source of [
			filesSource,
			propsSource,
			tagsSource,
			snippetsSource,
			pluginsSource,
		]) {
			expect(source).toContain('refreshViewport(): void {');
		}
		expect(pageFiltersSource).toContain('refreshViewport()');
		expect(pageFiltersSource).toContain('window.requestAnimationFrame(() => {');
	});
});
