import { describe, expect, it } from 'vitest';

import {
	panelViewModeForDataSurface,
	selectableViewModesForDataSurface,
	viewModesForDataSurface,
} from '../../src/logic/logicExplorerViewModes';

describe('explorer view mode availability', () => {
	it('exposes Files table as the repaired table renderer without pretending it is grid', () => {
		const filesModes = viewModesForDataSurface('files');

		expect(filesModes.map((mode) => [mode.id, mode.locked ?? false])).toEqual([
			['tree', false],
			['table', false],
			['grid', true],
			['dnd', true],
			['cards', true],
		]);
		expect(selectableViewModesForDataSurface('files')).toEqual([
			'tree',
			'table',
		]);
		expect(panelViewModeForDataSurface('files', 'table')).toBe('grid');
	});

	it('exposes Props and Tags table after the generic node table renderer is available', () => {
		for (const surface of ['props', 'tags'] as const) {
			expect(selectableViewModesForDataSurface(surface)).toEqual([
				'tree',
				'grid',
				'table',
			]);
			expect(panelViewModeForDataSurface(surface, 'grid')).toBe('grid');
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
});
