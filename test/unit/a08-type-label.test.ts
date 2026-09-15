import { describe, expect, it } from 'vitest';

import {
	SORT_MENU_OPTIONS,
	visibleSortOptions,
} from '../../src/logic/logicSortMenu';
import { normalizeExplorerSortState } from '../../src/logic/logicScopedSort';
import type { ExplorerSortState, ExplorerTabId } from '../../src/types/typeUI';

function stateFor(
	tab: ExplorerTabId,
	overrides: Partial<ExplorerSortState> = {},
): ExplorerSortState {
	return { ...normalizeExplorerSortState(tab, null), ...overrides };
}

/**
 * A08 · El preset/sort de files que hoy se muestra como
 * "Extension"/"Extensión" debe verse como "Type"/"Tipo". Solo cambia el
 * label de presentación: el id interno (`ext`) no se toca. RED: hoy el
 * modelo devuelve `sort.by.ext`.
 */
describe('A08 Type label in the files sort menu', () => {
	it('el modelo del menu de files devuelve el labelKey de type para ese id', () => {
		const options = visibleSortOptions('files', stateFor('files'), true);
		const entry = options.find((option) => option.id === 'ext');
		expect(entry).toBeDefined();
		expect(entry).toMatchObject({ id: 'ext', labelKey: 'sort.by.type' });
	});

	it('la definicion estatica del menu ya no referencia sort.by.ext', () => {
		const entry = SORT_MENU_OPTIONS.files.find(
			(option) => option.id === 'ext',
		);
		expect(entry).toBeDefined();
		expect(entry?.labelKey).toBe('sort.by.type');
	});
});
