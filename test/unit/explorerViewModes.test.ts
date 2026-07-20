import { describe, expect, it } from 'vitest';

import {
	panelViewModeForDataSurface,
	selectableViewModesForDataSurface,
	viewModesForDataSurface,
} from '../../src/logic/logicExplorerViewModes';

describe('explorer view mode availability', () => {
	it('exposes Files table as the repaired table renderer alongside Cards', () => {
		const filesModes = viewModesForDataSurface('files');

		expect(filesModes.map((mode) => [mode.id, mode.locked ?? false])).toEqual([
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
		expect(panelViewModeForDataSurface('files', 'table')).toBe('table');
		expect(panelViewModeForDataSurface('files', 'cards')).toBe('grid');
	});

	it('exposes Props and Tags table after the generic node table renderer is available', () => {
		for (const surface of ['props', 'tags'] as const) {
			expect(selectableViewModesForDataSurface(surface)).toEqual([
				'tree',
				'cards',
				'table',
			]);
			expect(panelViewModeForDataSurface(surface, 'cards')).toBe('grid');
			expect(panelViewModeForDataSurface(surface, 'table')).toBe('table');
			expect(
				viewModesForDataSurface(surface).find((mode) => mode.id === 'table')
					?.locked ?? false,
			).toBe(false);
		}
	});

	it('does not expose explorer view modes for Content yet', () => {
		expect(viewModesForDataSurface('content')).toEqual([]);
		expect(selectableViewModesForDataSurface('content')).toEqual([]);
	});

	it('keeps flat add-on adapters on their operational tree renderer', () => {
		for (const surface of ['snippets', 'plugins'] as const) {
			expect(viewModesForDataSurface(surface).map((mode) => mode.id)).toEqual([
				'tree',
			]);
			expect(selectableViewModesForDataSurface(surface)).toEqual(['tree']);
			expect(panelViewModeForDataSurface(surface, 'grid')).toBe('tree');
		}
	});
});
