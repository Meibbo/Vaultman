import { describe, expect, it } from 'vitest';

import {
	cloneScopeState,
	defaultScopeForTab,
	normalizeExplorerSortState,
	normalizeScopeDefaultCursor,
	replaceActiveScopeSort,
	resolveScopeSet,
	scopeStateFromLegacy,
} from '../../src/logic/logicScopedSort';
import { scopeMenuModel } from '../../src/logic/logicSortMenu';
import { DEFAULT_SETTINGS } from '../../src/types/typeSettings';
import scopedSource from '../../src/logic/logicScopedSort.ts?raw';
import sortMenuSource from '../../src/logic/logicSortMenu.ts?raw';
import navbarSource from '../../src/components/layout/navbarFilters.svelte?raw';
import settingsSource from '../../src/types/typeSettings.ts?raw';
import type {
	ExplorerSortState,
	ExplorerTabId,
	ScopeSort,
	ScopeState,
	SortScopeKey,
} from '../../src/types/typeUI';

function scene(canPickParent = true, canPickLevel = true) {
	return {
		parentLabel: (id: string) =>
			id === 'folder:Projects' ? 'Projects' : id.startsWith('folder:') ? id : null,
		parentLevel: (id: string) => (id === 'folder:Projects' ? 1 : 2),
		sortLabel: (sort: ScopeSort) => `${sort.sortBy} ${sort.direction}`,
		levelLabel: (level: number | string) => `Level ${level}`,
		allLevelsLabel: () => 'All levels',
		canPickParent,
		canPickLevel,
	};
}

function stateFor(
	tab: ExplorerTabId,
	overrides: Partial<ExplorerSortState> = {},
): ExplorerSortState {
	return { ...normalizeExplorerSortState(tab, null), ...overrides };
}

describe('U130-GGC-025 — default scope Level 1 y All levels configurado', () => {
	it('una escena nueva abre en level:1 en tabs jerárquicas y en all en addons', () => {
		for (const tab of ['props', 'files', 'tags'] as const) {
			const fresh = normalizeExplorerSortState(tab, null);
			expect(fresh.activeScope).toBe('level:1');
			expect(scopeStateFromLegacy(tab, undefined).cursor).toBe('level:1');
			expect(defaultScopeForTab(tab)).toBe('level:1');
		}
		for (const tab of ['snippets', 'plugins'] as const) {
			expect(normalizeExplorerSortState(tab, null).activeScope).toBe('all');
			expect(scopeStateFromLegacy(tab, undefined).cursor).toBe('all');
			expect(defaultScopeForTab(tab)).toBe('all');
		}
	});

	it('Settings solo elige el cursor inicial y nunca reescribe los sets', () => {
		expect(DEFAULT_SETTINGS.scopeDefaultCursor).toBe('level:1');
		expect(normalizeScopeDefaultCursor('all')).toBe('all');
		expect(normalizeScopeDefaultCursor('level:1')).toBe('level:1');
		expect(normalizeScopeDefaultCursor('bogus')).toBe('level:1');
		expect(normalizeScopeDefaultCursor(undefined)).toBe('level:1');
		// Un override a `all` es visitable en tabs jerárquicas…
		expect(defaultScopeForTab('props', 'all')).toBe('all');
		expect(defaultScopeForTab('props', 'level:1')).toBe('level:1');
		// …pero un override sin sentido cae al default del tab, no a un cursor roto.
		expect(defaultScopeForTab('props', 'bogus')).toBe('level:1');
		// Los sets existentes no se tocan al resolver el default.
		const sets: ScopeState['sets'] = {
			all: { sort: { sortBy: 'name', direction: 'asc' } },
			'level:1': { sort: { sortBy: 'modified', direction: 'desc' } },
		};
		const before = JSON.stringify(sets);
		defaultScopeForTab('props', 'all');
		expect(JSON.stringify(sets)).toBe(before);
	});

	it('el legado conserva su cursor histórico y su sort plano en all', () => {
		const legacyFlat = normalizeExplorerSortState('props', {
			sortBy: 'count',
			direction: 'desc',
			nodeTypeFilter: null,
		});
		expect(legacyFlat.sorts.all).toEqual({
			sortBy: 'count',
			direction: 'desc',
		});
		// Una escena guardada en `all` no salta a L1 al normalizar.
		const persisted = normalizeExplorerSortState('files', {
			sorts: { all: { sortBy: 'name', direction: 'asc' } },
			activeScope: 'all',
			drillNodeId: null,
			nodeTypeFilter: null,
			scopeState: { sets: { all: { sort: { sortBy: 'name', direction: 'asc' } } }, cursor: 'all' },
		});
		expect(persisted.activeScope).toBe('all');
		expect(persisted.scopeState?.cursor).toBe('all');
		expect(persisted.scopeState?.sets.all?.sort).toEqual({
			sortBy: 'name',
			direction: 'asc',
		});
	});

	it('All y L1 no se listan en scopes configurados si no tienen overrides', () => {
		const model = scopeMenuModel('files', stateFor('files'), scene());
		expect(model).not.toBeNull();
		const ids = model!.items.map((item) => item.id);
		// Solo los picks iniciales: 'all', 'drill', 'level'
		expect(ids).toEqual(['all', 'drill', 'level']);
		const all = model!.items.find((item) => item.id === 'all');
		expect(all).toMatchObject({ kind: 'pick', checked: false });
	});

	it('muestra rows configurados respetando orden (all, parents, levels ordenados)', () => {
		const model = scopeMenuModel(
			'files',
			stateFor('files', {
				activeScope: 'all',
				sorts: {
					all: { sortBy: 'name', direction: 'asc' },
					'level:1': { sortBy: 'modified', direction: 'desc' },
					'level:3': { sortBy: 'count', direction: 'asc' },
					'level:2': { sortBy: 'name', direction: 'desc' },
					'parent:folder:Projects': { sortBy: 'count', direction: 'desc' },
				},
			}),
			scene(),
		);
		const ids = model!.items.map((item) => item.id);
		expect(ids).toEqual([
			'all',
			'drill',
			'level',
			'scope-rows-separator',
			'all',
			'parent:folder:Projects',
			'level:1',
			'level:2',
			'level:3',
		]);
		// La fila L1 configurada refleja su propio sort, no el heredado de all.
		const l1 = model!.items.find((item) => item.kind === 'scope-row' && item.id === 'level:1');
		expect(l1).toMatchObject({ sortLabel: 'modified desc' });
	});

	it('nested=off oculta los picks parent/level sin dejar divisor huérfano', () => {
		const gated = scopeMenuModel('files', stateFor('files'), scene(false, false));
		const ids = gated!.items.map((item) => item.id);
		expect(ids).toEqual(['all']);
		expect(ids).not.toContain('scope-rows-separator');
		expect(ids).not.toContain('drill');
		expect(ids).not.toContain('level');

		// Con parent pick activo pero level pick inactivo
		const half = scopeMenuModel('files', stateFor('files'), scene(true, false));
		expect(half!.items.map((item) => item.id)).toEqual([
			'all',
			'drill',
		]);
	});

	it('alternar el cursor entre All y L1 preserva sorts/grupos/cells de ambos', () => {
		const base = normalizeExplorerSortState('files', {
			sorts: { all: { sortBy: 'name', direction: 'asc' } },
			activeScope: 'all',
			drillNodeId: null,
			nodeTypeFilter: null,
			scopeState: {
				cursor: 'all',
				sets: {
					all: {
						sort: { sortBy: 'name', direction: 'asc' },
						groupPreset: { kind: 'letter', direction: 'asc' },
						cellToggles: { count: true },
					},
					'level:1': {
						sort: { sortBy: 'modified', direction: 'desc' },
						groupPreset: { kind: 'words', direction: 'asc' },
						cellToggles: { icon: false },
					},
				},
			},
		});
		// Escribir el sort de L1 no toca All.
		const onL1 = replaceActiveScopeSort(
			'files',
			{ ...base, activeScope: 'level:1' },
			{ sortBy: 'count', direction: 'asc' },
		);
		expect(onL1.sorts.all).toEqual({ sortBy: 'name', direction: 'asc' });
		expect(onL1.sorts['level:1']).toEqual({ sortBy: 'count', direction: 'asc' });
		expect(onL1.scopeState?.sets.all?.groupPreset?.kind).toBe('letter');
		expect(onL1.scopeState?.sets.all?.cellToggles).toEqual({ count: true });
		expect(onL1.scopeState?.sets['level:1']?.groupPreset?.kind).toBe('words');
		// La resolución por campo sigue parent > level > all con el cursor en L1.
		const resolved = resolveScopeSet(onL1.scopeState, { level: 1 });
		expect(resolved.sort).toEqual({ sortBy: 'count', direction: 'asc' });
		expect(resolved.groupPreset?.kind).toBe('words');
		// Y el cursor no altera la proyección: mismo nodo, mismo set resuelto.
		const moved = { ...onL1.scopeState!, cursor: 'all' as const };
		expect(resolveScopeSet(moved, { level: 1 })).toEqual(resolved);
	});

	it('dos instancias están aisladas: mutar una no toca la otra', () => {
		const a = normalizeExplorerSortState('props', {
			sorts: { all: { sortBy: 'name', direction: 'asc' } },
			activeScope: 'level:1',
			drillNodeId: null,
			nodeTypeFilter: null,
			scopeState: {
				cursor: 'level:1',
				sets: { 'level:1': { sort: { sortBy: 'name', direction: 'asc' } } },
			},
		});
		const b = cloneScopeState(a.scopeState!);
		b.sets['level:1']!.sort = { sortBy: 'count', direction: 'desc' };
		b.cursor = 'all';
		expect(a.scopeState?.sets['level:1']?.sort).toEqual({
			sortBy: 'name',
			direction: 'asc',
		});
		expect(a.scopeState?.cursor).toBe('level:1');
	});

	it('la cascada de resolución es parent > level > all, independiente del orden visual', () => {
		const scope: ScopeState = {
			cursor: 'all',
			sets: {
				all: { sort: { sortBy: 'name', direction: 'asc' } },
				'level:2': { sort: { sortBy: 'count', direction: 'desc' } },
				'parent:folder:Projects': { sort: { sortBy: 'modified', direction: 'desc' } },
			},
		};
		expect(
			resolveScopeSet(scope, { level: 2, parentCanonicalId: 'folder:Projects' }).sort,
		).toEqual({ sortBy: 'modified', direction: 'desc' });
		expect(resolveScopeSet(scope, { level: 2 }).sort).toEqual({
			sortBy: 'count',
			direction: 'desc',
		});
		expect(resolveScopeSet(scope, { level: 3 }).sort).toEqual({
			sortBy: 'name',
			direction: 'asc',
		});
		// El modelo visual pone parents antes de levels en los rows configurados
		const model = scopeMenuModel(
			'files',
			stateFor('files', {
				sorts: {
					all: { sortBy: 'name', direction: 'asc' },
					'level:1': { sortBy: 'count', direction: 'desc' },
					'parent:folder:Projects': { sortBy: 'modified', direction: 'desc' },
				},
			}),
			scene(),
		);
		const visual = model!.items.map((item) => item.id);
		expect(visual.indexOf('parent:folder:Projects')).toBeLessThan(
			visual.indexOf('level:1'),
		);
		const keys = ['all', 'level:2', 'parent:folder:Projects'] as SortScopeKey[];
		expect(keys.map((k) => k)).toEqual(['all', 'level:2', 'parent:folder:Projects']);
	});

	it('fuente: el default jerárquico es level:1 y el menú ya no resetea a all', () => {
		expect(scopedSource).toContain("props: 'level:1'");
		expect(scopedSource).toContain("files: 'level:1'");
		expect(scopedSource).toContain("tags: 'level:1'");
		expect(sortMenuSource).toContain('hasConfig');
		expect(navbarSource).toContain('allLevelsLabel');
		expect(settingsSource).toContain('scopeDefaultCursor');
	});
});
