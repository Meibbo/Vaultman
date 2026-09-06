import { describe, expect, it } from 'vitest';
import { sortScopeOptions, supportsByLevel } from '../../src/logic/logicSortMenu';
import { scopesForTab } from '../../src/logic/logicScopedSort';
import type { ExplorerTabId } from '../../src/types/typeUI';

const TABS: readonly ExplorerTabId[] = [
	'props',
	'files',
	'tags',
	'snippets',
	'plugins',
];

describe('U130-03: el scope groups esta en los TRES sitios', () => {
	it('el menu ofrece exactamente los scopes que la tab declara', () => {
		// La puerta contra U121-079: un nivel de scope a medias ordena mal y
		// callado. Derivar el menu de SCOPES_BY_TAB hace que no pueda volver a
		// desincronizarse.
		for (const tab of TABS) {
			expect(sortScopeOptions(tab).map((option) => option.scope)).toEqual([
				...scopesForTab(tab),
			]);
		}
	});

	it('groups sale en las cinco tabs', () => {
		for (const tab of TABS) {
			expect(sortScopeOptions(tab).map((o) => o.scope)).toContain('groups');
		}
	});

	it('cada opcion trae icono y clave de etiqueta', () => {
		for (const tab of TABS) {
			for (const option of sortScopeOptions(tab)) {
				expect(option.icon).toBeTruthy();
				expect(option.labelKey).toBeTruthy();
			}
		}
	});

	it('supportsByLevel concuerda con los scopes que la tab declara', () => {
		// La puerta real de U130-003: derivar la LISTA no sirve de nada si la
		// condicion que decide si se dibuja sigue escrita a mano.
		for (const tab of TABS) {
			expect(supportsByLevel(tab)).toBe(scopesForTab(tab).length > 1);
		}
	});

	it('snippets y plugins ofrecen el selector de scope', () => {
		for (const tab of ['snippets', 'plugins'] as const) {
			expect(supportsByLevel(tab)).toBe(true);
		}
	});
});
