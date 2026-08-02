import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
	normalizeExplorerViewMode,
	panelViewModeForDataSurface,
	selectableViewModesForDataSurface,
	viewModesForDataSurface,
} from '../../src/logic/logicExplorerViewModes';
import {
	explorerDensityProfile,
	gridRowHeightFor,
	hasGridMetaCells,
} from '../../src/logic/logicResponsiveLayout';
import filesGridSource from '../../src/components/layout/viewFilesGrid.ts?raw';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import popupViewSource from '../../src/components/layout/popupView.svelte?raw';
import {
	cellsForExplorer,
	defaultVisibleCells,
} from '../../src/logic/logicCellRegistry';
import enSource from '../../src/i18n/en.ts?raw';
import esSource from '../../src/i18n/es.ts?raw';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

describe('BT5-016 Cards view mode rename', () => {
	it('normalizes persisted legacy grid to cards and rejects invalid values', () => {
		expect(normalizeExplorerViewMode('grid')).toBe('cards');
		expect(normalizeExplorerViewMode('cards')).toBe('cards');
		expect(normalizeExplorerViewMode('tree')).toBe('tree');
		expect(normalizeExplorerViewMode('table')).toBe('table');
		expect(normalizeExplorerViewMode(undefined)).toBe('tree');
		expect(normalizeExplorerViewMode('bogus')).toBe('tree');
	});

	it('normalization can clamp to what the surface actually offers', () => {
		expect(normalizeExplorerViewMode('grid', 'files')).toBe('cards');
		expect(normalizeExplorerViewMode('grid', 'props')).toBe('cards');
		expect(normalizeExplorerViewMode('cards', 'snippets')).toBe('tree');
		expect(normalizeExplorerViewMode('dnd', 'files')).toBe('tree');
	});

	it('offers Cards as the selectable card engine instead of Grid', () => {
		expect(
			viewModesForDataSurface('files').map((mode) => [
				mode.id,
				mode.locked ?? false,
			]),
		).toEqual([
			['tree', false],
			['table', false],
			['cards', false],
			['dnd', true],
		]);
		expect(selectableViewModesForDataSurface('files')).toEqual([
			'tree',
			'table',
			'cards',
		]);
		for (const surface of ['props', 'tags'] as const) {
			expect(selectableViewModesForDataSurface(surface)).toEqual([
				'tree',
				'cards',
				'table',
			]);
		}
	});

	it('maps cards (and legacy grid input) to the internal grid panel renderer', () => {
		expect(panelViewModeForDataSurface('files', 'cards')).toBe('grid');
		expect(panelViewModeForDataSurface('files', 'grid')).toBe('grid');
		expect(panelViewModeForDataSurface('props', 'cards')).toBe('grid');
		expect(panelViewModeForDataSurface('tags', 'grid')).toBe('grid');
		expect(panelViewModeForDataSurface('snippets', 'cards')).toBe('tree');
	});

	it('shows Cards copy and drops the legacy Grid label from both locales', () => {
		expect(enSource).not.toMatch(/'viewmode\.mode\.grid'/);
		expect(esSource).not.toMatch(/'viewmode\.mode\.grid'/);
		expect(enSource).toMatch(/'viewmode\.mode\.cards':\s*'Cards'/);
		expect(esSource).toMatch(/'viewmode\.mode\.cards':\s*'Cards'/);
	});

	it('minimal view menu no longer hides the cards option', () => {
		expect(navbarSource).not.toMatch(/option\.id !== 'cards'/);
		expect(navbarSource).toMatch(/option\.id !== 'dnd'/);
	});

	it('saved layouts normalize their persisted view mode on load', () => {
		expect(navbarSource).toMatch(/normalizeExplorerViewMode\(/);
		expect(navbarSource).not.toMatch(/saved\.viewMode as ExplorerViewMode/);
	});

	it('cells resolve identically for cards and for legacy grid', () => {
		// BT5-010 moved pill selection into the registry; BT5-016's rule that a
		// persisted 'grid' behaves as Cards must survive that move.
		expect(defaultVisibleCells('files', 'cards')).toEqual(
			defaultVisibleCells('files', 'grid'),
		);
		expect(cellsForExplorer('files', 'cards').map((cell) => cell.id)).toEqual(
			cellsForExplorer('files', 'grid').map((cell) => cell.id),
		);
		// And the popup asks the registry rather than keeping its own map.
		expect(popupViewSource).toContain('logicCellRegistry');
	});
});

describe('BT5-016 natural card height without active meta cells', () => {
	it('detects which visible cells produce card metadata', () => {
		expect(hasGridMetaCells(new Set(['icon', 'name']))).toBe(false);
		expect(hasGridMetaCells(new Set())).toBe(false);
		expect(hasGridMetaCells(new Set(['icon', 'name', 'nested']))).toBe(false);
		for (const metaCell of ['ext', 'count', 'words', 'mtime', 'ctime']) {
			expect(hasGridMetaCells(new Set(['icon', 'name', metaCell]))).toBe(true);
		}
	});

	it('collapses the virtual row height when no meta cells are active', () => {
		const desktop = explorerDensityProfile(false);
		const mobile = explorerDensityProfile(true);
		expect(gridRowHeightFor(desktop, true)).toBe(desktop.gridRowHeight);
		expect(gridRowHeightFor(mobile, true)).toBe(mobile.gridRowHeight);
		expect(gridRowHeightFor(desktop, false)).toBe(72);
		expect(gridRowHeightFor(mobile, false)).toBe(92);
	});

	it('files grid renders compact cards and skips the empty metadata box', () => {
		expect(filesGridSource).toMatch(/hasGridMetaCells/);
		expect(filesGridSource).toMatch(/gridRowHeightFor/);
		expect(filesGridSource).toMatch(/vaultman-files-grid-card--compact/);
		// The meta row must not be created unconditionally anymore.
		expect(filesGridSource).not.toMatch(
			/const metaRow = card\.createDiv\(\{ cls: 'vaultman-files-grid-card-meta' \}\);\n\t\tif \(this\.visibleCells\.has\('ext'\)/,
		);
	});
});

describe('BT5-016 repair: stable window and measurable wrapping', () => {
	it('clamps out-of-range scrollTop instead of producing a blank window', async () => {
		const { buildVirtualGridWindow } =
			await import('../../src/utils/gridVirtualization');
		const rows = Array.from({ length: 100 }, (_, index) => index);
		// Old bottom position measured with rowHeight 92 (100*92 - 300 viewport)
		// replayed against the shrunken rowHeight 72 (total 7200).
		const projection = buildVirtualGridWindow({
			rows,
			scrollTop: 8900,
			viewportHeight: 300,
			rowHeight: 72,
			columnCount: 1,
			overscanRows: 2,
		});
		expect(projection.visibleRows.length).toBeGreaterThan(0);
		expect(projection.endRow).toBe(99);
		expect(projection.startRow).toBeLessThanOrEqual(projection.endRow);
		expect(projection.visibleRows.some((item) => item.index === 99)).toBe(true);
	});

	it('re-anchors the scroll position when the row height changes', () => {
		expect(filesGridSource).toMatch(/lastRowHeight/);
		expect(filesGridSource).toMatch(/scrollTop\s*=/);
	});

	it('measures the real card height per cell configuration', () => {
		expect(filesGridSource).toMatch(/measureCardRowHeight|measuredRowHeight/);
		expect(filesGridSource).toMatch(/vaultman-files-grid-card-probe/);
		expect(filesGridSource).toMatch(/gridMetaSampleValues/);
	});

	it('provides worst-case meta samples for every active meta cell', async () => {
		const { gridMetaSampleValues } =
			await import('../../src/logic/logicResponsiveLayout');
		expect(gridMetaSampleValues(new Set(['icon', 'name']))).toEqual([]);
		const samples = gridMetaSampleValues(
			new Set(['ext', 'count', 'words', 'mtime', 'ctime']),
		);
		expect(samples).toHaveLength(5);
		for (const sample of samples) {
			expect(sample.length).toBeGreaterThan(0);
		}
	});

	it('lets cards grow naturally and wraps the metadata row', () => {
		const cardBlock = stylesSource.match(
			/\.vaultman-files-grid-card \{[^}]+\}/,
		)?.[0];
		expect(cardBlock).toBeDefined();
		expect(cardBlock).not.toMatch(/\bheight: 82px/);
		const metaBlocks =
			stylesSource.match(/\.vaultman-files-grid-card-meta \{[^}]+\}/g) ?? [];
		expect(metaBlocks.length).toBeGreaterThan(0);
		expect(metaBlocks.some((block) => /flex-wrap: wrap/.test(block))).toBe(
			true,
		);
	});
});
