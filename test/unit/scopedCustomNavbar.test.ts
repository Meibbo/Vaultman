import { describe, expect, it } from 'vitest';
import { groupMenuModel } from '../../src/logic/logicSortMenu';
import {
	makeScopedGroupKey,
	parseScopedGroupKey,
	scopedNameOf,
} from '../../src/logic/logicScopedCustomGroups';
import navbarFiltersSource from '../../src/components/layout/navbarFilters.svelte?raw';
import popupSortSource from '../../src/components/layout/popupSort.svelte?raw';

/**
 * U130-GGC-011 lado navbar/menú.
 *
 * El codec vive en `logicScopedCustomGroups.ts` (no se edita aquí): la clave
 * interna es `vaultman.custom.v1:<target>:<nombre>` y el `id` de menú es esa
 * clave tal cual. Estos tests fijan el contrato del lado navbar/menú:
 * - mismo nombre en L1 y parent no colisiona (IDs compuestos distintos),
 * - hide/delete aíslan por ID compuesto,
 * - el menú muestra scope/level/parent en el título sin la clave interna,
 * - el suggester sólo ofrece el target actual con label humano.
 */

const LEVEL_TARGET = 'level:1' as const;
const PARENT_TARGET = 'parent:folder:A' as const;
const NAME = 'Mismo';

function menuTitles(ids: readonly string[]): string[] {
	return ids.map((id) => scopedNameOf(id));
}

describe('U130-GGC-011 navbar/menú scoped custom', () => {
	it('L1+parent con mismo nombre: IDs compuestos distintos, label humano sin clave interna', () => {
		const levelId = makeScopedGroupKey(LEVEL_TARGET, NAME);
		const parentId = makeScopedGroupKey(PARENT_TARGET, NAME);
		expect(levelId).not.toBe(parentId);
		expect(parseScopedGroupKey(levelId).target).toBe(LEVEL_TARGET);
		expect(parseScopedGroupKey(parentId).target).toBe(PARENT_TARGET);
		expect(scopedNameOf(levelId)).toBe(NAME);
		expect(scopedNameOf(parentId)).toBe(NAME);

		// El menú opera por ID compuesto: dos filas distintas, mismo label humano.
		const model = groupMenuModel(
			'files',
			{ kind: 'custom', direction: 'asc' },
			[
				{ id: levelId, label: scopedNameOf(levelId) },
				{ id: parentId, label: scopedNameOf(parentId) },
			],
			true,
		);
		const rows = model.items.filter((item) => item.kind === 'custom-group');
		expect(rows).toHaveLength(2);
		const ids = rows.map((item) => (item.kind === 'custom-group' ? item.id : ''));
		expect(new Set(ids).size).toBe(2);
		expect(ids).toContain(levelId);
		expect(ids).toContain(parentId);
		for (const item of rows) {
			expect(item.kind).toBe('custom-group');
			if (item.kind !== 'custom-group') continue;
			expect(item.label).toBe(NAME);
			// La clave interna versionada nunca se pinta como título.
			expect(item.label).not.toContain('vaultman.custom.v1');
			expect(item.id).toContain('vaultman.custom.v1');
		}
		expect(menuTitles(ids)).toEqual([NAME, NAME]);
	});

	it('hide aislado por ID compuesto: solo el dueño se marca', () => {
		const levelId = makeScopedGroupKey(LEVEL_TARGET, NAME);
		const parentId = makeScopedGroupKey(PARENT_TARGET, NAME);
		const hidden = new Set([levelId]);
		const model = groupMenuModel(
			'files',
			{ kind: 'custom', direction: 'asc' },
			[
				{ id: levelId, label: NAME, hidden: hidden.has(levelId) },
				{ id: parentId, label: NAME, hidden: hidden.has(parentId) },
			],
			true,
		);
		const rows = model.items.filter((item) => item.kind === 'custom-group');
		expect(rows).toHaveLength(2);
		const levelRow = rows.find(
			(item) => item.kind === 'custom-group' && item.id === levelId,
		);
		const parentRow = rows.find(
			(item) => item.kind === 'custom-group' && item.id === parentId,
		);
		expect(levelRow).toMatchObject({ hidden: true, icon: 'lucide-eye-off' });
		expect(parentRow).toMatchObject({ hidden: false, icon: 'lucide-box' });
	});

	it('delete aislado por ID compuesto: solo la clave dueña desaparece', () => {
		const levelId = makeScopedGroupKey(LEVEL_TARGET, NAME);
		const parentId = makeScopedGroupKey(PARENT_TARGET, NAME);
		const memberships: Record<string, readonly string[]> = {
			[levelId]: ['files:file:a|a'],
			[parentId]: ['files:file:b|b'],
		};
		// Misma operación que `deleteCustomGroup(tab, id)` en navbar: quita una clave.
		const { [levelId]: _removed, ...rest } = memberships;
		expect(Object.keys(rest)).toEqual([parentId]);
		expect(rest[parentId]).toEqual(['files:file:b|b']);
		// Los customs de otros targets no colisionan: el parent sobrevive intacto.
		expect(parseScopedGroupKey(Object.keys(rest)[0] ?? '').target).toBe(
			PARENT_TARGET,
		);
	});

	it('label por target: suggester filtra al target actual, menú distingue con scope', () => {
		const levelId = makeScopedGroupKey(LEVEL_TARGET, NAME);
		const parentId = makeScopedGroupKey(PARENT_TARGET, NAME);
		const allIds = [levelId, parentId];

		// Suggester: sólo el target actual, con label humano.
		const suggesterIds = allIds.filter(
			(id) => parseScopedGroupKey(id).target === LEVEL_TARGET,
		);
		expect(suggesterIds).toEqual([levelId]);
		expect(suggesterIds.map(scopedNameOf)).toEqual([NAME]);

		// Menú (sin filtro): muestra scope/level/parent en el título.
		// `customGroupsForMenu(tab)` compone `${nombre} · ${scopeLabel}` y nunca
		// la clave interna; aquí se fija el contrato mínimo del título.
		const menuLabels = [
			`${NAME} · Level 1`,
			`${NAME} · parentLabel`,
		];
		for (const label of menuLabels) {
			expect(label).toContain(NAME);
			expect(label).not.toContain('vaultman.custom.v1');
		}
		expect(menuLabels[0]).toContain('Level 1');
		expect(menuLabels[1]).not.toContain('vaultman.custom.v1');
	});

	it('fuente navbar: codec + target activo + preset por target, sin normalizador persistido', () => {
		// Codec existente, sin reimplementar la clave.
		expect(navbarFiltersSource).toContain('makeScopedGroupKey');
		expect(navbarFiltersSource).toContain('parseScopedGroupKey');
		// Target activo derivado del scope de orden (all/level/parent).
		expect(navbarFiltersSource).toContain('currentCustomGroupTarget');
		expect(navbarFiltersSource).toContain('storageScope(');
		// Creación/materialize escriben claves compuestas y reutilizan legacy en all.
		expect(navbarFiltersSource).toContain('customGroupStorageId');
		expect(navbarFiltersSource).toContain(
			'snapshot.scopeTarget ?? currentCustomGroupTarget',
		);
		// Suggester sólo del target actual con label humano.
		expect(navbarFiltersSource).toContain(
			'customGroupsForMenu(tab, groupTarget)',
		);
		// Título con scope/level/parent resuelto con el panel (sin clave interna).
		expect(navbarFiltersSource).toContain('customGroupScopeLabel');
		expect(navbarFiltersSource).toContain('sortNodeLabel');
		expect(navbarFiltersSource).not.toMatch(
			/label:\s*id[\s\S]{0,40}vaultman\.custom\.v1/,
		);
		// Preset custom por target, sin sustituir otro target.
		expect(navbarFiltersSource).toContain('scopeState.sets[target]');
		expect(navbarFiltersSource).toContain('cloneGroupPreset(next');
		// Degroup direcciona el ID dueño (composite), no el nombre.
		expect(navbarFiltersSource).toContain('removeCustomMemberships(memberships, owner,');
		// Nunca persistir el normalizador con conflicts (descartaría URNs).
		expect(navbarFiltersSource).not.toContain('normalizeScopedCustomGroups');
	});

	it('fuente popup: hide/delete operan por ID compuesto', () => {
		expect(popupSortSource).toContain('customGroups.find((entry) => entry.id === id)');
		expect(popupSortSource).toContain('onHideGroup?.(id,');
		expect(popupSortSource).toContain('onDeleteGroup?.(id)');
		expect(popupSortSource).toContain('groupMenuModel(');
		// El título del custom es su label humano (con scope compuesto en navbar),
		// nunca la clave interna.
		expect(popupSortSource).toContain("if (item.kind === 'custom-group') return item.label");
	});
});
