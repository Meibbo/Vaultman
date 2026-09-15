import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';
import {
	SCENE_ENGINE_SURFACES,
	SCENE_GOTO_TABS,
	registerSceneInstanceActions,
	sceneEngineActionId,
	sceneEngineModes,
	sceneGotoActionId,
} from '../../src/logic/logicSasiSceneActions';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * U130 SASI scene: cada engine seleccionable por superficie y cada salto de
 * escena entran al registro como actions publicables por el inspector. Esta
 * fuente es el contrato que la rama se compromete a mantener.
 */
describe('U130 SASI scene instance actions', () => {
	it('registra 15 actions: 9 engines + 6 saltos de escena', () => {
		const registry = createSasiRegistry();
		registerSceneInstanceActions(registry);
		const expected = [
			...SCENE_ENGINE_SURFACES.flatMap((surface) =>
				sceneEngineModes(surface).map((mode) =>
					sceneEngineActionId(surface, mode),
				),
			),
			...SCENE_GOTO_TABS.map((tab) => sceneGotoActionId(tab)),
		];
		// files/props/tags x tree/table/cards + 6 escenas.
		expect(expected.length).toBe(15);
		for (const id of expected) {
			const def = registry.resolve(id).def;
			expect(def, `id registrado: ${id}`).not.toBeNull();
			expect(def?.kind).toBe('action');
		}
	});

	it('solo cubre superficies multi-engine: snippets/plugins/dnd quedan fuera', () => {
		const registry = createSasiRegistry();
		registerSceneInstanceActions(registry);
		const ids = registry.list('function').map((def) => def.id);
		expect(ids.some((id) => id.includes('.snippets.'))).toBe(false);
		expect(ids.some((id) => id.includes('.plugins.'))).toBe(false);
		expect(ids.some((id) => id.endsWith('.dnd'))).toBe(false);
	});

	it('ninguna entry lleva mutatesVault: son cambios de estado, no de ficheros', () => {
		const registry = createSasiRegistry();
		registerSceneInstanceActions(registry);
		for (const def of registry.listActions()) {
			if (def.id.startsWith('vaultman.scene.')) {
				expect(def.mutatesVault).toBeUndefined();
			}
		}
	});

	it('los ids de escena no colisionan con el resto del SASI', () => {
		const { registry } = createVaultmanSasi();
		const ids = registry.list('function').map((def) => def.id);
		const sceneIds = ids.filter((id) => id.startsWith('vaultman.scene.'));
		expect(sceneIds.length).toBe(15);
		for (const id of sceneIds) {
			expect(id.startsWith('vaultman.move.')).toBe(false);
			expect(id.startsWith('vaultman.hover.')).toBe(false);
			expect(id.startsWith('vaultman.search.')).toBe(false);
			expect(id.startsWith('vaultman.addons.')).toBe(false);
		}
	});

	it('cada labelKey esta traducida en en.ts y en es.ts (las dos)', () => {
		const registry = createSasiRegistry();
		registerSceneInstanceActions(registry);
		for (const def of registry.list('function')) {
			if (!def.id.startsWith('vaultman.scene.')) continue;
			expect(en[def.labelKey], `en: ${def.labelKey}`).toBeTruthy();
			expect(es[def.labelKey], `es: ${def.labelKey}`).toBeTruthy();
		}
	});

	it('ninguna cadena visible incrustada en el codigo de registerSceneInstanceActions', () => {
		const source = readFileSync(
			fileURLToPath(
				new URL('../../src/logic/logicSasiSceneActions.ts', import.meta.url),
			),
			'utf8',
		);
		expect(source).not.toMatch(/name:\s*['"][A-Z]/);
		expect(source).not.toMatch(/label:\s*['"][A-Z]/);
	});

	it('main.ts cablea los 15 ids al publisher sin publicarlos de serie', () => {
		const mainSource = readFileSync(`${REPO_ROOT}/src/main.ts`, 'utf8');
		expect(mainSource).toContain('sceneEngineActionId');
		expect(mainSource).toContain('sceneGotoActionId');
		expect(mainSource).toContain('setSceneEngineCommand');
		expect(mainSource).toContain('switchSceneCommand');
		// Nacen ocultos: el inspector SASI los publica a pedido.
		expect(mainSource).not.toMatch(/setPublished\('vaultman\.scene\./);
	});
});
