import { describe, expect, it } from 'vitest';

import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';
import {
	TOOLBAR_MENU_KINDS,
	toolbarMenuActionIds,
} from '../../src/logic/logicToolbarMenuCatalog';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

/**
 * U130-110: cada accion estatica del catalogo del toolbar existe exactamente
 * una vez en SASI. Los hijos runtime (layouts guardados, grupos custom, filas
 * de scope) no son catalogo y no se exigen.
 */
describe('U130-110 toolbar menu SASI parity', () => {
	it('registra cada id del catalogo una sola vez como action', () => {
		const { registry } = createVaultmanSasi();
		const ids = TOOLBAR_MENU_KINDS.flatMap((kind) =>
			toolbarMenuActionIds(kind),
		);
		expect(ids.length).toBeGreaterThan(0);
		for (const id of ids) {
			const matches = registry
				.list('function')
				.filter((def) => def.id === id);
			expect(matches.length, `una definicion SASI para ${id}`).toBe(1);
			expect(matches[0]?.kind).toBe('action');
			expect(matches[0]?.mutatesVault).toBeUndefined();
		}
	});

	it('cada labelKey del catalogo esta traducida en en y es', () => {
		const { registry } = createVaultmanSasi();
		for (const def of registry.list('function')) {
			if (
				!TOOLBAR_MENU_KINDS.some((kind) => def.id.startsWith(`${kind}.`))
			) {
				continue;
			}
			expect(en[def.labelKey], `en: ${def.labelKey}`).toBeTruthy();
			expect(es[def.labelKey], `es: ${def.labelKey}`).toBeTruthy();
		}
	});

	it('los hijos runtime no se registran como acciones estaticas', () => {
		const { registry } = createVaultmanSasi();
		for (const id of [
			'view_menu.layouts.saved.Mi escena',
			'sort_menu.groups.custom.Mi grupo',
			'sort_menu.scope.rows.parent:abc',
			'sort_menu.by_type.files.pdf',
		]) {
			expect(registry.resolve(id).def, `sin registro para ${id}`).toBeNull();
		}
	});

	it('las 15 acciones vaultman.scene.* siguen intactas', () => {
		const { registry } = createVaultmanSasi();
		const sceneIds = registry
			.list('function')
			.map((def) => def.id)
			.filter((id) => id.startsWith('vaultman.scene.'));
		expect(sceneIds.length).toBe(15);
	});
});
