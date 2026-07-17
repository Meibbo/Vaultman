import { describe, expect, it } from 'vitest';

import frameSource from '../../src/VaultmanFrame.svelte?raw';
import filesGridSource from '../../src/components/layout/viewFilesGrid.ts?raw';
import fileTableSource from '../../src/components/layout/viewGrid.ts?raw';
import nodeTableSource from '../../src/components/layout/viewNodeTable.ts?raw';
import treeSource from '../../src/components/layout/viewTree.ts?raw';

describe('responsive density source guards', () => {
	it('feeds measured frame width into the Filters page', () => {
		expect(frameSource).toContain('let frameWidth = $state(0)');
		expect(frameSource).toContain('frameWidth = w');
		expect(frameSource).toContain('{frameWidth}');
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
