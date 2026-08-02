import { describe, expect, it } from 'vitest';
import source from '../../src/components/containers/explorerFiles.ts?raw';
import filterServiceSource from '../../src/services/serviceFilter.ts?raw';

function methodSource(name: string, nextName: string): string {
	const start = source.indexOf(`\n\t${name}(`);
	const end = source.indexOf(`\n\t${nextName}(`, start + 1);
	expect(start).toBeGreaterThanOrEqual(0);
	expect(end).toBeGreaterThan(start);
	return source.slice(start, end);
}

describe('Files Explorer bulk expansion projection', () => {
	it('batches the PVPUI projection into one provider render', () => {
		const configure = methodSource(
			'configurePanelWidgetProjection',
			'setViewMode',
		);

		expect(configure).toContain('this._withRenderBatch');
		expect(configure).toContain('this.setViewMode');
		expect(configure).toContain('this.setVisibleCells');
		expect(configure).toContain('this.setSortState');
	});

	it('avoids duplicate ordering and unused cell decoration in nested projections', () => {
		expect(source).toContain('const sortedFiles = nested');
		expect(source).toContain(
			'? displayFiles\n\t\t\t\t: vaultmanPerfMonitor.measure',
		);
		expect(source).toContain("this.visibleCells.has('mtime')");
		expect(source).not.toContain(
			'this._decorateTreeWithFileTimes(node.children)',
		);
	});

	it('reuses the current Scene tree instead of rebuilding it for expand all', () => {
		const expandAll = methodSource('expandAll', 'collapseAll');

		expect(expandAll).toContain('this._lastRenderTree');
		expect(expandAll).toContain('this._refreshCompleteTreeExpansion');
		expect(expandAll).not.toContain('buildFileTree');
		expect(expandAll).not.toContain('this._render()');
	});

	it('reprojects the current Scene tree instead of rebuilding it for collapse all', () => {
		const collapseAll = methodSource('collapseAll', 'autoRevealActiveFile');

		expect(collapseAll).toContain('this._refreshCompleteTreeExpansion');
		expect(collapseAll).not.toContain('this._render()');
	});

	it('uses the cached tree projection when revealing the active file', () => {
		const reveal = methodSource(
			'autoRevealActiveFile',
			'async createFromSearch',
		);

		expect(reveal).toContain('this._refreshCompleteTreeExpansion');
		expect(reveal).not.toContain('this._render()');
	});

	it('reprojects non-structural cell toggles from the cached Scene tree', () => {
		const setVisibleCells = methodSource('setVisibleCells', 'hasExpandedNodes');

		expect(setVisibleCells).toContain('this._refreshCachedTreeCells');
		expect(setVisibleCells).toContain('this._switchCachedTreeTopology');
	});

	it('re-sorts the cached Scene tree when the file set is unchanged', () => {
		const setSortState = methodSource('setSortState', 'getActiveTypeFilter');

		expect(setSortState).toContain('this._resortCachedTree');
	});

	it('defers Iconic resolution to the virtual window', () => {
		expect(source).toContain('prepareNode: (node)');
		expect(source).toContain('this._prepareTreeNodeIcon(');
		expect(source).toContain('this._prepareTreeNodeCells(');
	});

	it('uses a conservative differential tracer for flat tree filter changes', () => {
		const initialRender = methodSource('render', 'setSearchFilter');
		const refresh = methodSource(
			'private _refreshFromFilterService',
			'private _filesForCurrentScope',
		);

		expect(filterServiceSource).toContain('getProjectionStateSignature()');
		expect(initialRender).toContain('this.filterProjectionSnapshot = {');
		expect(refresh).toContain('resolveFilterProjectionDelta');
		expect(refresh).toContain('this._tryApplyFilterDelta');
		expect(refresh).toContain('this._render()');
		expect(source).toContain("this.viewMode !== 'tree'");
		expect(source).toContain('this._nestedEnabled()');
		expect(source).toContain('!delta.safe');
		expect(source).toContain('this._currentFiles.length === 0');
		expect(source).toContain('this._lastRenderTree.length === 0');
	});

	it('reuses retained flat nodes and decorates only entered nodes', () => {
		const applyDelta = methodSource(
			'private _applyFilterDeltaProjection',
			'private _refreshFromFilterService',
		);

		expect(applyDelta).toContain('previousNodesByPath');
		expect(applyDelta).toContain('enteredNodes');
		expect(applyDelta).toContain('reconcileFilterProjectionItems');
		expect(applyDelta).toContain('this._decorateTreeWithQueue(enteredNodes)');
		expect(applyDelta).toContain('this._decorateTreeWithIcons(enteredNodes)');
		expect(applyDelta).not.toContain(
			'this._decorateTreeWithFileTimes(nextNodes)',
		);
	});
});
