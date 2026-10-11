import type { SasiDef, SasiRegistry } from './logicSasiRegistry';
import {
	API_SCENE_SELF_ID,
	API_SCENE_TABS,
	apiSceneUrnFor,
	type ApiSceneNodeMeta,
	type ApiScenePublisherView,
} from './logicApiSceneModel';
import {
	toApiSceneNode,
	type ApiSceneLeafSpec,
} from './logicApiSceneNodeFactory';
import { appendApiSceneCommandNodes } from './logicApiSceneCommandRows';
import type { InstanceRegistryData } from '../types/typeInstance';
import type { TreeNode } from '../types/typeTree';

interface NodeBuildContext {
	out: TreeNode<ApiSceneNodeMeta>[];
	publisher: ApiScenePublisherView | undefined;
	snapshotIds: ReadonlySet<string>;
}

function appendFunctionNodes(
	context: NodeBuildContext,
	defs: readonly SasiDef[],
	group: 'action' | 'operation',
): void {
	for (const def of defs) {
		context.out.push(
			toApiSceneNode({
				spec: {
					group,
					rowId: `sasi:${group}:${def.id}`,
					canonicalId: `${group}:${def.id}`,
					sasiId: def.id,
					label: def.labelKey,
					labelKey: def.labelKey,
					...(def.icon ? { icon: def.icon } : {}),
					sasiKind: group,
					supports: def.supports.map((support) => support.surface),
					composes: def.composes ?? [],
					mutatesVault: group === 'operation' && def.mutatesVault === true,
				},
				publisher: context.publisher,
				snapshotIds: context.snapshotIds,
				isCommand: false,
			}),
		);
	}
}

function appendInstanceNodes(
	context: NodeBuildContext,
	instances: InstanceRegistryData | undefined,
): void {
	const records = Object.values(instances?.instances ?? {}).sort((a, b) =>
		a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
	);
	for (const record of records) {
		const displayName = record.cell_name ? record.cell_name : record.id;
		const node = toApiSceneNode({
			spec: {
				group: 'instance',
				rowId: `sasi:instance:${record.id}`,
				canonicalId: `instance:${record.id}`,
				sasiId: record.id,
				label: displayName,
				labelKey: displayName,
				icon: 'lucide-app-window',
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
				...(record.activeScene !== undefined
					? { activeScene: record.activeScene }
					: {}),
				tombstoned: record.tombstoned,
				revision: record.revision,
			},
			publisher: context.publisher,
			snapshotIds: context.snapshotIds,
		});
		node.meta.cell_name = record.cell_name;
		context.out.push(node);
	}
}

function appendSceneNodes(
	context: NodeBuildContext,
	registry: SasiRegistry,
): void {
	const byId = new Map(
		registry.list('function').map((def) => [def.id, def] as const),
	);
	for (const tab of API_SCENE_TABS) {
		const gotoId = `vaultman.scene.goto.${tab}`;
		const def = byId.get(gotoId);
		const spec: ApiSceneLeafSpec = {
			group: 'scene',
			rowId: `sasi:scene:${tab}`,
			canonicalId: `scene:${tab}`,
			sasiId: gotoId,
			label: def?.labelKey ?? `sasi.scene.goto.${tab}`,
			labelKey: def?.labelKey ?? `sasi.scene.goto.${tab}`,
			...(def?.icon ? { icon: def.icon } : {}),
			sasiKind: def?.kind ?? null,
			supports: def ? def.supports.map((support) => support.surface) : [],
			composes: def?.composes ?? [],
			mutatesVault: false,
		};
		context.out.push(
			toApiSceneNode({
				spec,
				publisher: context.publisher,
				snapshotIds: context.snapshotIds,
			}),
		);
	}
	context.out.push(
		toApiSceneNode({
			spec: {
				group: 'scene',
				rowId: 'sasi:scene:apiscene',
				canonicalId: 'scene:apiscene',
				sasiId: API_SCENE_SELF_ID,
				label: 'sasi.apiscene.scene',
				labelKey: 'sasi.apiscene.scene',
				icon: 'lucide-cpu',
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
			},
			publisher: context.publisher,
			snapshotIds: context.snapshotIds,
		}),
	);
}

function appendAxisNodes(
	context: NodeBuildContext,
	defs: readonly SasiDef[],
	group: 'provider' | 'surface' | 'kind',
): void {
	for (const def of defs) {
		context.out.push(
			toApiSceneNode({
				spec: {
					group,
					rowId: `sasi:${group}:${def.id}`,
					canonicalId: `${group}:${def.id}`,
					sasiId: def.id,
					label: def.labelKey,
					labelKey: def.labelKey,
					...(def.icon ? { icon: def.icon } : {}),
					sasiKind: def.kind ?? null,
					...(def.catalogKind ? { catalogKind: def.catalogKind } : {}),
					supports: def.supports.map((support) => support.surface),
					composes: def.composes ?? [],
					mutatesVault: false,
				},
				publisher: context.publisher,
				snapshotIds: context.snapshotIds,
			}),
		);
	}
}

function appendKindSubgroups(context: NodeBuildContext): void {
	// 1. Kinds / Nodes
	const filesChildren: TreeNode<ApiSceneNodeMeta>[] = [
		{ id: '.md', label: '.md', icon: 'lucide-file-text' },
		{ id: '.base', label: '.base', icon: 'lucide-database' },
		{ id: '.canvas', label: '.canvas', icon: 'lucide-layout-grid' },
		{ id: '.json', label: '.json', icon: 'lucide-file-code' },
	].map((item) => ({
		id: `sasi:kind:nodes:files:${item.id}`,
		label: item.label,
		icon: item.icon,
		typeText: 'file_type',
		depth: 2,
		meta: {
			identityKind: 'node_kinds',
			urn: apiSceneUrnFor(`kind:nodes:files:${item.id}`, item.label, 'node_kinds'),
			group: 'kind',
			subgroup: 'kind.nodes',
			sasiId: `file:${item.id}`,
			labelKey: item.label,
			sasiKind: null,
			supports: [],
			composes: [],
			mutatesVault: false,
			publishable: false,
			published: false,
		},
	}));

	const filesNode: TreeNode<ApiSceneNodeMeta> = {
		id: 'sasi:kind:nodes:files',
		label: 'Files',
		icon: 'lucide-file',
		typeText: 'p-node',
		depth: 1,
		showCaret: true,
		children: filesChildren,
		meta: {
			identityKind: 'node_kinds',
			urn: apiSceneUrnFor('kind:nodes:files', 'Files', 'node_kinds'),
			group: 'kind',
			subgroup: 'kind.nodes',
			sasiId: 'node:files',
			labelKey: 'Files',
			sasiKind: null,
			supports: [],
			composes: [],
			mutatesVault: false,
			publishable: false,
			published: false,
		},
	};

	const valuesChildren: TreeNode<ApiSceneNodeMeta>[] = [
		{ id: 'text', label: 'text', icon: 'lucide-type' },
		{ id: 'list', label: 'list', icon: 'lucide-list' },
		{ id: 'number', label: 'number', icon: 'lucide-hash' },
		{ id: 'boolean', label: 'boolean', icon: 'lucide-check-square' },
		{ id: 'date', label: 'date', icon: 'lucide-calendar' },
		{ id: 'object', label: 'object', icon: 'lucide-braces' },
	].map((item) => ({
		id: `sasi:kind:nodes:values:${item.id}`,
		label: item.label,
		icon: item.icon,
		typeText: 'value_type',
		depth: 2,
		meta: {
			identityKind: 'node_kinds',
			urn: apiSceneUrnFor(`kind:nodes:values:${item.id}`, item.label, 'node_kinds'),
			group: 'kind',
			subgroup: 'kind.nodes',
			sasiId: `value:${item.id}`,
			labelKey: item.label,
			sasiKind: null,
			supports: [],
			composes: [],
			mutatesVault: false,
			publishable: false,
			published: false,
		},
	}));

	const valuesNode: TreeNode<ApiSceneNodeMeta> = {
		id: 'sasi:kind:nodes:values',
		label: 'Values',
		icon: 'lucide-binary',
		typeText: 'p-node',
		depth: 1,
		showCaret: true,
		children: valuesChildren,
		meta: {
			identityKind: 'node_kinds',
			urn: apiSceneUrnFor('kind:nodes:values', 'Values', 'node_kinds'),
			group: 'kind',
			subgroup: 'kind.nodes',
			sasiId: 'node:values',
			labelKey: 'Values',
			sasiKind: null,
			supports: [],
			composes: [],
			mutatesVault: false,
			publishable: false,
			published: false,
		},
	};

	const simpleNodes: TreeNode<ApiSceneNodeMeta>[] = [
		{ id: 'folder', label: 'Folder', icon: 'lucide-folder' },
		{ id: 'tag', label: 'Tag', icon: 'lucide-tag' },
		{ id: 'snippet', label: 'Snippet', icon: 'lucide-file-code' },
	].map((item) => ({
		id: `sasi:kind:nodes:${item.id}`,
		label: item.label,
		icon: item.icon,
		typeText: 'node_type',
		depth: 1,
		meta: {
			identityKind: 'node_kinds',
			urn: apiSceneUrnFor(`kind:nodes:${item.id}`, item.label, 'node_kinds'),
			group: 'kind',
			subgroup: 'kind.nodes',
			sasiId: `node:${item.id}`,
			labelKey: item.label,
			sasiKind: null,
			supports: [],
			composes: [],
			mutatesVault: false,
			publishable: false,
			published: false,
		},
	}));

	context.out.push(filesNode, valuesNode, ...simpleNodes);

	// 2. Kinds / Cells
	const cellKinds = [
		{ id: 'toggle', label: 'toggle', icon: 'lucide-toggle-right' },
		{ id: 'action', label: 'action', icon: 'lucide-zap' },
		{ id: 'text', label: 'text', icon: 'lucide-type' },
		{ id: 'hover', label: 'hover', icon: 'lucide-mouse-pointer' },
		{ id: 'badge', label: 'badge', icon: 'lucide-badge' },
		{ id: 'counter', label: 'counter', icon: 'lucide-hash' },
		{ id: 'dot', label: 'dot', icon: 'lucide-circle-dot' },
	];
	for (const cell of cellKinds) {
		context.out.push({
			id: `sasi:kind:cells:${cell.id}`,
			label: cell.label,
			icon: cell.icon,
			typeText: 'cell_kind',
			depth: 1,
			meta: {
				identityKind: 'node_kinds',
				urn: apiSceneUrnFor(`kind:cells:${cell.id}`, cell.label, 'node_kinds'),
				group: 'kind',
				subgroup: 'kind.cells',
				sasiId: `cell:${cell.id}`,
				labelKey: cell.label,
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
				publishable: false,
				published: false,
			},
		});
	}

	// 3. Kinds / Surfaces
	const surfaceKinds = [
		{ id: 'panelWidget', label: 'panelWidget', icon: 'lucide-panel-top' },
		{ id: 'files', label: 'files', icon: 'lucide-folder' },
		{ id: 'props', label: 'props', icon: 'lucide-archive' },
		{ id: 'tags', label: 'tags', icon: 'lucide-tag' },
		{ id: 'snippets', label: 'snippets', icon: 'lucide-file-code' },
		{ id: 'plugins', label: 'plugins', icon: 'lucide-plug' },
		{ id: 'left-sidebar', label: 'left-sidebar', icon: 'lucide-panel-left' },
		{ id: 'right-sidebar', label: 'right-sidebar', icon: 'lucide-panel-right' },
		{ id: 'main', label: 'main', icon: 'lucide-layout-template' },
	];
	for (const surface of surfaceKinds) {
		context.out.push({
			id: `sasi:kind:surfaces:${surface.id}`,
			label: surface.label,
			icon: surface.icon,
			typeText: 'surface_kind',
			depth: 1,
			meta: {
				identityKind: 'node_kinds',
				urn: apiSceneUrnFor(`kind:surfaces:${surface.id}`, surface.label, 'node_kinds'),
				group: 'kind',
				subgroup: 'kind.surfaces',
				sasiId: `surface:${surface.id}`,
				labelKey: surface.label,
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
				publishable: false,
				published: false,
			},
		});
	}

	// 4. Kinds / Sorts
	const sortKinds = [
		{ id: 'alpha', label: 'alpha', icon: 'lucide-arrow-down-a-z' },
		{ id: 'time', label: 'time', icon: 'lucide-clock' },
		{ id: 'size', label: 'size', icon: 'lucide-hard-drive' },
		{ id: 'count', label: 'count', icon: 'lucide-hash' },
		{ id: 'custom', label: 'custom', icon: 'lucide-sliders' },
	];
	for (const sort of sortKinds) {
		context.out.push({
			id: `sasi:kind:sorts:${sort.id}`,
			label: sort.label,
			icon: sort.icon,
			typeText: 'sort_kind',
			depth: 1,
			meta: {
				identityKind: 'node_kinds',
				urn: apiSceneUrnFor(`kind:sorts:${sort.id}`, sort.label, 'node_kinds'),
				group: 'kind',
				subgroup: 'kind.sorts',
				sasiId: `sort:${sort.id}`,
				labelKey: sort.label,
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
				publishable: false,
				published: false,
			},
		});
	}

	// 5. Kinds / Groups
	const groupKinds = [
		{ id: 'custom', label: 'custom', icon: 'lucide-users' },
		{ id: 'sections', label: 'sections', icon: 'lucide-layers' },
		{ id: 'preset', label: 'preset', icon: 'lucide-bookmark' },
	];
	for (const group of groupKinds) {
		context.out.push({
			id: `sasi:kind:groups:${group.id}`,
			label: group.label,
			icon: group.icon,
			typeText: 'group_kind',
			depth: 1,
			meta: {
				identityKind: 'node_kinds',
				urn: apiSceneUrnFor(`kind:groups:${group.id}`, group.label, 'node_kinds'),
				group: 'kind',
				subgroup: 'kind.groups',
				sasiId: `group:${group.id}`,
				labelKey: group.label,
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
				publishable: false,
				published: false,
			},
		});
	}
}

function appendScopeSubgroups(
	context: NodeBuildContext,
	instances: InstanceRegistryData | undefined,
	registry: SasiRegistry,
): void {
	// 1. Scopes / Workspace
	const workspaceScopes = [
		{
			id: 'workspace:all',
			labelKey: 'sasi.scope.workspace_all',
			icon: 'lucide-globe',
		},
		{
			id: 'workspace:last_focused',
			labelKey: 'sasi.scope.last_focused',
			icon: 'lucide-crosshair',
		},
		{
			id: 'scene:depth_scope',
			labelKey: 'sasi.scope.depth_scope',
			icon: 'lucide-layers',
		},
	];
	for (const sc of workspaceScopes) {
		context.out.push({
			id: `sasi:scope:workspace:${sc.id}`,
			label: sc.labelKey,
			icon: sc.icon,
			typeText: 'scope',
			depth: 1,
			meta: {
				identityKind: 'node_scopes',
				urn: apiSceneUrnFor(`scope:workspace:${sc.id}`, sc.id, 'node_scopes'),
				group: 'scope',
				subgroup: 'scope.workspace',
				sasiId: sc.id,
				labelKey: sc.labelKey,
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
				publishable: false,
				published: false,
			},
		});
	}

	// 2. Scopes / Instances
	const records = Object.values(instances?.instances ?? {}).sort((a, b) =>
		a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
	);
	for (const record of records) {
		const displayName = record.cell_name ? `${record.cell_name} (${record.id})` : record.id;
		context.out.push({
			id: `sasi:scope:instances:${record.id}`,
			label: `instance: ${displayName}`,
			icon: 'lucide-app-window',
			typeText: 'scope',
			depth: 1,
			meta: {
				identityKind: 'node_scopes',
				urn: apiSceneUrnFor(`scope:instances:${record.id}`, record.id, 'node_scopes'),
				group: 'scope',
				subgroup: 'scope.instances',
				sasiId: `instance:${record.id}`,
				labelKey: `instance: ${displayName}`,
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
				publishable: false,
				published: false,
				cell_name: record.cell_name,
			},
		});
	}

	// 3. Scopes / Surfaces
	const surfaces = registry.list('surface');
	for (const surface of surfaces) {
		context.out.push({
			id: `sasi:scope:surfaces:${surface.id}`,
			label: surface.labelKey,
			icon: surface.icon ?? 'lucide-layout-template',
			typeText: 'scope',
			depth: 1,
			meta: {
				identityKind: 'node_scopes',
				urn: apiSceneUrnFor(`scope:surfaces:${surface.id}`, surface.id, 'node_scopes'),
				group: 'scope',
				subgroup: 'scope.surfaces',
				sasiId: `surface:${surface.id}`,
				labelKey: surface.labelKey,
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
				publishable: false,
				published: false,
			},
		});
	}

	// 4. Scopes / Scenes
	for (const tab of [...API_SCENE_TABS, 'apiscene']) {
		context.out.push({
			id: `sasi:scope:scenes:${tab}`,
			label: `sasi.scene.goto.${tab}`,
			icon: 'lucide-layers',
			typeText: 'scope',
			depth: 1,
			meta: {
				identityKind: 'node_scopes',
				urn: apiSceneUrnFor(`scope:scenes:${tab}`, tab, 'node_scopes'),
				group: 'scope',
				subgroup: 'scope.scenes',
				sasiId: `scene:${tab}`,
				labelKey: `sasi.scene.goto.${tab}`,
				sasiKind: null,
				supports: [],
				composes: [],
				mutatesVault: false,
				publishable: false,
				published: false,
			},
		});
	}
}

export interface BuildApiSceneNodesOptions {
	customCommands?: Record<
		string,
		{ id: string; name: string; composes: readonly string[]; scope?: string }
	>;
	customScopes?: Record<string, string>;
	customNames?: Record<string, string>;
	providedCommands?: readonly { id: string; name: string; icon?: string }[];
	communityPluginNames?: Record<string, string>;
}

export function buildApiSceneNodes(
	registry: SasiRegistry,
	publisher?: ApiScenePublisherView,
	instances?: InstanceRegistryData,
	options: BuildApiSceneNodesOptions = {},
): readonly TreeNode<ApiSceneNodeMeta>[] {
	const snapshot = publisher?.snapshot() ?? [];
	const snapshotIds = new Set(snapshot.map((entry) => entry.id));
	const out: TreeNode<ApiSceneNodeMeta>[] = [];
	const context: NodeBuildContext = {
		out,
		publisher,
		snapshotIds,
	};

	appendFunctionNodes(context, registry.listActions(), 'action');
	appendFunctionNodes(context, registry.listOperations(), 'operation');
	appendApiSceneCommandNodes({
		...context,
		registryCommands: registry.listCommands(),
		publisherEntries: snapshot,
		customCommands: options.customCommands,
		customScopes: options.customScopes,
		customNames: options.customNames,
		providedCommands: options.providedCommands,
		communityPluginNames: options.communityPluginNames,
	});
	appendAxisNodes(context, registry.list('kind'), 'kind');
	appendKindSubgroups(context);
	appendAxisNodes(context, registry.list('provider'), 'provider');
	appendInstanceNodes(context, instances);
	appendSceneNodes(context, registry);
	appendAxisNodes(context, registry.list('surface'), 'surface');
	appendScopeSubgroups(context, instances, registry);

	return out;
}
