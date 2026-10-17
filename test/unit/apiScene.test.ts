import { installCommandPaletteFilter } from '../../src/logic/logicCommandPaletteInterceptor';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../../src/components/layout/apiSceneHost.svelte', () => ({ default: {} }));
import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';
import {
	API_SCENE_GROUP_IDS,
	API_SCENE_IDENTITY_KIND,
	apiSceneIdentityKindFor,
	findApiSceneNode,
	flattenApiSceneNodes,
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
	nestApiScenePluginKinds,
	type ApiSceneGroupMeta,
	type ApiSceneNodeMeta,
	type ApiScenePublisherView,
} from '../../src/logic/logicApiScene';
import { CHROME_SURFACES } from '../../src/logic/logicSasiBootstrap';
import { parseMembershipUrn } from '../../src/logic/logicMembershipUrn';
import { NO_GROUP_ID } from '../../src/logic/logicTreeGroupProjection';
import { createSasiProvider } from '../../src/services/serviceSasiProvider';
import { createSasiCommandPublisher } from '../../src/logic/logicSasiCommands';
import {
	apiSceneInstanceIdFromRow,
	apiSceneInstanceFailureNoticeKey,
	createApiScenePublisherView,
} from '../../src/modals/modalSasiInspector';
import type { InstanceRegistryData } from '../../src/types/typeInstance';
import type { TreeNode } from '../../src/types/typeTree';

function fakePublisher(
	entries: readonly { id: string; published: boolean; name?: string }[] = [],
	extra?: Partial<ApiScenePublisherView>,
): ApiScenePublisherView {
	return {
		isPublished: (id) => {
			const entry = entries.find((e) => e.id === id);
			return entry !== undefined ? entry.published : true;
		},
		snapshot: () =>
			entries.map((e) => ({
				id: e.id,
				published: e.published,
				descriptor: { name: e.name ?? e.id },
			})),
		...extra,
	};
}

it('projects community and core plugin types as children of their plugin kind', () => {
	const nodes = buildApiSceneNodes(createVaultmanSasi().registry);
	const nested = nestApiScenePluginKinds(nodes);
	const kind = nested.find((node) => node.meta.catalogKind === 'node_plugin');
	const children = kind?.children?.map((node) => node.meta.catalogKind);
	// The children remain real SASI rows, not duplicate root-level kinds.
		expect(children?.sort()).toEqual(['node_plugin_community', 'node_plugin_core']);
		expect(nested.some((node) => node.meta.catalogKind === 'node_plugin_core')).toBe(false);
});

function fakeInstances(custom?: Partial<InstanceRegistryData>): InstanceRegistryData {
	return {
		schema: 1,
		...custom,
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
			...(custom?.instances ?? {}),
		},
	};
}

function publisherFor(ids: readonly string[]) {
	const publisher = createSasiCommandPublisher({
		addCommand: () => undefined,
		removeCommand: () => undefined,
	});
	for (const id of ids) {
		publisher.register({ id, name: id, handler: () => {} });
	}
	return publisher;
}

describe('U130L apiScene: grupos', () => {
	it('los grupos existen con ids estables', () => {
		const groups = buildApiSceneGroups((name) => name);
		expect(groups.map((g) => g.id)).toEqual(
			API_SCENE_GROUP_NAMES.map((name) => API_SCENE_GROUP_IDS[name]),
		);
		expect(groups).toHaveLength(API_SCENE_GROUP_NAMES.length);
		expect(groups.some((g) => g.id === API_SCENE_GROUP_IDS.input)).toBe(true);
	});

	it('la proyeccion emite las cabeceras con meta propia y sin fantasma', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher(), fakeInstances());
		const tree = projectApiSceneTree(nodes);
		// Sin fantasma `vaultman.group.none`: los grupos particionan todo.
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

		// Input header includes keyboard and mouse navigation p-nodes
		const inputHeader = headers.find((h) => h.id === API_SCENE_GROUP_IDS.input);
		expect(inputHeader).toBeDefined();
		expect((inputHeader?.children ?? []).length).toBe(2);
	});
});

describe('U130L apiScene: identidad', () => {
	it('todo leaf tiene identidad especifica (node_actions, node_commands, etc.) con URN estable parseable', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher(), fakeInstances());
		expect(nodes.length).toBeGreaterThan(0);
		for (const node of nodes) {
			const expectedKind = apiSceneIdentityKindFor(node.meta.group);
			expect(node.meta.identityKind).toBe(expectedKind);
			const ref = parseMembershipUrn(node.meta.urn);
			expect(ref).not.toBeNull();
			expect(ref?.providerId).toBe('sasi');
			expect(ref?.kind).toBe(expectedKind);
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

	it('publishes plugin kind and core/community child types to apiScene', () => {
		const { registry } = createVaultmanSasi();
		const kindIds = registry.list('kind').map((def) => def.id);
		expect(kindIds).toEqual(
			expect.arrayContaining(['node_plugin', 'node_plugin_core', 'node_plugin_community']),
		);
		const kindRows = buildApiSceneNodes(registry, fakePublisher()).filter(
			(node) => node.meta.group === 'kind',
		);
		expect(kindRows.map((node) => node.meta.catalogKind)).toEqual(
			expect.arrayContaining(['node_plugin', 'node_plugin_core', 'node_plugin_community']),
		);
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
	it('maps failed opens to localized user-facing reason keys', () => {
		expect(apiSceneInstanceFailureNoticeKey('tombstoned-instance')).toBe(
			'sasi.apiscene.instance_open_failed.tombstoned',
		);
		expect(apiSceneInstanceFailureNoticeKey('reveal-failed')).toBe(
			'sasi.apiscene.instance_open_failed',
		);
	});

	it('routes only instance rows by their durable id', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher(), fakeInstances());

		expect(apiSceneInstanceIdFromRow('sasi:instance:vm-instance-aaa', nodes)).toBe(
			'vm-instance-aaa',
		);
		expect(apiSceneInstanceIdFromRow('sasi:scene:files', nodes)).toBeNull();
	});

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

describe('U130L apiScene: publisher command descriptors', () => {
	it('modal adapter preserves the real descriptor name for apiScene rows', () => {
		const { registry } = createVaultmanSasi();
		const publisher = createSasiCommandPublisher({
			addCommand: () => undefined,
			removeCommand: () => undefined,
		});
		publisher.register({
			id: 'focus-active-explorer-search',
			name: 'Focus the active explorer search',
			handler: () => {},
		});

		const nodes = buildApiSceneNodes(
			registry,
			createApiScenePublisherView(publisher),
		);
		const command = findApiSceneNode(
			nodes,
			(node) =>
				node.meta.group === 'command' &&
				node.meta.sasiId === 'focus-active-explorer-search',
		);
		expect(command?.label).toBe('Focus the active explorer search');
	});

	it('proyecta un descriptor real aunque registry.listCommands este vacio', () => {
		const { registry } = createVaultmanSasi();
		const commandId = 'focus-active-explorer-search';
		const publisher = publisherFor([commandId]);

		expect(registry.listCommands()).toEqual([]);
		const nodes = buildApiSceneNodes(registry, publisher);
		const command = findApiSceneNode(
			nodes,
			(node) => node.meta.group === 'command' && node.meta.sasiId === commandId,
		);
		const action = findApiSceneNode(
			nodes,
			(node) => node.meta.group === 'action' && node.meta.sasiId === commandId,
		);

		expect(command?.meta.publishable).toBe(true);
		expect(command?.cells).toContainEqual(
			expect.objectContaining({ id: PUBLISH_CELL_ID, kind: 'toggle' }),
		);
		expect(action?.meta.publishable).toBe(false);
		expect(action?.cells ?? []).toEqual([]);
		expect(command?.meta.urn).not.toBe(action?.meta.urn);
	});

	it('conserva la preferencia Published al reconstruir el publisher y el apiScene', () => {
		const { registry } = createVaultmanSasi();
		const commandId = 'focus-active-explorer-search';
		const first = publisherFor([commandId]);
		first.restorePublished({ [commandId]: true });
		const published = findApiSceneNode(
			buildApiSceneNodes(registry, first),
			(node) => node.meta.group === 'command' && node.meta.sasiId === commandId,
		);
		expect(published?.meta.published).toBe(true);

		first.setPublished(commandId, false);
		const second = publisherFor([commandId]);
		second.restorePublished({ [commandId]: false });
		const hidden = findApiSceneNode(
			buildApiSceneNodes(registry, second),
			(node) => node.meta.group === 'command' && node.meta.sasiId === commandId,
		);
		expect(hidden?.meta.published).toBe(false);
		expect(hidden?.cells).toContainEqual(
			expect.objectContaining({ id: PUBLISH_CELL_ID, enabled: false }),
		);
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

	it('memberships cubre los 9 grupos en orden de filas', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher(), fakeInstances());
		const memberships = apiSceneMemberships(nodes);
		expect(Object.keys(memberships).sort()).toEqual(
			Object.values(API_SCENE_GROUP_IDS).sort(),
		);
		const actionUrns = memberships[API_SCENE_GROUP_IDS.action] ?? [];
		expect(actionUrns.length).toBeGreaterThan(0);
		for (const urn of actionUrns) {
			expect(parseMembershipUrn(urn)?.kind).toBe('node_actions');
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
		const allFlat = flattenApiSceneNodes(nodes);
		expect(
			allFlat.filter(
				(node) =>
					node.meta.group === 'command' &&
					node.meta.sasiId === 'vaultman.test.cmd',
			),
		).toHaveLength(1);
		const cmd = findApiSceneNode(
			nodes,
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
		const cmd = findApiSceneNode(
			nodes,
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
		const beforeCmd = findApiSceneNode(
			before,
			(n) => n.meta.sasiId === 'vaultman.test.cmd' && n.meta.group === 'command',
		);
		expect(
			beforeCmd?.cells?.find((cell) => cell.id === PUBLISH_CELL_ID),
		).toMatchObject({ enabled: false });
		const after = buildApiSceneNodes(
			registry,
			fakePublisher([{ id: 'vaultman.test.cmd', published: true }], {
				isPublishable: (id) => id === 'vaultman.test.cmd',
			}),
		);
		const afterCmd = findApiSceneNode(
			after,
			(n) => n.meta.sasiId === 'vaultman.test.cmd' && n.meta.group === 'command',
		);
		expect(
			afterCmd?.cells?.find((cell) => cell.id === PUBLISH_CELL_ID),
		).toMatchObject({ enabled: true });
	});
});

describe("U130-C1: scopes group y p-nodes de comandos", () => {
	it("el grupo scope incluye los scopes disponibles en el workspace", () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(
			registry,
			fakePublisher(),
			fakeInstances({ instances: { "inst-1": { id: "inst-1", cell_name: "Primary" } as any } })
		);
		const scopes = nodes.filter((n) => n.meta.group === "scope");
		expect(scopes.length).toBeGreaterThanOrEqual(6);
		expect(scopes.some((n) => n.meta.sasiId === "workspace:all")).toBe(true);
		expect(scopes.some((n) => n.meta.sasiId === "workspace:last_focused")).toBe(true);
		expect(scopes.some((n) => n.meta.sasiId === "scene:depth_scope")).toBe(true);
		expect(scopes.some((n) => n.meta.sasiId === "instance:vm-instance-aaa")).toBe(true);
	});

	it("los comandos se construyen como p-nodes con hijos de actions y scopes", () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(
			registry,
			fakePublisher([{ id: "props.add_property", published: true }])
		);
		const cmd = findApiSceneNode(
			nodes,
			(n) => n.meta.group === "command" && n.meta.sasiId === "props.add_property"
		);
		expect(cmd).toBeDefined();
		expect(cmd?.showCaret).toBe(true);
		expect(cmd?.children?.length).toBeGreaterThan(0);
		// Tiene dos node_group: uno para actions y otro para scope
		const actionGroup = cmd?.children?.find((c) => c.typeText === "node_group" && c.id.includes(":group:actions"));
		expect(actionGroup).toBeDefined();
		expect(actionGroup?.children?.length).toBeGreaterThan(0);
		const scopeGroup = cmd?.children?.find((c) => c.typeText === "node_group" && c.id.includes(":group:scope"));
		expect(scopeGroup).toBeDefined();
		expect(scopeGroup?.children?.length).toBeGreaterThan(0);
	});

	it("el publisher permite renombrar comandos actualizando su proyeccion", () => {
		let removed = "";
		let added = "";
		const plugin = {
			addCommand: (c: any) => { added = c.name; },
			removeCommand: (id: string) => { removed = id; },
		};
		const pub = createSasiCommandPublisher(plugin);
		pub.register({
			id: "test-cmd",
			name: "Initial Name",
			handler: () => {},
		});
		pub.setPublished("test-cmd", true);
		expect(added).toBe("Initial Name");

		const renamed = pub.rename("test-cmd", "Renamed Name");
		expect(renamed).toBe(true);
		expect(removed).toBe("test-cmd");
		expect(added).toBe("Renamed Name");
		expect(pub.snapshot().find((e) => e.id === "test-cmd")?.descriptor?.name).toBe("Renamed Name");
	});
});

describe('U130-C1: separación en subgrupos de commands, sublevels de provided y command palette filter', () => {
	it('organiza los commands en subgrupos 0+1: Vaultman, Custom y Provided', () => {
		const { registry } = createVaultmanSasi();
		const publisher = fakePublisher([{ id: 'focus-active-explorer-search', published: true }]);
		const customCommands = {
			'custom-1': { id: 'custom-1', name: 'My Custom', composes: ['focus-active-explorer-search', 'vaultman.scene.goto.files'] },
		};
		const providedCommands = [
			{ id: 'app:open-vault', name: 'Open vault' },
			{ id: 'dataview:rebuild-view', name: 'Dataview: Rebuild view' },
		];

		const nodes = buildApiSceneNodes(registry, publisher, undefined, {
			customCommands,
			providedCommands,
			communityPluginNames: { dataview: 'Dataview' },
		});

		const commandSubgroups = nodes.filter((n) => n.meta.group === 'command');
		expect(commandSubgroups.some((n) => n.id === 'sasi:command:subgroup:vaultman')).toBe(true);
		expect(commandSubgroups.some((n) => n.id === 'sasi:command:subgroup:custom')).toBe(true);
		expect(commandSubgroups.some((n) => n.id === 'sasi:command:subgroup:provided')).toBe(true);

		const vaultmanGroup = commandSubgroups.find((n) => n.id === 'sasi:command:subgroup:vaultman');
		expect(vaultmanGroup?.typeText).toBe('node_group');
		expect(vaultmanGroup?.showCaret).toBe(true);
		expect(vaultmanGroup?.children?.length).toBeGreaterThan(0);

		const customGroup = commandSubgroups.find((n) => n.id === 'sasi:command:subgroup:custom');
		expect(customGroup?.typeText).toBe('node_group');
		expect(customGroup?.children?.some((c) => c.meta.sasiId === 'custom-1')).toBe(true);

		const providedGroup = commandSubgroups.find((n) => n.id === 'sasi:command:subgroup:provided');
		expect(providedGroup?.typeText).toBe('node_group');
		// Provided tiene subnivel 0+3 distinguiendo Core vs Community
		const coreGroup = providedGroup?.children?.find((c) => c.id === 'sasi:command:provided:subgroup:core');
		expect(coreGroup).toBeDefined();
		expect(coreGroup?.label).toBe('Obsidian');
		expect(coreGroup?.children?.some((c) => c.meta.sasiId === 'app:open-vault')).toBe(true);

		const dataviewGroup = providedGroup?.children?.find((c) => c.id === 'sasi:command:provided:subgroup:dataview');
		expect(dataviewGroup).toBeDefined();
		expect(dataviewGroup?.label).toBe('Dataview');
		expect(dataviewGroup?.children?.some((c) => c.meta.sasiId === 'dataview:rebuild-view')).toBe(true);
	});

	it('los comandos custom y vaultman pueden componer tanto acciones como otros node_commands', () => {
		const { registry } = createVaultmanSasi();
		const customCommands = {
			'custom-macro': {
				id: 'custom-macro',
				name: 'Macro with command and action',
				composes: ['focus-active-explorer-search', 'vaultman.scene.goto.files'],
			},
		};

		const nodes = buildApiSceneNodes(registry, fakePublisher(), undefined, {
			customCommands,
		});

		const macroNode = findApiSceneNode(nodes, (n) => n.meta.sasiId === 'custom-macro');
		expect(macroNode).toBeDefined();
		const actionsGroup = macroNode?.children?.find((c) => c.id.includes(':group:actions'));
		expect(actionsGroup).toBeDefined();

		// Compone un comando (typeText: command, identityKind: node_commands) y una acción (typeText: action, identityKind: node_actions)
		const subCmdChild = actionsGroup?.children?.find((c) => c.meta.sasiId === 'focus-active-explorer-search');
		expect(subCmdChild?.typeText).toBe('command');
		expect(subCmdChild?.meta.identityKind).toBe('node_commands');

		const subActionChild = actionsGroup?.children?.find((c) => c.meta.sasiId === 'vaultman.scene.goto.files');
		expect(subActionChild?.typeText).toBe('action');
		expect(subActionChild?.meta.identityKind).toBe('node_actions');
	});

	it('los comandos de la paleta son node_command_provided, activos por defecto con cell_toggle y secuestran proyeccion en off', () => {
		const { registry } = createVaultmanSasi();
		const providedCommands = [
			{ id: 'editor:fold-all', name: 'Fold all' },
			{ id: 'quickadd:choice:123', name: 'QuickAdd choice' },
		];

		const nodes = buildApiSceneNodes(registry, fakePublisher(), undefined, {
			providedCommands,
		});

		const foldCmd = findApiSceneNode(nodes, (n) => n.meta.sasiId === 'editor:fold-all');
		expect(foldCmd).toBeDefined();
		expect(foldCmd?.typeText).toBe('node_command_provided');
		expect(foldCmd?.meta.publishable).toBe(true);
		expect(foldCmd?.meta.published).toBe(true);
		expect(foldCmd?.cells).toContainEqual(
			expect.objectContaining({ id: PUBLISH_CELL_ID, kind: 'toggle', enabled: true }),
		);

		// Intercepción en la paleta de comandos nativa
		const mockCpInstance = {
			getCommands: () => [
				{ id: 'editor:fold-all', name: 'Fold all' },
				{ id: 'quickadd:choice:123', name: 'QuickAdd choice' },
			],
			modal: { commands: [] as any },
		};
		const mockApp = {
			internalPlugins: {
				getPluginById: (id: string) => (id === 'command-palette' ? { instance: mockCpInstance } : null),
			},
		} as any;

		let publishedState: Record<string, boolean> = {
			'editor:fold-all': false,
			'quickadd:choice:123': true,
		};

		const cleanup = installCommandPaletteFilter(mockApp, (id) => publishedState[id] ?? true);

		// Cuando está toggled a off, la proyección a la paleta nativa filtra ese comando
		const projected = mockCpInstance.getCommands();
		expect(projected.map((c: any) => c.id)).toEqual(['quickadd:choice:123']);
		expect(mockCpInstance.modal.commands).toBeNull(); // Caché invalidada

		cleanup();
		// Al limpiar o restaurar, vuelven a proyectarse
		expect(mockCpInstance.getCommands().map((c: any) => c.id)).toEqual([
			'editor:fold-all',
			'quickadd:choice:123',
		]);
	});
});
