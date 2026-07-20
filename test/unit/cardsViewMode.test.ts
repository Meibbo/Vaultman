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
import enSource from '../../src/i18n/en.ts?raw';
import esSource from '../../src/i18n/es.ts?raw';

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

	it('view popup keys files pills off the cards mode', () => {
		expect(popupViewSource).toMatch(/view === 'cards'.*files-grid/s);
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
