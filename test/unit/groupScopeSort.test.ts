import { describe, expect, it } from 'vitest';

import { activeScopeSort, scopesForTab } from '../../src/logic/logicScopedSort';
import type { ExplorerSortState } from '../../src/types/typeUI';

const state: ExplorerSortState = {
	sorts: {
		all: { sortBy: 'created', direction: 'desc' },
		groups: { sortBy: 'words', direction: 'asc' },
	},
	activeScope: 'all',
	nodeTypeFilter: null,
};

describe('U130-03 scope de grupos', () => {
	it('`groups` es un scope valido en las tabs que agrupan', () => {
		expect(scopesForTab('files')).toContain('groups');
		expect(scopesForTab('props')).toContain('groups');
	});

	it('los dos ordenes son independientes', () => {
		// El ejemplo del dev: agrupar por rangos de nº de palabras ascendente y
		// ordenar los nodos de dentro por fecha de creacion. Ninguna implica la
		// otra.
		expect(activeScopeSort('files', state, 'groups')).toEqual({
			sortBy: 'words',
			direction: 'asc',
		});
		expect(activeScopeSort('files', state, 'all')).toEqual({
			sortBy: 'created',
			direction: 'desc',
		});
	});

	it('sin sort de grupo cae al defecto, no al de dentro', () => {
		const sinGrupo: ExplorerSortState = {
			sorts: { all: { sortBy: 'created', direction: 'desc' } },
			activeScope: 'all',
			nodeTypeFilter: null,
		};
		// Si cayera al de `all`, agrupar cambiaria el orden de los grupos sin
		// que nadie lo pidiera: el fallo de U121-079 con otro disfraz.
		expect(activeScopeSort('files', sinGrupo, 'groups')).toEqual({
			sortBy: 'name',
			direction: 'asc',
		});
	});
});
