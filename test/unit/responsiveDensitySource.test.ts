import { describe, expect, it } from 'vitest';

import frameSource from '../../src/VaultmanFrame.svelte?raw';
import filtersPageSource from '../../src/components/pages/pageFilters.svelte?raw';
import filesGridSource from '../../src/components/layout/viewFilesGrid.ts?raw';
import fileTableSource from '../../src/components/layout/viewGrid.ts?raw';
import nodeTableSource from '../../src/components/layout/viewNodeTable.ts?raw';
import treeSource from '../../src/components/layout/viewTree.ts?raw';

describe('responsive density source guards', () => {
	it('feeds measured frame width into the Filters provider projection', () => {
		// The Scene frame measures; the Filters page owns its own projection and
		// carries the measurement into it. The frame does not publish on its
		// behalf — `panelWidgetHostSource` locks that negative.
		expect(frameSource).toContain('let frameWidth = $state(0)');
		expect(frameSource).toContain('frameWidth = w');
		expect(frameSource).toContain('<FiltersPage');
		expect(frameSource).toContain('{frameWidth}');
		expect(filtersPageSource).toContain('frameWidth?: number');
		const projection = filtersPageSource.slice(
			// Robusto: el ancla es la declaracion del estado, sea cual sea su
			// anotacion de tipo Y donde prettier decida cortar la linea -- exigir
			// `= {` junto dejaba el guard en silencio (search -> -1, slice vacio)
			// en cuanto el formateador movia la llave de linea.
			filtersPageSource.search(/const state: NavbarPanelWidgetState[^=]*=\s*\{/),
			filtersPageSource.indexOf('onPanelWidgetStateChange?.(state)'),
		);
		expect(projection).not.toBe('');
		expect(projection).toContain('frameWidth,');
		expect(filtersPageSource).toContain('onPublishPanelWidget?.({');
	});

	it('keeps virtual geometry aligned with the mobile density profile', () => {
		for (const source of [
			treeSource,
			fileTableSource,
			nodeTableSource,
			filesGridSource,
		]) {
			expect(source).toContain('Platform.isMobile');
			expect(source).toContain('explorerDensityProfile');
		}
	});

	it('subtracts reserved-lane padding from every virtualized table/grid width', () => {
		for (const source of [fileTableSource, nodeTableSource, filesGridSource]) {
			expect(source).toContain('elementContentWidth');
		}
	});
});
