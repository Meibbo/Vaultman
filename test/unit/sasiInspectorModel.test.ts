import { describe, expect, it } from 'vitest';
import { buildSasiInspectorModel } from '../../src/modals/modalSasiInspector';
import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';
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

	it('un eje vacio se proyecta VACIO, no se oculta', () => {
		// Un eje que desaparece no le dice al agente que consulta que existe
		// pero esta sin poblar, que es justo lo que necesita saber.
		const model = buildSasiInspectorModel(registry);
		const kinds = model.find((section) => section.axis === 'kind');
		expect(kinds).toBeDefined();
		expect(kinds?.entries).toEqual([]);
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
