import { describe, expect, it } from 'vitest';
import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';
import {
	API_SCENE_GROUP_IDS,
	API_SCENE_IDENTITY_KIND,
	API_SCENE_GROUP_KIND,
	API_SCENE_GROUP_NAMES,
	API_SCENE_SELF_ID,
	PUBLISH_CELL_ID,
	apiSceneMemberships,
	apiSceneUrnOf,
	buildApiSceneGroups,
	buildApiSceneNodes,
	isApiSceneNode,
	projectApiSceneTree,
	type ApiSceneGroupMeta,
	type ApiSceneNodeMeta,
	type ApiScenePublisherView,
} from '../../src/logic/logicApiScene';
import { CHROME_SURFACES } from '../../src/logic/logicSasiBootstrap';
import { parseMembershipUrn } from '../../src/logic/logicMembershipUrn';
import { NO_GROUP_ID } from '../../src/logic/logicTreeGroupProjection';
import { createSasiProvider } from '../../src/services/serviceSasiProvider';
import type { InstanceRegistryData } from '../../src/types/typeInstance';
import type { TreeNode } from '../../src/types/typeTree';

function fakePublisher(
	entries: readonly { id: string; published: boolean; name?: string }[] = [],
	extra?: Partial<ApiScenePublisherView>,
): ApiScenePublisherView {
	return {
		isPublished: (id) => entries.find((e) => e.id === id)?.published ?? false,
		snapshot: () =>
			entries.map((e) => ({
				id: e.id,
				published: e.published,
				descriptor: { name: e.name ?? e.id },
			})),
		...extra,
	};
}

function fakeInstances(): InstanceRegistryData {
	return {
		schema: 1,
		instances: {
			'vm-instance-aaa': {
				id: 'vm-instance-aaa',
				createdAt: 1,
				lastActiveAt: 2,
				revision: 3,
				tombstoned: false,
				self: {},
				activeScene: 'files',
				scenes: {},
			},
			'vm-instance-bbb': {
				id: 'vm-instance-bbb',
				createdAt: 4,
				lastActiveAt: 5,
				revision: 7,
				tombstoned: true,
				self: {},
				activeScene: 'tags',
				scenes: {},
			},
		},
	};
}

describe('U130L apiScene: grupos', () => {
	it('los 8 grupos existen con ids estables', () => {
		const groups = buildApiSceneGroups((name) => name);
		expect(groups.map((g) => g.id)).toEqual(
			API_SCENE_GROUP_NAMES.map((name) => API_SCENE_GROUP_IDS[name]),
		);
		expect(groups).toHaveLength(8);
	});

	it('la proyeccion emite las 8 cabeceras con meta propia y sin fantasma', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher(), fakeInstances());
		const tree = projectApiSceneTree(nodes);
		// Sin fantasma `vaultman.group.none`: los 8 grupos particionan todo.
		expect(tree.some((row) => row.id === NO_GROUP_ID)).toBe(false);
		const headers = tree.filter((row) => row.isGroupHeader === true);
		expect(headers.map((h) => h.id).sort()).toEqual(
			Object.values(API_SCENE_GROUP_IDS).sort(),
		);
		for (const header of headers) {
			const meta = header.meta as ApiSceneGroupMeta;
			expect(meta.identityKind).toBe(API_SCENE_GROUP_KIND);
			expect(meta.identityKind).not.toBe(API_SCENE_IDENTITY_KIND);
			expect((meta as { urn?: string }).urn).toBeUndefined();
			expect(isApiSceneNode(header)).toBe(false);
		}
		// Solo command sigue vacio en el bootstrap (sin kinds command
		// registrados): cabecera sin hijos, no ausente.
		const commandHeader = headers.find(
			(h) => h.id === API_SCENE_GROUP_IDS.command,
		);
		expect(commandHeader).toBeDefined();
		expect(commandHeader?.children ?? []).toEqual([]);
	});
});

describe('U130L apiScene: identidad', () => {
	it('todo leaf es node_apis con URN estable parseable', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher(), fakeInstances());
		expect(nodes.length).toBeGreaterThan(0);
		for (const node of nodes) {
			expect(node.meta.identityKind).toBe(API_SCENE_IDENTITY_KIND);
			const ref = parseMembershipUrn(node.meta.urn);
			expect(ref).not.toBeNull();
			expect(ref?.providerId).toBe('sasi');
			expect(ref?.kind).toBe(API_SCENE_IDENTITY_KIND);
			expect(apiSceneUrnOf(node)).toBe(node.meta.urn);
			expect(isApiSceneNode(node as TreeNode<ApiSceneNodeMeta | ApiSceneGroupMeta>)).toBe(
				true,
			);
		}
	});

	it('los miembros cuelgan a profundidad 1 bajo su cabecera', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher(), fakeInstances());
		const tree = projectApiSceneTree(nodes);
		const actionHeader = tree.find((h) => h.id === API_SCENE_GROUP_IDS.action);
		expect(actionHeader).toBeDefined();
		expect(actionHeader?.children?.length).toBeGreaterThan(0);
		for (const child of actionHeader?.children ?? []) {
			expect(child.depth).toBe(1);
			expect((child.meta as ApiSceneNodeMeta).group).toBe('action');
		}
	});

	it('node_groups nunca se registra como kind SASI', () => {
		const { registry } = createVaultmanSasi();
		const kindIds = registry.list('kind').map((def) => def.id);
		expect(kindIds).not.toContain('node_groups');
		expect(kindIds.some((id) => id.includes('node_groups'))).toBe(false);
	});
});

describe('U130L apiScene: ejes kind/provider poblados', () => {
	it('el kind node_apis esta registrado con id estable', () => {
		const { registry } = createVaultmanSasi();
		const kinds = registry.list('kind');
		expect(kinds.map((def) => def.id)).toContain('vaultman.kind.node_apis');
		const nodes = buildApiSceneNodes(registry, fakePublisher());
		const kindRows = nodes.filter((n) => n.meta.group === 'kind');
		expect(kindRows.length).toBeGreaterThan(0);
		expect(kindRows.some((n) => n.meta.sasiId === 'vaultman.kind.node_apis')).toBe(
			true,
		);
	});

	it('los kinds de function no duplican ids del eje kind', () => {
		const { registry } = createVaultmanSasi();
		const kindIds = new Set(registry.list('kind').map((def) => def.id));
		expect(kindIds.has('action')).toBe(false);
		expect(kindIds.has('operation')).toBe(false);
		expect(kindIds.has('command')).toBe(false);
	});

	it('los providers del contrato Scene estan registrados', () => {
		const { registry } = createVaultmanSasi();
		const providerIds = registry.list('provider').map((def) => def.id);
		for (const scene of ['files', 'props', 'tags', 'snippets', 'plugins']) {
			expect(providerIds).toContain(`vaultman.provider.${scene}`);
		}
		const nodes = buildApiSceneNodes(registry, fakePublisher());
		expect(
			nodes.filter((n) => n.meta.group === 'provider').length,
		).toBeGreaterThan(0);
	});
});

describe('U130L apiScene: instancias reales del registro', () => {
	it('dos instancias durables aparecen con su id', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(
			registry,
			fakePublisher(),
			fakeInstances(),
		);
		const instances = nodes.filter((n) => n.meta.group === 'instance');
		expect(instances.map((n) => n.id).sort()).toEqual([
			'sasi:instance:vm-instance-aaa',
			'sasi:instance:vm-instance-bbb',
		]);
		const aaa = instances.find((n) => n.meta.sasiId === 'vm-instance-aaa');
		expect(aaa?.meta.activeScene).toBe('files');
		expect(aaa?.meta.tombstoned).toBe(false);
		expect(aaa?.meta.revision).toBe(3);
	});

	it('el tombstone es visible en meta', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(
			registry,
			fakePublisher(),
			fakeInstances(),
		);
		const bbb = nodes.find(
			(n) => n.meta.group === 'instance' && n.meta.sasiId === 'vm-instance-bbb',
		);
		expect(bbb?.meta.tombstoned).toBe(true);
		expect(bbb?.meta.revision).toBe(7);
		expect(bbb?.meta.activeScene).toBe('tags');
	});

	it('un descriptor del publisher NO aparece como instancia', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(
			registry,
			fakePublisher([{ id: 'apply-queue', published: true }]),
			fakeInstances(),
		);
		const instances = nodes.filter((n) => n.meta.group === 'instance');
		expect(instances.some((n) => n.meta.sasiId === 'apply-queue')).toBe(false);
		expect(instances).toHaveLength(2);
	});

	it('sin registro de instancias no hay filas de instancia', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(
			registry,
			fakePublisher([{ id: 'apply-queue', published: true }]),
		);
		expect(nodes.filter((n) => n.meta.group === 'instance')).toEqual([]);
	});

	it('las instancias nunca llevan toggle aunque el publisher las conozca', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher(), fakeInstances());
		for (const node of nodes.filter((n) => n.meta.group === 'instance')) {
			expect(node.meta.publishable).toBe(false);
			expect(node.cells ?? []).toEqual([]);
		}
	});
});

describe('U130L apiScene: scenes reales', () => {
	it('scenes son los SceneDefinitionId mas el apiScene, sin content', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher());
		const scenes = nodes.filter((n) => n.meta.group === 'scene');
		expect(scenes.map((n) => n.id)).toEqual([
			'sasi:scene:files',
			'sasi:scene:props',
			'sasi:scene:tags',
			'sasi:scene:snippets',
			'sasi:scene:plugins',
			'sasi:scene:apiscene',
		]);
		expect(scenes.some((n) => n.id === 'sasi:scene:content')).toBe(false);
		const apiscene = scenes.find((n) => n.id === 'sasi:scene:apiscene');
		expect(apiscene?.meta.sasiId).toBe(API_SCENE_SELF_ID);
	});

	it('las scenes heredan supports del goto SASI', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher());
		const files = nodes.find((n) => n.id === 'sasi:scene:files');
		expect(files?.meta.sasiId).toBe('vaultman.scene.goto.files');
		expect(files?.meta.supports).toEqual(['panelWidget']);
	});

	it('ninguna scene lleva toggle', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(
			registry,
			fakePublisher([{ id: 'vaultman.scene.goto.files', published: true }]),
		);
		for (const node of nodes.filter((n) => n.meta.group === 'scene')) {
			expect(node.meta.publishable).toBe(false);
			expect(node.cells ?? []).toEqual([]);
		}
	});
});

describe('U130L apiScene: superficies chrome concretas', () => {
	it('las 7 identidades chrome estan registradas como surfaces', () => {
		const { registry } = createVaultmanSasi();
		expect(registry.list('surface').map((def) => def.id)).toEqual([
			...CHROME_SURFACES,
		]);
		const nodes = buildApiSceneNodes(registry, fakePublisher());
		expect(nodes.filter((n) => n.meta.group === 'surface').map((n) => n.meta.sasiId)).toEqual(
			[...CHROME_SURFACES],
		);
	});

	it('son superficies, no function ni node_groups', () => {
		const { registry } = createVaultmanSasi();
		for (const id of CHROME_SURFACES) {
			const resolved = registry.resolve(id);
			expect(resolved.available).toBe(true);
			expect(resolved.def?.axis).toBe('surface');
			expect(resolved.def?.kind).toBeUndefined();
		}
		const nodes = buildApiSceneNodes(registry, fakePublisher());
		for (const node of nodes.filter((n) => n.meta.group === 'surface')) {
			expect(node.meta.sasiKind).toBeNull();
			expect(node.meta.publishable).toBe(false);
			expect(node.cells ?? []).toEqual([]);
		}
	});

	it('el hover mapea a superficies concretas, sin generico chrome', () => {
		const { registry } = createVaultmanSasi();
		const hide = registry.resolve('vaultman.hover.sidebars.hide').def;
		expect(hide?.supports.map((s) => s.surface).sort()).toEqual(
			['chrome:left-sidebar', 'chrome:right-sidebar'].sort(),
		);
		const ribbon = registry.resolve('vaultman.hover.ribbons.pin').def;
		expect(ribbon?.supports.map((s) => s.surface).sort()).toEqual(
			['chrome:left-ribbon', 'chrome:right-ribbon'].sort(),
		);
		expect(registry.resolve('vaultman.hover.tabbar.hide').def?.supports).toEqual([
			{ surface: 'chrome:tabbar' },
		]);
		expect(
			registry.resolve('vaultman.hover.statusbar.hide').def?.supports,
		).toEqual([{ surface: 'chrome:statusbar' }]);
		for (const def of registry.listActions()) {
			if (!def.id.startsWith('vaultman.hover.')) continue;
			expect(
				def.supports.map((s) => s.surface),
				def.id,
			).not.toContain('chrome');
		}
	});
});

describe('U130L apiScene: categorias desde SASI real', () => {
	it('separa actions de operations', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher());
		const actions = nodes.filter((n) => n.meta.group === 'action');
		const operations = nodes.filter((n) => n.meta.group === 'operation');
		expect(actions.length).toBeGreaterThan(0);
		expect(operations.length).toBeGreaterThan(0);
		expect(actions.every((n) => n.meta.sasiKind === 'action')).toBe(true);
		expect(operations.every((n) => n.meta.sasiKind === 'operation')).toBe(true);
		const proceed = operations.find(
			(n) => n.meta.sasiId === 'vaultman.move.proceed',
		);
		expect(proceed?.meta.mutatesVault).toBe(true);
	});

	it('el grupo command existe aunque el bootstrap no registre commands', () => {
		const { registry } = createVaultmanSasi();
		expect(registry.listCommands()).toEqual([]);
		const nodes = buildApiSceneNodes(registry, fakePublisher());
		expect(nodes.filter((n) => n.meta.group === 'command')).toEqual([]);
		const tree = projectApiSceneTree(nodes);
		expect(
			tree.some((h) => h.id === API_SCENE_GROUP_IDS.command),
		).toBe(true);
	});
});

describe('U130L apiScene: relaciones (supports/composes)', () => {
	it('conserva supports del def', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher());
		const toggleKind = nodes.find(
			(n) => n.meta.sasiId === 'vaultman.move.toggleMoveKind',
		);
		expect(toggleKind?.meta.supports).toEqual(['statusBar']);
	});

	it('el provider conserva supports y composes', () => {
		const { registry } = createVaultmanSasi();
		const provider = createSasiProvider(registry);
		const first = provider.nodesFor('function')[0];
		expect(first?.supports).toBeDefined();
		expect(first?.supports?.length).toBeGreaterThan(0);
		expect('composes' in (first ?? {})).toBe(true);
	});

	it('memberships cubre los 8 grupos en orden de filas', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher(), fakeInstances());
		const memberships = apiSceneMemberships(nodes);
		expect(Object.keys(memberships).sort()).toEqual(
			Object.values(API_SCENE_GROUP_IDS).sort(),
		);
		const actionUrns = memberships[API_SCENE_GROUP_IDS.action] ?? [];
		expect(actionUrns.length).toBeGreaterThan(0);
		for (const urn of actionUrns) {
			expect(parseMembershipUrn(urn)?.kind).toBe(API_SCENE_IDENTITY_KIND);
		}
	});
});

describe('U130L apiScene: toggle solo en command registrado', () => {
	function commandRegistry() {
		const registry = createSasiRegistry();
		registry.register({
			id: 'vaultman.test.cmd',
			axis: 'function',
			kind: 'command',
			labelKey: 'sasi.test.cmd',
			supports: [{ surface: 'chrome:navbar' }],
			composes: ['vaultman.move.cancel'],
		});
		registry.register({
			id: 'vaultman.test.act',
			axis: 'function',
			kind: 'action',
			labelKey: 'sasi.test.act',
			supports: [{ surface: 'chrome:navbar' }],
		});
		return registry;
	}

	it('el command registrado con descriptor pinta toggle con su estado', () => {
		const registry = commandRegistry();
		const nodes = buildApiSceneNodes(
			registry,
			fakePublisher([{ id: 'vaultman.test.cmd', published: true }], {
				isPublishable: (id) => id === 'vaultman.test.cmd',
			}),
		);
		const cmd = nodes.find(
			(n) => n.meta.group === 'command' && n.meta.sasiId === 'vaultman.test.cmd',
		);
		expect(cmd?.meta.publishable).toBe(true);
		expect(cmd?.meta.published).toBe(true);
		expect(
			cmd?.cells?.find((cell) => cell.kind === 'toggle' && cell.id === PUBLISH_CELL_ID),
		).toMatchObject({ kind: 'toggle', enabled: true });
	});

	it('sin descriptor no hay toggle ni en command', () => {
		const registry = commandRegistry();
		const nodes = buildApiSceneNodes(
			registry,
			fakePublisher([], { isPublishable: () => false }),
		);
		const cmd = nodes.find(
			(n) => n.meta.group === 'command' && n.meta.sasiId === 'vaultman.test.cmd',
		);
		expect(cmd?.meta.publishable).toBe(false);
		expect(cmd?.cells ?? []).toEqual([]);
	});

	it('la action NO lleva toggle aunque el publisher conozca el mismo id', () => {
		const registry = commandRegistry();
		const nodes = buildApiSceneNodes(
			registry,
			fakePublisher([{ id: 'vaultman.test.act', published: true }], {
				isPublishable: () => true,
			}),
		);
		const act = nodes.find(
			(n) => n.meta.group === 'action' && n.meta.sasiId === 'vaultman.test.act',
		);
		expect(act).toBeDefined();
		expect(act?.meta.publishable).toBe(false);
		expect(act?.cells ?? []).toEqual([]);
	});

	it('tras publicar, reconstruir refleja el estado (sin snapshot obsoleta)', () => {
		const registry = commandRegistry();
		const before = buildApiSceneNodes(
			registry,
			fakePublisher([{ id: 'vaultman.test.cmd', published: false }], {
				isPublishable: (id) => id === 'vaultman.test.cmd',
			}),
		);
		expect(
			before
				.find((n) => n.meta.sasiId === 'vaultman.test.cmd' && n.meta.group === 'command')
				?.cells?.find((cell) => cell.id === PUBLISH_CELL_ID),
		).toMatchObject({ enabled: false });
		const after = buildApiSceneNodes(
			registry,
			fakePublisher([{ id: 'vaultman.test.cmd', published: true }], {
				isPublishable: (id) => id === 'vaultman.test.cmd',
			}),
		);
		expect(
			after
				.find((n) => n.meta.sasiId === 'vaultman.test.cmd' && n.meta.group === 'command')
				?.cells?.find((cell) => cell.id === PUBLISH_CELL_ID),
		).toMatchObject({ enabled: true });
	});
});
