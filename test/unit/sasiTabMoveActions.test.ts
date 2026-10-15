import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';
import {
	createTabMoveCommandDescriptors,
	guardMessageKey,
	groupMoveActionId,
	maximizeGuardMessageKey,
	nextMaximizedState,
	resolveGroupMoveTarget,
	resolveTabMoveTarget,
	resolveToggleMaximize,
	tabMoveActionId,
	GROUP_MOVE_LEFT_ID,
	GROUP_MOVE_RIGHT_ID,
	MAXIMIZE_BODY_CLASS,
	TAB_MOVE_NEXT_ID,
	TAB_MOVE_PREVIOUS_ID,
	TOGGLE_MAXIMIZE_ID,
	type GroupMoveGuardReason,
	type TabMoveGuardReason,
} from '../../src/logic/logicSasiTabMoveActions';
import { createSasiCommandPublisher } from '../../src/logic/logicSasiCommands';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

const ALL_IDS = [
	TAB_MOVE_PREVIOUS_ID,
	TAB_MOVE_NEXT_ID,
	GROUP_MOVE_LEFT_ID,
	GROUP_MOVE_RIGHT_ID,
	TOGGLE_MAXIMIZE_ID,
];

const NEW_I18N_KEYS = [
	'sasi.move.tab_to_previous_group',
	'sasi.move.tab_to_next_group',
	'sasi.move.group_left',
	'sasi.move.group_right',
	'sasi.move.tab.unknown_target',
	'sasi.move.tab.ambiguous_target',
	'sasi.move.tab.single_group',
	'sasi.move.tab.popout_unsupported',
	'sasi.move.tab_group.coming_soon',
	'sasi.toolbar.toggle_maximize',
	'sasi.toolbar.maximize_no_target',
];

describe('U200-L2 registro SASI de tab/group/maximize', () => {
	it('registra los 5 ids como actions sin mutatesVault', () => {
		const { registry } = createVaultmanSasi();
		for (const id of ALL_IDS) {
			const resolved = registry.resolve(id);
			expect(resolved.def).not.toBeNull();
			expect(resolved.def?.axis).toBe('function');
			expect(resolved.def?.kind).toBe('action');
			expect(resolved.def?.mutatesVault).toBeUndefined();
		}
		expect(registry.listActions().map((d) => d.id)).toEqual(
			expect.arrayContaining(ALL_IDS),
		);
		// Ninguna action puede declararse mutatesVault (puerta de confirmacion).
		expect(registry.listActions().every((d) => !d.mutatesVault)).toBe(true);
	});

	it('no colisiona con los move existentes (unicidad de id completo)', () => {
		const { registry } = createVaultmanSasi();
		expect(registry.resolve('vaultman.move.proceed').def).not.toBeNull();
		expect(registry.resolve('vaultman.nodemove.proceed').def).not.toBeNull();
		expect(registry.resolve(TAB_MOVE_PREVIOUS_ID).def?.labelKey).toBe(
			'sasi.move.tab_to_previous_group',
		);
	});

	it('mapea direcciones a ids registrados', () => {
		expect(tabMoveActionId('previous')).toBe(TAB_MOVE_PREVIOUS_ID);
		expect(tabMoveActionId('next')).toBe(TAB_MOVE_NEXT_ID);
		expect(groupMoveActionId('left')).toBe(GROUP_MOVE_LEFT_ID);
		expect(groupMoveActionId('right')).toBe(GROUP_MOVE_RIGHT_ID);
		const { registry } = createVaultmanSasi();
		for (const id of [
			tabMoveActionId('previous'),
			tabMoveActionId('next'),
			groupMoveActionId('left'),
			groupMoveActionId('right'),
		]) {
			expect(registry.resolve(id).def).not.toBeNull();
		}
	});
});

describe('U200-L2 guardas de tab move', () => {
	const three = {
		groupIds: ['a', 'b', 'c'],
		hasActiveLeaf: true,
		isPopout: false,
	};

	it('resuelve previous/next en el medio', () => {
		expect(
			resolveTabMoveTarget({ ...three, activeGroupId: 'b' }, 'previous'),
		).toEqual({ ok: true, target: { fromGroupId: 'b', toGroupId: 'a' } });
		expect(
			resolveTabMoveTarget({ ...three, activeGroupId: 'b' }, 'next'),
		).toEqual({ ok: true, target: { fromGroupId: 'b', toGroupId: 'c' } });
	});

	it('envuelve en los bordes (divergencia documentada de VSCode)', () => {
		expect(
			resolveTabMoveTarget({ ...three, activeGroupId: 'a' }, 'previous'),
		).toEqual({ ok: true, target: { fromGroupId: 'a', toGroupId: 'c' } });
		expect(
			resolveTabMoveTarget({ ...three, activeGroupId: 'c' }, 'next'),
		).toEqual({ ok: true, target: { fromGroupId: 'c', toGroupId: 'a' } });
	});

	it('sin hoja activa -> no-active-leaf', () => {
		expect(
			resolveTabMoveTarget(
				{ ...three, activeGroupId: 'a', hasActiveLeaf: false },
				'next',
			),
		).toEqual({ ok: false, reason: 'no-active-leaf' });
	});

	it('popout -> popout (explicito, antes que single-group)', () => {
		expect(
			resolveTabMoveTarget(
				{ groupIds: ['a'], activeGroupId: 'a', hasActiveLeaf: true, isPopout: true },
				'next',
			),
		).toEqual({ ok: false, reason: 'popout' });
	});

	it('cero o un grupo -> single-group', () => {
		for (const groupIds of [[], ['solo']] as const) {
			expect(
				resolveTabMoveTarget(
					{ groupIds: [...groupIds], activeGroupId: groupIds[0] ?? null, hasActiveLeaf: true, isPopout: false },
					'next',
				),
			).toEqual({ ok: false, reason: 'single-group' });
		}
	});

	it('duplicados -> ambiguous-target', () => {
		expect(
			resolveTabMoveTarget(
				{ groupIds: ['a', 'a'], activeGroupId: 'a', hasActiveLeaf: true, isPopout: false },
				'next',
			),
		).toEqual({ ok: false, reason: 'ambiguous-target' });
	});

	it('grupo activo desconocido -> unknown-target', () => {
		for (const activeGroupId of [null, 'zzz']) {
			expect(
				resolveTabMoveTarget(
					{ ...three, activeGroupId, hasActiveLeaf: true, isPopout: false },
					'next',
				),
			).toEqual({ ok: false, reason: 'unknown-target' });
		}
	});
});

describe('U200-L2 guardas de group move', () => {
	const two = { groupIds: ['a', 'b'], isPopout: false };

	it('left/right envuelven con dos grupos', () => {
		expect(
			resolveGroupMoveTarget({ ...two, activeGroupId: 'a' }, 'left'),
		).toEqual({ ok: true, target: { fromGroupId: 'a', toGroupId: 'b' } });
		expect(
			resolveGroupMoveTarget({ ...two, activeGroupId: 'a' }, 'right'),
		).toEqual({ ok: true, target: { fromGroupId: 'a', toGroupId: 'b' } });
	});

	it('popout y single-group son no-ops explicitos', () => {
		expect(
			resolveGroupMoveTarget({ ...two, activeGroupId: 'a', isPopout: true }, 'left'),
		).toEqual({ ok: false, reason: 'popout' });
		expect(
			resolveGroupMoveTarget({ groupIds: ['a'], activeGroupId: 'a', isPopout: false }, 'left'),
		).toEqual({ ok: false, reason: 'single-group' });
	});

	it('grupo desconocido y duplicados degradan', () => {
		expect(
			resolveGroupMoveTarget({ ...two, activeGroupId: null }, 'right'),
		).toEqual({ ok: false, reason: 'unknown-target' });
		expect(
			resolveGroupMoveTarget(
				{ groupIds: ['a', 'a'], activeGroupId: 'a', isPopout: false },
				'right',
			),
		).toEqual({ ok: false, reason: 'ambiguous-target' });
	});
});

describe('U200-L2 maximize: guarda y maquina de estado', () => {
	it('sin hoja Vaultman -> unknown-target; con hoja -> ok', () => {
		expect(resolveToggleMaximize({ hasVaultmanLeaf: false })).toEqual({
			ok: false,
			reason: 'unknown-target',
		});
		expect(resolveToggleMaximize({ hasVaultmanLeaf: true })).toEqual({
			ok: true,
		});
	});

	it('el toggle es reversible por construccion', () => {
		expect(nextMaximizedState(false)).toBe(true);
		expect(nextMaximizedState(true)).toBe(false);
	});

	it('la clase es aditiva con namespace propio', () => {
		expect(MAXIMIZE_BODY_CLASS).toBe('vaultman-l2-maximized');
		expect(MAXIMIZE_BODY_CLASS.startsWith('vaultman-')).toBe(true);
	});
});

describe('U200-L2 i18n en+es', () => {
	it('todas las claves nuevas existen en ambos idiomas y traducidas', () => {
		for (const key of NEW_I18N_KEYS) {
			expect(en[key], key).toBeTruthy();
			expect(es[key], key).toBeTruthy();
			expect(en[key], key).not.toBe(key);
			expect(es[key], key).not.toBe(key);
			expect(es[key], key).not.toBe(en[key]);
		}
	});

	it('cada reason de guarda mapea a una clave existente', () => {
		const reasons: Array<TabMoveGuardReason | GroupMoveGuardReason> = [
			'no-active-leaf',
			'unknown-target',
			'ambiguous-target',
			'single-group',
			'popout',
		];
		for (const reason of reasons) {
			const key = guardMessageKey(reason);
			expect(en[key], reason).toBeTruthy();
			expect(es[key], reason).toBeTruthy();
		}
		expect(en[maximizeGuardMessageKey()]).toBeTruthy();
		expect(es[maximizeGuardMessageKey()]).toBeTruthy();
	});
});

describe('U200-L2 descriptores y paleta via publisher', () => {
	const buildRunner = (calls: Array<{ which: string; checking: boolean }>) => ({
		runTabMove: (direction: 'previous' | 'next', checking: boolean) => {
			calls.push({ which: `tab:${direction}`, checking });
			return true;
		},
		runGroupMove: (direction: 'left' | 'right', checking: boolean) => {
			calls.push({ which: `group:${direction}`, checking });
			return true;
		},
		runToggleMaximize: (checking: boolean) => {
			calls.push({ which: 'maximize', checking });
			return true;
		},
	});

	it('los 5 descriptores llevan los nombres exactos de paleta', () => {
		const calls: Array<{ which: string; checking: boolean }> = [];
		const descriptors = createTabMoveCommandDescriptors(
			(key) => en[key] ?? key,
			buildRunner(calls),
		);
		expect(descriptors.map((d) => d.id)).toEqual(ALL_IDS);
		expect(descriptors.map((d) => d.name)).toEqual([
			'Move active tab to previous group',
			'Move active tab to next group',
			'Move active tab group left',
			'Move active tab group right',
			'Toggle Vaultman panel maximize',
		]);
		// Checkable por aridad (handler.length >= 1): el bridge los publica
		// con checkCallback, como el resto de comandos con guarda.
		for (const d of descriptors) expect(d.handler.length).toBe(1);
	});

	it('se publican y retiran por el publisher con esos nombres', () => {
		const added = new Map<
			string,
			{
				name: string;
				checkCallback?: (checking: boolean) => unknown;
			}
		>();
		const plugin = {
			addCommand(cmd: {
				id: string;
				name: string;
				callback?: () => unknown;
				checkCallback?: (checking: boolean) => unknown;
			}) {
				added.set(cmd.id, cmd);
				return {};
			},
			removeCommand(id: string) {
				added.delete(id);
			},
		};
		const publisher = createSasiCommandPublisher(plugin);
		const calls: Array<{ which: string; checking: boolean }> = [];
		for (const descriptor of createTabMoveCommandDescriptors(
			(key) => en[key] ?? key,
			buildRunner(calls),
		)) {
			publisher.register(descriptor);
		}
		for (const id of ALL_IDS) expect(publisher.isPublishable(id)).toBe(true);
		publisher.setPublished(TOGGLE_MAXIMIZE_ID, true);
		expect(added.get(TOGGLE_MAXIMIZE_ID)?.name).toBe(
			'Toggle Vaultman panel maximize',
		);
		// Execute path llega al runner con checking=false y devuelve true.
		const result = added.get(TOGGLE_MAXIMIZE_ID)?.checkCallback?.(false);
		expect(result).toBe(true);
		expect(calls).toEqual([{ which: 'maximize', checking: false }]);
		publisher.setPublished(TOGGLE_MAXIMIZE_ID, false);
		expect(added.has(TOGGLE_MAXIMIZE_ID)).toBe(false);
	});
});

describe('U200-L2 cableado en main.ts (presencia + no-regresion)', () => {
	const mainSrc = () =>
		readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8');

	it('registra la fabrica y los tres runners con guarda Notice+false', () => {
		const src = mainSrc();
		expect(src).toContain('createTabMoveCommandDescriptors');
		expect(src).toContain('runTabMoveCommand');
		expect(src).toContain('runGroupMoveCommand');
		expect(src).toContain('runToggleMaximizeCommand');
		expect(src).toContain('orderedMainTabGroups');
		expect(src).toContain('new Notice(translate(guardMessageKey');
		expect(src).toContain('MAXIMIZE_BODY_CLASS');
		expect(src).toContain("translate('sasi.move.tab_group.coming_soon')");
	});

	it('los flujos move/split existentes siguen intactos', () => {
		const src = mainSrc();
		expect(src).toContain('async relocateWorkspaceInstance(');
		expect(src).toContain('async splitWorkspaceInstance(');
		const frameSrc = readFileSync(
			new URL('../../src/VaultmanFrame.svelte', import.meta.url),
			'utf8',
		);
		expect(frameSrc).toContain('moveWorkspaceInstanceSurface');
		expect(frameSrc).toContain('onSplitInstance={splitWorkspaceInstance}');
	});
});
