import { describe, expect, it } from 'vitest';
import {
	SEARCH_CATEGORY_ICONS,
	searchCellFace,
	searchCellIds,
	searchCellToggleState,
	type SearchCellContext,
} from '../../src/logic/logicSearchCellProjection';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

const base: SearchCellContext = {
	tab: 'props',
	categoryIndex: 0,
	canCreate: true,
	createIcon: 'lucide-plus',
	moveToggles: null,
};

describe('U130-05b: el reparto del searchbox', () => {
	it('en reposo proyecta categoria y crear, en ese orden', () => {
		expect(searchCellIds(base)).toEqual([
			'vaultman.search.cycleCategory',
			'vaultman.search.createTarget',
		]);
	});

	it('con el move mode activo manda el, y los otros dos no salen', () => {
		const ids = searchCellIds({
			...base,
			moveToggles: { write: 'append', originDisposition: 'move' },
		});
		expect(ids).toEqual([
			'vaultman.move.toggleWrite',
			'vaultman.move.toggleOriginDisposition',
		]);
		expect(ids).not.toContain('vaultman.search.cycleCategory');
	});

	it('en snippets y plugins el decorador sale VACIO', () => {
		// Hoy la categoria solo sale si la pestana tiene mas de una, y crear solo
		// si canCreate. En estas dos no hay ni una cosa ni la otra. Sigue igual:
		// es el criterio de aceptacion.
		for (const tab of ['snippets', 'plugins'] as const) {
			expect(searchCellIds({ ...base, tab, canCreate: false })).toEqual([]);
		}
	});

	it('un control no aplicable NO se pinta deshabilitado: no se pinta', () => {
		expect(searchCellIds({ ...base, canCreate: false })).toEqual([
			'vaultman.search.cycleCategory',
		]);
	});

	it('la cara de la categoria CICLA con el indice', () => {
		const first = searchCellFace('vaultman.search.cycleCategory', base);
		const second = searchCellFace('vaultman.search.cycleCategory', {
			...base,
			categoryIndex: 1,
		});
		expect(first?.icon).toBe(SEARCH_CATEGORY_ICONS.props[0]);
		expect(second?.icon).toBe(SEARCH_CATEGORY_ICONS.props[1]);
		expect(first?.labelKey).not.toBe(second?.labelKey);
	});

	it('un indice fuera de rango no rompe: cicla', () => {
		// `filtersSearchCategory` lo escribe el host y sobrevive a cambios de
		// pestana, asi que puede llegar un 1 a una pestana de una sola categoria.
		const face = searchCellFace('vaultman.search.cycleCategory', {
			...base,
			tab: 'files',
			categoryIndex: 5,
		});
		expect(face?.icon).toBe(SEARCH_CATEGORY_ICONS.files[1]);
	});

	it('cada toggle se etiqueta con el estado en el que ESTA', () => {
		const appended: SearchCellContext = {
			...base,
			moveToggles: { write: 'append', originDisposition: 'move' },
		};
		expect(searchCellFace('vaultman.move.toggleWrite', appended)?.labelKey).toBe(
			'explorer.move_to_prop.write.append',
		);
		const replaced: SearchCellContext = {
			...base,
			moveToggles: { write: 'replace', originDisposition: 'copy' },
		};
		expect(searchCellFace('vaultman.move.toggleWrite', replaced)?.labelKey).toBe(
			'explorer.move_to_prop.write.replace',
		);
		expect(
			searchCellFace('vaultman.move.toggleOriginDisposition', replaced)?.labelKey,
		).toBe('explorer.move_to_prop.origin.copy');
	});

	it('el icono de origen distingue move de copy', () => {
		const moving: SearchCellContext = {
			...base,
			moveToggles: { write: 'append', originDisposition: 'move' },
		};
		const copying: SearchCellContext = {
			...base,
			moveToggles: { write: 'append', originDisposition: 'copy' },
		};
		expect(
			searchCellFace('vaultman.move.toggleOriginDisposition', moving)?.icon,
		).toBe('lucide-scissors');
		expect(
			searchCellFace('vaultman.move.toggleOriginDisposition', copying)?.icon,
		).toBe('lucide-copy');
	});

	it('un id que no esta en el reparto no tiene cara', () => {
		expect(searchCellFace('vaultman.move.toggleWrite', base)).toBeNull();
	});

	it('solo los toggles publican estado pulsado', () => {
		// Categoria y crear no son toggles: darles aria-pressed diria que lo son.
		const state = searchCellToggleState({
			...base,
			moveToggles: { write: 'replace', originDisposition: 'move' },
		});
		expect(Object.keys(state).sort()).toEqual([
			'vaultman.move.toggleOriginDisposition',
			'vaultman.move.toggleWrite',
		]);
		expect(state['vaultman.move.toggleWrite']).toBe(true);
		expect(state['vaultman.move.toggleOriginDisposition']).toBe(false);
		expect(searchCellToggleState(base)).toEqual({});
	});

	it('toda cara proyectable tiene traduccion en los dos idiomas', () => {
		// Una labelKey sin traducir sale como la clave cruda en el aria-label, y
		// eso no se ve en ningun test que solo mire ids.
		const contexts: SearchCellContext[] = [
			...(['props', 'tags', 'files', 'snippets', 'plugins'] as const).flatMap(
				(tab) => [0, 1].map((categoryIndex) => ({ ...base, tab, categoryIndex })),
			),
			{ ...base, moveToggles: { write: 'append', originDisposition: 'move' } },
			{ ...base, moveToggles: { write: 'replace', originDisposition: 'copy' } },
		];
		for (const ctx of contexts) {
			for (const id of searchCellIds(ctx)) {
				const key = searchCellFace(id, ctx)!.labelKey;
				expect(en[key], `en: ${key}`).toBeTruthy();
				expect(es[key], `es: ${key}`).toBeTruthy();
			}
		}
	});
});
