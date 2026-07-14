// eslint-disable-next-line import/no-nodejs-modules -- source guard reads the root CSS file in Vitest's Node environment.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import { FilesExplorerPanel } from '../../src/components/containers/explorerFiles';
import filesExplorerSource from '../../src/components/containers/explorerFiles.ts?raw';
import { PropsExplorerPanel } from '../../src/components/containers/explorerProps';
import propsExplorerSource from '../../src/components/containers/explorerProps.ts?raw';
import { TagsExplorerPanel } from '../../src/components/containers/explorerTags';
import floatingTocSource from '../../src/components/layout/floatingToc.svelte?raw';
import gridViewSource from '../../src/components/layout/viewGrid.ts?raw';
import frameSource from '../../src/VaultmanFrame.svelte?raw';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
).replace(/\r\n/g, '\n');

interface TopLevelSnapshotPanel {
	onTopLevelNodesChanged?: () => void;
	_setTopLevelNodes(nodes: { id: string; label: string }[]): void;
	getTopLevelNodes(): { id: string; label: string }[];
}

const panelPrototypes = [
	['files', FilesExplorerPanel.prototype],
	['props', PropsExplorerPanel.prototype],
	['tags', TagsExplorerPanel.prototype],
] as const;

describe('Floating TOC source and panel contracts', () => {
	it.each(panelPrototypes)(
		'%s accessor returns the exact latest top-level snapshot and notifies',
		(_name, prototype) => {
			const panel = Object.create(prototype) as TopLevelSnapshotPanel;
			const onChanged = vi.fn();
			panel.onTopLevelNodesChanged = onChanged;
			const first = [
				{ id: 'a', label: 'Alpha' },
				{ id: 'b', label: 'Beta' },
			];
			const second = [{ id: 'g', label: 'Gamma' }];

			panel._setTopLevelNodes(first);
			expect(panel.getTopLevelNodes()).toEqual(first);
			panel._setTopLevelNodes(second);
			expect(panel.getTopLevelNodes()).toEqual(second);
			expect(onChanged).toHaveBeenCalledTimes(2);
		},
	);

	it('captures Props top-level nodes from the sorted arrays that are rendered', () => {
		const regularRender = propsExplorerSource.match(
			/private _render\(\): void \{[\s\S]*?\n\tprivate _renderGrid/,
		)?.[0];
		const gridRender = propsExplorerSource.match(
			/private _renderGrid\(\): void \{[\s\S]*?\n\tprivate /,
		)?.[0];

		expect(regularRender).toBeTruthy();
		expect(gridRender).toBeTruthy();
		expect(
			regularRender!.indexOf('const sorted = this._applySort(tree);'),
		).toBeLessThan(regularRender!.indexOf('this._setTopLevelNodes('));
		expect(
			gridRender!.indexOf('const filtered = this._nestedEnabled()'),
		).toBeLessThan(gridRender!.indexOf('this._setTopLevelNodes('));
	});

	it('captures Files table nodes from the table order that was actually rendered', () => {
		expect(gridViewSource).toContain('getDisplayedFiles(): readonly TFile[]');
		expect(filesExplorerSource).toContain(
			'this.tableView.getDisplayedFiles().map((file) => ({',
		);
	});

	it('cleans panel callbacks when reactive panel bindings are replaced', () => {
		const callbackName = frameSource.indexOf('bumpExplorerRenderRevision');
		const effectStart = frameSource.indexOf('$effect(() => {', callbackName);
		const effectEnd = frameSource.indexOf('\n\t});', effectStart);
		const effect = frameSource.slice(effectStart, effectEnd + '\n\t});'.length);

		expect(effectStart).toBeGreaterThan(-1);
		expect(effectEnd).toBeGreaterThan(effectStart);
		expect(effect).toContain('return () =>');
		expect(effect).toMatch(
			/if \(\s*panel\.onTopLevelNodesChanged === bumpExplorerRenderRevision\s*\)/,
		);
	});

	it('keeps the rail disabled by default and gated away from Content', () => {
		expect(DEFAULT_SETTINGS.floatingTocEnabled).toBe(false);
		expect(frameSource).toContain("filtersActiveTab !== 'content'");
		expect(frameSource).toContain("activePage === 'filters'");
		expect(floatingTocSource).toContain('{#if visible && groups.length > 1}');
	});

	it('allows pointer passthrough outside the static rail', () => {
		expect(stylesSource).toMatch(
			/\.vaultman-floating-toc-wrap \{[\s\S]*?pointer-events:\s*none;/,
		);
		expect(stylesSource).toMatch(
			/\.vaultman-floating-toc \{[\s\S]*?pointer-events:\s*auto;/,
		);
		expect(stylesSource).toMatch(
			/\.vaultman-floating-toc-item \{[\s\S]*?pointer-events:\s*none;/,
		);
	});

	it('keeps every static glyph reachable without exposing dead controls', () => {
		expect(floatingTocSource).not.toContain('<button');
		expect(floatingTocSource).toContain('role="listitem"');
		expect(stylesSource).toMatch(
			/\.vaultman-floating-toc \{[\s\S]*?overflow-y:\s*auto;/,
		);
		expect(stylesSource).not.toMatch(
			/\.vaultman-floating-toc \{[\s\S]*?overflow:\s*hidden;/,
		);
	});
});
