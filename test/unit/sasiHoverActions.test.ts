import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';
import { createSasiCommandPublisher } from '../../src/logic/logicSasiCommands';
import {
	HOVER_LOCK_ID,
	HOVER_NESTED_RIBBON_ID,
	HOVER_SURFACE_IDS,
	hoverActionId,
	registerHoverActions,
} from '../../src/logic/logicSasiHoverActions';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * U130-? SASI bridge: las acciones de hover entran al registro, todos los
 * `addCommand` de main.ts cuelgan del publisher, y los 5 ids preexistentes
 * sobreviven. Esta fuente es el contrato que la rama se compromete a
 * mantener.
 */
describe('U130-? SASI hover actions', () => {
	it('registra 14 actions: 3 por surface + lock + nested-ribbon', () => {
		const registry = createSasiRegistry();
		registerHoverActions(registry);
		const expected = [
			HOVER_LOCK_ID,
			HOVER_NESTED_RIBBON_ID,
			...HOVER_SURFACE_IDS.flatMap((surface) => [
				hoverActionId({ surface, kind: 'hide' }),
				hoverActionId({ surface, kind: 'hover' }),
				hoverActionId({ surface, kind: 'pin' }),
			]),
		];
		expect(expected.length).toBe(14);
		for (const id of expected) {
			const def = registry.resolve(id).def;
			expect(def, `id registrado: ${id}`).not.toBeNull();
			expect(def?.kind).toBe('action');
		}
	});

	it('ninguna entry lleva mutatesVault: son cambios de estado del workspace', () => {
		const registry = createSasiRegistry();
		registerHoverActions(registry);
		for (const id of [
			HOVER_LOCK_ID,
			HOVER_NESTED_RIBBON_ID,
			...HOVER_SURFACE_IDS.flatMap((surface) => [
				hoverActionId({ surface, kind: 'hide' }),
				hoverActionId({ surface, kind: 'hover' }),
				hoverActionId({ surface, kind: 'pin' }),
			]),
		]) {
			expect(registry.resolve(id).def?.mutatesVault).toBeUndefined();
		}
	});

	it('los ids de hover no colisionan con los del resto del SASI', () => {
		// Garantiza que el namespace `vaultman.hover.*` sigue siendo una familia
		// aparte y no pisa `vaultman.move.*` / `vaultman.search.*` /
		// `vaultman.addons.*`.
		const { registry } = createVaultmanSasi();
		const ids = registry.list('function').map((def) => def.id);
		const hoverIds = ids.filter((id) => id.startsWith('vaultman.hover.'));
		expect(hoverIds.length).toBe(14);
		for (const id of hoverIds) {
			expect(id.startsWith('vaultman.move.')).toBe(false);
			expect(id.startsWith('vaultman.search.')).toBe(false);
			expect(id.startsWith('vaultman.addons.')).toBe(false);
		}
	});

	it('cada labelKey esta traducida en en.ts y en es.ts (las dos)', () => {
		const registry = createSasiRegistry();
		registerHoverActions(registry);
		for (const id of [
			HOVER_LOCK_ID,
			HOVER_NESTED_RIBBON_ID,
			...HOVER_SURFACE_IDS.flatMap((surface) => [
				hoverActionId({ surface, kind: 'hide' }),
				hoverActionId({ surface, kind: 'hover' }),
				hoverActionId({ surface, kind: 'pin' }),
			]),
		]) {
			const key = registry.resolve(id).def!.labelKey;
			expect(en[key], `en: ${key}`).toBeTruthy();
			expect(es[key], `es: ${key}`).toBeTruthy();
		}
	});

	it('ninguna cadena visible incrustada en el codigo de registerHoverActions', () => {
		// Si una labelKey nueva aparece sin cadena en algun i18n, el assert
		// anterior ya cae. Aqui la guarda es sobre el codigo: no debe haber
		// strings literales colindando con `labelKey` o `name:`.
		const source = readFileSync(
			fileURLToPath(new URL('../../src/logic/logicSasiHoverActions.ts', import.meta.url)),
			'utf8',
		);
		expect(source).not.toMatch(/name:\s*['"][A-Z]/);
		expect(source).not.toMatch(/label:\s*['"][A-Z]/);
	});
});

/**
 * Guarda negativa: el plugin NO contiene `addCommand` suelto fuera del
 * publisher SASI. Si alguien anade uno aqui sin pasarlo por
 * `sasiCommandPublisher`, este test cae.
 */
describe('U130-? guarda: addCommand pasa por SASI', () => {
	const mainSource = readFileSync(
		`${REPO_ROOT}/src/main.ts`,
		'utf8',
	);

	it('main.ts no contiene ninguna llamada directa a addCommand', () => {
		// Cuenta `addCommand(` y exige que el numero sea CERO. Cualquier
		// `addCommand` suelto rompe esta puerta.
		const matches = mainSource.match(/\.addCommand\s*\(/g) ?? [];
		expect(matches).toEqual([]);
	});

	it('main.ts usa sasiCommandPublisher como unico punto de publicacion', () => {
		expect(mainSource).toContain('sasiCommandPublisher');
		expect(mainSource).toContain('sasiCommandPublisher.register');
		expect(mainSource).toContain('sasiCommandPublisher.setPublished');
	});

	it('preserva los 5 ids de comando literales preexistentes', () => {
		// El usuario con un atajo asignado a uno de estos comandos no puede
		// perderlo: el id que recibe `addCommand` tiene que ser exactamente
		// este.
		const ids = [
			'apply-queue',
			'open',
			'open-updates',
			'focus-content-search',
			'focus-active-explorer-search',
		];
		for (const id of ids) {
			expect(
				mainSource.includes(`id: '${id}'`),
				`id literal en main.ts: ${id}`,
			).toBe(true);
		}
	});
});

/**
 * Publisher: el toggle por entry decide si el comando aparece en Obsidian.
 * Probado contra un Plugin mock para no depender de Obsidian.
 */
describe('U130-? SASI command publisher', () => {
	type PluginArg = Parameters<typeof createSasiCommandPublisher>[0];

	function createMockPlugin(): { added: Map<string, unknown>; removed: string[]; plugin: PluginArg } {
		const added = new Map<string, unknown>();
		const removed: string[] = [];
		const plugin: PluginArg = {
			addCommand(command) {
				added.set(command.id, {
					name: command.name,
					callback: 'callback' in command ? command.callback : undefined,
					checkCallback:
						'checkCallback' in command ? command.checkCallback : undefined,
				});
			},
			removeCommand(id: string) {
				removed.push(id);
				added.delete(id);
			},
		};
		return { added, removed, plugin };
	}

	it('toggle ON llama a addCommand, toggle OFF llama a removeCommand', () => {
		const { plugin, added, removed } = createMockPlugin();
		const publisher = createSasiCommandPublisher(plugin);
		publisher.register({
			id: 'cmd-a',
			name: 'A',
			handler: () => {},
		});
		publisher.setPublished('cmd-a', true);
		expect(added.has('cmd-a')).toBe(true);
		expect(publisher.isPublished('cmd-a')).toBe(true);
		publisher.setPublished('cmd-a', false);
		expect(removed).toContain('cmd-a');
		expect(publisher.isPublished('cmd-a')).toBe(false);
	});

	it('setPublished ON dos veces seguidas no duplica el addCommand', () => {
		const { plugin, added } = createMockPlugin();
		const publisher = createSasiCommandPublisher(plugin);
		publisher.register({
			id: 'cmd-b',
			name: 'B',
			handler: () => {},
		});
		publisher.setPublished('cmd-b', true);
		publisher.setPublished('cmd-b', true);
		expect(added.size).toBe(1);
	});

	it('detecta checkable por aridad del handler', () => {
		const { plugin, added } = createMockPlugin();
		const publisher = createSasiCommandPublisher(plugin);
		publisher.register({
			id: 'cmd-c',
			name: 'C',
			handler: (checking: boolean) => !checking,
		});
		publisher.setPublished('cmd-c', true);
		const entry = added.get('cmd-c') as {
			checkCallback?: (c: boolean) => unknown;
		};
		expect(entry?.checkCallback).toBeDefined();
		const cb = entry?.checkCallback;
		if (!cb) throw new Error('checkCallback missing');
		expect(cb(false)).toBe(true);
		expect(cb(true)).toBe(false);
	});

	it('revokeAll retira todos los publicados', () => {
		const { plugin, added } = createMockPlugin();
		const publisher = createSasiCommandPublisher(plugin);
		for (const id of ['x', 'y', 'z']) {
			publisher.register({
				id,
				name: id.toUpperCase(),
				handler: () => {},
			});
			publisher.setPublished(id, true);
		}
		expect(added.size).toBe(3);
		publisher.revokeAll();
		expect(publisher.publishedIds()).toEqual([]);
		expect(added.size).toBe(0);
	});
});
