import { describe, expect, it } from 'vitest';

import filesPanelSource from '../../src/components/containers/explorerFiles.ts?raw';
import pluginsPanelSource from '../../src/components/containers/explorerPlugins.ts?raw';
import propsPanelSource from '../../src/components/containers/explorerProps.ts?raw';
import snippetsPanelSource from '../../src/components/containers/explorerSnippets.ts?raw';
import tagsPanelSource from '../../src/components/containers/explorerTags.ts?raw';
import frameSource from '../../src/VaultmanFrame.svelte?raw';
import filesGridSource from '../../src/components/layout/viewFilesGrid.ts?raw';
import tableSource from '../../src/components/layout/viewGrid.ts?raw';
import nodeTableSource from '../../src/components/layout/viewNodeTable.ts?raw';
import treeSource from '../../src/components/layout/viewTree.ts?raw';

function methodBlock(source: string, name: string): string {
	const match = source.match(new RegExp(`\\n\\t${name}\\([^]*?\\n\\t\\}`));
	return match?.[0] ?? '';
}

describe('BT5-030 cached viewport activation', () => {
	it('exposes a viewport-only refresh on every virtual renderer', () => {
		for (const source of [treeSource, tableSource, filesGridSource, nodeTableSource]) {
			expect(source).toMatch(/\n\trefreshViewport\(\): void \{/);
		}
	});

	it('delegates explorer activation to the mounted renderer without rebuilding models', () => {
		const cachedOnlyCases = [
			filesPanelSource,
			snippetsPanelSource,
			pluginsPanelSource,
		] as const;

		for (const source of cachedOnlyCases) {
			const block = methodBlock(source, 'refreshViewport');
			expect(block).not.toBe('');
			expect(block).toContain('.refreshViewport()');
			expect(block).not.toMatch(/this\._?render\(\)/);
		}

		for (const source of [propsPanelSource, tagsPanelSource]) {
			const block = methodBlock(source, 'refreshViewport');
			expect(block).not.toBe('');
			expect(block).toContain('.refreshViewport()');
			expect(block).toContain('this.deferredRender.activate');
		}
	});

	it('defers metadata-driven Props and Tags rebuilds while their panels are hidden', () => {
		for (const source of [propsPanelSource, tagsPanelSource]) {
			expect(source).toContain('new DeferredExplorerRender()');
			expect(source).toContain('this._deferRender();');
			expect(source).toContain('this.containerEl.isShown()');
			expect(source).toContain('this.deferredRender.dispose()');
		}
	});

	it('does not rebuild Files directly from the frame on metadata resolved', () => {
		expect(frameSource).not.toContain('const onVaultResolved');
		expect(frameSource).not.toMatch(
			/metadataCache\.on\('resolved',[\s\S]*?refreshFiles\(\)/,
		);
	});

	it('checks hidden addon state on activation without rebuilding an unchanged model', () => {
		for (const source of [snippetsPanelSource, pluginsPanelSource]) {
			const block = methodBlock(source, 'refreshViewport');
			expect(block).toContain('this._syncExternalState()');
			expect(block).toContain('.refreshViewport()');
		}
	});

	it('updates active-file state without a panel render on file-open', () => {
		const handler = filesPanelSource.match(
			/\n\tprivate readonly _handleActiveFileChange = \([^]*?\n\t\};/,
		)?.[0] ?? '';
		expect(handler).not.toBe('');
		expect(handler).toContain('this._syncActiveFilePath');
		// BT5-013 carves out one narrow exception: Last opened is a recency
		// order, so it is wrong the instant it is not refreshed. Every other
		// sort keeps BT5-030's contract — no render on file-open, which is what
		// removed the typing micro-stalls. The guard therefore pins the
		// condition, not the absence of a render.
		expect(handler).toContain(
			"if (normalizeExplorerSortBy(this.sortBy) !== 'opened') return;",
		);
		const renderIndex = handler.indexOf('this._render()');
		expect(renderIndex).toBeGreaterThan(
			handler.indexOf("!== 'opened') return;"),
		);
		expect(filesPanelSource).toContain('this.treeView?.setActiveId(nextPath)');
		expect(filesPanelSource).not.toContain('_decorateTreeWithActiveReveal');
	});

	it('patches active classes in rendered Table and Cards rows', () => {
		for (const source of [tableSource, filesGridSource]) {
			const block = methodBlock(source, 'setActivePath');
			expect(source).toContain("'is-active'");
			expect(block).toMatch(/toggleClass|setRenderedPathActive/);
			expect(block).toMatch(/previous|activePath/);
		}
	});

	it('keeps active-file state out of structural row signatures', () => {
		for (const source of [tableSource, filesGridSource]) {
			expect(source).not.toContain(
				"this.activePath === file.path ? '1' : '0',",
			);
		}
	});
});
