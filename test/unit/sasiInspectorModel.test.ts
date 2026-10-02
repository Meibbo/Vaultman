import { describe, expect, it, vi } from 'vitest';
vi.mock('../../src/components/layout/apiSceneHost.svelte', () => ({ default: {} }));
import { buildSasiInspectorModel } from '../../src/modals/modalSasiInspector';
import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';
import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
// Guarda negativa: el menu de providers del sidebar. Si el modal apareciera
// ahi, esta fuente lo nombraria con su simbolo exacto.
import navbarTabsSource from '../../src/components/layout/navbarTabs.svelte?raw';

describe('U130-01: el inspector de SASI', () => {
	const { registry } = createVaultmanSasi();

	it('lista los TRES ejes, no solo el que esta lleno', () => {
		// Es la puerta que prueba que el registro nacio con forma de tres ejes.
		// Un inspector que solo sabe de acciones habria probado lo contrario.
		const model = buildSasiInspectorModel(registry);
		expect(model.map((section) => section.axis)).toEqual([
			'provider',
			'kind',
			'function',
		]);
	});

	it('proyecta el catalogo de nodos, paneles, modos y contextos', () => {
		const model = buildSasiInspectorModel(registry);
		const kinds = model.find((section) => section.axis === 'kind');
		expect(kinds).toBeDefined();
		const settingSceneKindIds = [
			'node_settings',
			'node_group',
			'node_group_custom',
			'cell_badge_update',
			'panelExplorer',
			'panelContent',
			'settings-explorer',
			'settings-content',
			'settingScene.toolbar',
			'node_plugin.cmenu',
			'node_group.cmenu',
		];
		expect(
			kinds?.entries
				.filter((entry) => settingSceneKindIds.includes(entry.id))
				.map((entry) => entry.id),
		).toEqual(settingSceneKindIds);
		expect(
			kinds?.entries
				.filter((entry) =>
					[
						'node_settings',
						'node_group',
						'node_group_custom',
						'cell_badge_update',
					].includes(entry.id),
				)
				.map((entry) => entry.surfaces),
		).toEqual([
			['settingScene'],
			['settingScene'],
			['settingScene'],
			['settingScene'],
		]);
	});

	it('un eje vacio se proyecta VACIO, no se oculta', () => {
		// Un eje que desaparece no le dice al agente que consulta que existe
		// pero esta sin poblar, que es justo lo que necesita saber.
		const empty = buildSasiInspectorModel(createSasiRegistry());
		const kinds = empty.find((section) => section.axis === 'kind');
		expect(kinds).toBeDefined();
		expect(kinds?.entries).toEqual([]);
		// Correctiva U130L: en el bootstrap real kind/provider ya van
		// poblados (node_apis + providers Scene); el modelo los muestra.
		const real = buildSasiInspectorModel(registry);
		expect(
			real.find((s) => s.axis === 'kind')?.entries.map((e) => e.id),
		).toContain('vaultman.kind.node_apis');
		expect(
			real.find((s) => s.axis === 'provider')?.entries.length,
		).toBeGreaterThan(0);
	});

	it('dentro de FUNCTIONS separa las tres categorias', () => {
		const functions = buildSasiInspectorModel(registry).find(
			(section) => section.axis === 'function',
		);
		const kinds = new Set(functions?.entries.map((entry) => entry.kind));
		expect(kinds.has('operation')).toBe(true);
		expect(kinds.has('action')).toBe(true);
	});

	it('marca cual escribe en el vault', () => {
		const functions = buildSasiInspectorModel(registry).find(
			(section) => section.axis === 'function',
		);
		const proceed = functions?.entries.find(
			(entry) => entry.id === 'vaultman.move.proceed',
		);
		expect(proceed?.mutatesVault).toBe(true);
		const cancel = functions?.entries.find(
			(entry) => entry.id === 'vaultman.move.cancel',
		);
		expect(cancel?.mutatesVault).toBe(false);
	});

	it('dice en que superficies se puede hospedar cada entrada', () => {
		// Es la mitad de "que es cada cosa y DONDE ESTA", que es para lo que
		// existe SASI.
		const functions = buildSasiInspectorModel(registry).find(
			(section) => section.axis === 'function',
		);
		const toggleKind = functions?.entries.find(
			(entry) => entry.id === 'vaultman.move.toggleMoveKind',
		);
		expect(toggleKind?.surfaces).toEqual(['statusBar']);
	});

	it('no se expone en el providers_menu del sidebar (intent §7.2)', () => {
		// El inspector vive bajo Settings → Developer tools. Si alguien lo
		// cableara al menu de providers del sidebar, esta fuente nombraria su
		// simbolo exacto y la guarda caeria.
		expect(navbarTabsSource).not.toContain('SasiInspectorModal');
		expect(navbarTabsSource).not.toContain('sasiInspector');
	});
});
