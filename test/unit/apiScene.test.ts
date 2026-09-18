import { describe, expect, it } from 'vitest';
import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';
import {
	API_SCENE_GROUP_IDS,
	API_SCENE_IDENTITY_KIND,
	API_SCENE_GROUP_KIND,
	API_SCENE_GROUP_NAMES,
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
import { parseMembershipUrn } from '../../src/logic/logicMembershipUrn';
import { createSasiProvider } from '../../src/services/serviceSasiProvider';
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

describe('U130L apiScene: grupos', () => {
	it('los 8 grupos existen con ids estables', () => {
		const groups = buildApiSceneGroups((name) => name);
		expect(groups.map((g) => g.id)).toEqual(
			API_SCENE_GROUP_NAMES.map((name) => API_SCENE_GROUP_IDS[name]),
		);
		expect(groups).toHaveLength(8);
	});

	it('la proyeccion emite las 8 cabeceras aunque haya grupos vacios', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher());
		const tree = projectApiSceneTree(nodes);
		const headers = tree.filter((row) => row.isGroupHeader === true);
		expect(headers.map((h) => h.id).sort()).toEqual(
			Object.values(API_SCENE_GROUP_IDS).sort(),
		);
		// kind/provider/command estan vacios hoy: cabecera sin hijos, no ausentes.
		for (const name of ['kind', 'provider', 'command'] as const) {
			const header = headers.find((h) => h.id === API_SCENE_GROUP_IDS[name]);
			expect(header).toBeDefined();
			expect(header?.children ?? []).toEqual([]);
		}
	});
});

describe('U130L apiScene: identidad', () => {
	it('todo leaf es node_apis con URN estable parseable', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher());
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

	it('las cabeceras son node_groups sin URN ni identidad', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher());
		const tree = projectApiSceneTree(nodes);
		for (const header of tree.filter((row) => row.isGroupHeader === true)) {
			const meta = header.meta as ApiSceneGroupMeta;
			expect(meta.identityKind).toBe(API_SCENE_GROUP_KIND);
			expect(meta.identityKind).not.toBe(API_SCENE_IDENTITY_KIND);
			expect(
				(header as TreeNode<ApiSceneNodeMeta>).meta as unknown as {
					urn?: string;
				},
			);
			expect((meta as { urn?: string }).urn).toBeUndefined();
			expect(isApiSceneNode(header)).toBe(false);
		}
	});

	it('los miembros cuelgan a profundidad 1 bajo su cabecera', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher());
		const tree = projectApiSceneTree(nodes);
		const actionHeader = tree.find((h) => h.id === API_SCENE_GROUP_IDS.action);
		expect(actionHeader).toBeDefined();
		expect(actionHeader?.children?.length).toBeGreaterThan(0);
		for (const child of actionHeader?.children ?? []) {
			expect(child.depth).toBe(1);
			expect((child.meta as ApiSceneNodeMeta).group).toBe('action');
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

	it('el grupo command existe aunque el registro no tenga kinds command', () => {
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

	it('las scenes salen de los goto SASI con sus supports', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher());
		const scenes = nodes.filter((n) => n.meta.group === 'scene');
		expect(scenes.map((n) => n.id)).toEqual([
			'sasi:scene:files',
			'sasi:scene:props',
			'sasi:scene:tags',
			'sasi:scene:content',
			'sasi:scene:snippets',
			'sasi:scene:plugins',
		]);
		const files = scenes.find((n) => n.id === 'sasi:scene:files');
		expect(files?.meta.sasiId).toBe('vaultman.scene.goto.files');
		expect(files?.meta.supports).toEqual(['panelWidget']);
	});

	it('las superficies son las supports distintas del registro', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(registry, fakePublisher());
		const surfaces = nodes
			.filter((n) => n.meta.group === 'surface')
			.map((n) => n.id);
		expect(surfaces).toContain('sasi:surface:panelWidget');
		expect(surfaces).toContain('sasi:surface:searchbox');
		expect(surfaces).toContain('sasi:surface:statusBar');
		expect([...surfaces].sort()).toEqual(surfaces);
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
		const nodes = buildApiSceneNodes(registry, fakePublisher());
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

describe('U130L apiScene: toggle publicable', () => {
	it('nunca ofrece toggle en provider/kind/surface sin descriptor', () => {
		const { registry } = createVaultmanSasi();
		const publisher = fakePublisher([
			{ id: 'apply-queue', published: true },
		]);
		const nodes = buildApiSceneNodes(registry, publisher);
		for (const group of ['kind', 'provider', 'surface'] as const) {
			for (const node of nodes.filter((n) => n.meta.group === group)) {
				expect(node.meta.publishable).toBe(false);
				expect(node.cells ?? []).toEqual([]);
			}
		}
	});

	it('la instancia con descriptor pinta toggle con su estado', () => {
		const { registry } = createVaultmanSasi();
		const nodes = buildApiSceneNodes(
			registry,
			fakePublisher([{ id: 'apply-queue', published: true }]),
		);
		const instance = nodes.find(
			(n) => n.meta.group === 'instance' && n.meta.sasiId === 'apply-queue',
		);
		expect(instance?.meta.publishable).toBe(true);
		expect(instance?.meta.published).toBe(true);
		const toggle = instance?.cells?.find(
			(cell) => cell.kind === 'toggle' && cell.id === PUBLISH_CELL_ID,
		);
		expect(toggle).toMatchObject({ kind: 'toggle', enabled: true });
	});

	it('la accion con descriptor ofrece toggle; sin descriptor no', () => {
		const { registry } = createVaultmanSasi();
		const publisher = fakePublisher([
			{ id: 'vaultman.scene.goto.files', published: false },
		]);
		const nodes = buildApiSceneNodes(registry, publisher);
		const gotoFiles = nodes.find(
			(n) => n.meta.sasiId === 'vaultman.scene.goto.files',
		);
		expect(gotoFiles?.meta.publishable).toBe(true);
		expect(gotoFiles?.cells).toHaveLength(1);
		const moveCancel = nodes.find(
			(n) => n.meta.sasiId === 'vaultman.move.cancel',
		);
		expect(moveCancel?.meta.publishable).toBe(false);
		expect(moveCancel?.cells ?? []).toEqual([]);
	});

	it('usa isPublishable cuando existe (puente del worker de persistencia)', () => {
		const { registry } = createVaultmanSasi();
		const publisher = fakePublisher([], {
			isPublishable: (id) => id === 'vaultman.move.cancel',
		});
		const nodes = buildApiSceneNodes(registry, publisher);
		const moveCancel = nodes.find(
			(n) => n.meta.sasiId === 'vaultman.move.cancel',
		);
		expect(moveCancel?.meta.publishable).toBe(true);
		expect(moveCancel?.meta.published).toBe(false);
		expect(moveCancel?.cells).toHaveLength(1);
	});

	it('tras publicar, reconstruir refleja el estado (sin snapshot obsoleta)', () => {
		const { registry } = createVaultmanSasi();
		const before = buildApiSceneNodes(
			registry,
			fakePublisher([{ id: 'apply-queue', published: false }]),
		);
		const beforeToggle = before
			.find((n) => n.meta.sasiId === 'apply-queue' && n.meta.group === 'instance')
			?.cells?.find((cell) => cell.id === PUBLISH_CELL_ID);
		expect(beforeToggle).toMatchObject({ enabled: false });
		const after = buildApiSceneNodes(
			registry,
			fakePublisher([{ id: 'apply-queue', published: true }]),
		);
		const afterToggle = after
			.find((n) => n.meta.sasiId === 'apply-queue' && n.meta.group === 'instance')
			?.cells?.find((cell) => cell.id === PUBLISH_CELL_ID);
		expect(afterToggle).toMatchObject({ enabled: true });
	});
});
