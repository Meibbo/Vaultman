import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
	createSasiCommandPublisher,
	effectiveSasiPublishedDecisions,
	mergeSasiPublishedStore,
	resolveSasiPublishedDecision,
} from '../../src/logic/logicSasiCommands';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

type PluginArg = Parameters<typeof createSasiCommandPublisher>[0];

function createMockPlugin(): {
	added: Map<string, unknown>;
	removed: string[];
	plugin: PluginArg;
} {
	const added = new Map<string, unknown>();
	const removed: string[] = [];
	const plugin: PluginArg = {
		addCommand(command) {
			added.set(command.id, { name: command.name });
		},
		removeCommand(id: string) {
			removed.push(id);
			added.delete(id);
		},
	};
	return { added, removed, plugin };
}

function registerIds(
	publisher: ReturnType<typeof createSasiCommandPublisher>,
	ids: readonly string[],
): void {
	for (const id of ids) {
		publisher.register({ id, name: id, handler: () => {} });
	}
}

/**
 * U130L: la decision Published persiste en PSS/settings, separada del
 * capability registry. Cubre el ciclo desactivar/activar, el `false`
 * preservado, y que un provider/kind/action sin descriptor no se publica.
 */
describe('U130L SASI publication persistence', () => {
	it('solo el descriptor registrado es publicable (cell_toggle puede distinguir)', () => {
		const { plugin } = createMockPlugin();
		const publisher = createSasiCommandPublisher(plugin);
		publisher.register({ id: 'open', name: 'Open', handler: () => {} });
		expect(publisher.isPublishable('open')).toBe(true);
		// Ids del registry sin descriptor de comando: no publicables.
		expect(publisher.isPublishable('vaultman.move.proceed')).toBe(false);
		expect(publisher.isPublishable('vaultman.hover.sidebars.hide')).toBe(false);
		expect(publisher.isPublishable('retirado')).toBe(false);
		expect(publisher.registeredIds()).toEqual(['open']);
	});

	it('setPublished sin descriptor no publica, no lanza y no ensucia onDecision', () => {
		const { plugin, added } = createMockPlugin();
		const publisher = createSasiCommandPublisher(plugin);
		const decisions: Array<[string, boolean]> = [];
		const withListener = createSasiCommandPublisher(plugin, {
			onDecision: (id, published) => decisions.push([id, published]),
		});
		publisher.register({ id: 'open', name: 'Open', handler: () => {} });
		// Provider/action del registry sin descriptor de comando.
		expect(() =>
			publisher.setPublished('vaultman.move.proceed', true),
		).not.toThrow();
		expect(() =>
			withListener.setPublished('vaultman.move.proceed', true),
		).not.toThrow();
		expect(added.has('vaultman.move.proceed')).toBe(false);
		expect(publisher.isPublished('vaultman.move.proceed')).toBe(false);
		expect(decisions).toEqual([]);
	});

	it('el default explicito solo rige sin preferencia previa', () => {
		expect(resolveSasiPublishedDecision('open', undefined, true)).toBe(true);
		expect(resolveSasiPublishedDecision('nuevo', undefined, false)).toBe(false);
		// Un `false` guardado gana contra un default `true`.
		expect(resolveSasiPublishedDecision('open', { open: false }, true)).toBe(
			false,
		);
		expect(resolveSasiPublishedDecision('open', { open: true }, false)).toBe(
			true,
		);
	});

	it('un comando nuevo nace con default explicito (oculto salvo opt-in)', () => {
		const effective = effectiveSasiPublishedDecisions(
			['open', 'nuevo-comando'],
			{ open: false },
			(id) => id === 'open',
		);
		expect(effective).toEqual({ open: false, 'nuevo-comando': false });
	});

	it('los ids retirados se ignoran al restaurar pero se conservan en el store', () => {
		const { plugin, added } = createMockPlugin();
		const publisher = createSasiCommandPublisher(plugin);
		registerIds(publisher, ['open']);
		expect(() =>
			publisher.restorePublished({ open: true, retirado: true }),
		).not.toThrow();
		expect(publisher.isPublished('open')).toBe(true);
		expect(added.has('retirado')).toBe(false);
		// El store conserva la eleccion futura del retirado.
		const merged = mergeSasiPublishedStore(
			{ open: false, retirado: true },
			{ open: true },
		);
		expect(merged).toEqual({ open: true, retirado: true });
	});

	it('ciclo desactivar/activar: el `false` del usuario sobrevive a revokeAll + restore', () => {
		// Sesion 1: el usuario oculta `open` (toggle OFF). El store es lo que
		// iria a data.json via `settings.sasiPublishedCommands`.
		const first = createMockPlugin();
		const decisions: Record<string, boolean> = { open: true };
		const pub1 = createSasiCommandPublisher(first.plugin, {
			onDecision: (id, published) => {
				decisions[id] = published;
			},
		});
		registerIds(pub1, ['open', 'apply-queue']);
		pub1.restorePublished(decisions);
		expect(pub1.isPublished('open')).toBe(true);
		pub1.setPublished('open', false);
		expect(decisions.open).toBe(false);
		expect(pub1.isPublished('open')).toBe(false);

		// Desactivar: revokeAll limpia la sesion, el store queda intacto.
		pub1.revokeAll();
		expect(pub1.publishedIds()).toEqual([]);

		// Sesion 2 (reactivar/reiniciar): instancia nueva, mismo store.
		const second = createMockPlugin();
		const pub2 = createSasiCommandPublisher(second.plugin);
		registerIds(pub2, ['open', 'apply-queue']);
		const effective = effectiveSasiPublishedDecisions(
			pub2.registeredIds(),
			decisions,
			() => true,
		);
		pub2.restorePublished(effective);
		expect(pub2.isPublished('open')).toBe(false);
		expect(second.added.has('open')).toBe(false);
		expect(pub2.isPublished('apply-queue')).toBe(true);
	});

	it('restorePublished no dispara onDecision (la carga persiste una sola vez)', () => {
		const { plugin } = createMockPlugin();
		let calls = 0;
		const publisher = createSasiCommandPublisher(plugin, {
			onDecision: () => {
				calls += 1;
			},
		});
		registerIds(publisher, ['a', 'b']);
		publisher.restorePublished({ a: true, b: true });
		expect(calls).toBe(0);
		expect([...publisher.publishedIds()].sort()).toEqual(['a', 'b']);
	});

	it('setPublished solo notifica el cambio real de estado', () => {
		const { plugin } = createMockPlugin();
		const seen: Array<[string, boolean]> = [];
		const publisher = createSasiCommandPublisher(plugin, {
			onDecision: (id, published) => seen.push([id, published]),
		});
		publisher.register({ id: 'a', name: 'A', handler: () => {} });
		publisher.setPublished('a', true);
		publisher.setPublished('a', true);
		expect(seen).toEqual([['a', true]]);
	});
});

describe('U130L main.ts: persistencia cableada a settings', () => {
	const mainSource = readFileSync(`${REPO_ROOT}/src/main.ts`, 'utf8');

	it('restaura desde settings.sasiPublishedCommands con defaults solo sin preferencia', () => {
		expect(mainSource).toContain('sasiPublishedCommands');
		expect(mainSource).toContain('restorePublished');
		expect(mainSource).toContain('effectiveSasiPublishedDecisions');
		expect(mainSource).toContain('mergeSasiPublishedStore');
		expect(mainSource).toContain('sasiPublishedDefault');
	});

	it('cada toggle de usuario persiste via onDecision sin tocar el modal', () => {
		expect(mainSource).toContain('onDecision');
		expect(mainSource).toContain('void this.saveSettings()');
	});

	it('onunload revoca la sesion sin borrar la decision persistida', () => {
		expect(mainSource).toContain('onunload');
		expect(mainSource).toContain('revokeAll()');
	});

	it('expone puente para cell_toggle solo sobre comandos publicables', () => {
		expect(mainSource).toContain('setSasiCommandPublished');
		expect(mainSource).toContain('isPublishable');
	});

	it('no publica comandos de escena por defecto en la carga', () => {
		expect(mainSource).not.toMatch(/setPublished\('vaultman\.scene\./);
	});
});
