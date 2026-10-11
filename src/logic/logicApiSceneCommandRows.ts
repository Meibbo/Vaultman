import type { SasiDef } from './logicSasiRegistry';
import {
	API_SCENE_IDENTITY_KIND,
	apiSceneUrnFor,
	type ApiSceneNodeMeta,
	type ApiScenePublisherEntry,
	type ApiScenePublisherView,
} from './logicApiSceneModel';
import { toApiSceneNode } from './logicApiSceneNodeFactory';
import type { TreeNode } from '../types/typeTree';

interface CommandNodeContext {
	out: TreeNode<ApiSceneNodeMeta>[];
	publisher: ApiScenePublisherView | undefined;
	snapshotIds: ReadonlySet<string>;
	customScopes?: Record<string, string>;
	customNames?: Record<string, string>;
}

interface CommandNodeSpec {
	id: string;
	label: string;
	groupKind: 'command.default' | 'command.custom';
	supports: readonly string[];
	composes: readonly string[];
	icon?: string;
}

const COMMAND_ACTIONS_MAP: Record<string, readonly string[]> = {
	'apply-queue': ['vaultman.queue.execute'],
	open: ['vaultman.workspace.activate'],
	'open-updates': ['vaultman.updates.open'],
	'focus-content-search': ['vaultman.search.focus-content'],
	'focus-active-explorer-search': ['vaultman.search.focus-explorer'],
	'sasi.hover.left-sidebar.hover': ['vaultman.hover.left-sidebar.hover'],
	'sasi.hover.left-sidebar.pin': ['vaultman.hover.left-sidebar.pin'],
	'sasi.hover.left-sidebar.hide': ['vaultman.hover.left-sidebar.hide'],
	'sasi.hover.right-sidebar.hover': ['vaultman.hover.right-sidebar.hover'],
	'sasi.hover.right-sidebar.pin': ['vaultman.hover.right-sidebar.pin'],
	'sasi.hover.right-sidebar.hide': ['vaultman.hover.right-sidebar.hide'],
	'sasi.hover.main.hover': ['vaultman.hover.main.hover'],
	'sasi.hover.main.pin': ['vaultman.hover.main.pin'],
	'sasi.hover.main.hide': ['vaultman.hover.main.hide'],
	'sasi.hover.lock': ['vaultman.hover.lock'],
	'sasi.hover.nested-ribbon': ['vaultman.hover.nested-ribbon'],
	'open-settings': ['vaultman.settings.open'],
	'reveal-active-file': ['reveal-active-file'],
	'toggle-expansion': ['toggle-expansion'],
	searchbox: ['searchbox'],
	'cycle-category': ['cycle-category'],
	'create-target': ['create-target'],
	check_plugin_updates: ['check_plugin_updates'],
	update_all_plugins: ['update_all_plugins'],
	browse_community_plugins: ['browse_community_plugins'],
	open_restricted_mode: ['open_restricted_mode'],
	go_to_setting_scene: ['vaultman.scene.goto.plugins'],
	'props.add_property': [
		'vaultman.scene.goto.props',
		'reveal-active-file',
		'props.add_property',
	],
	'open-filter-scene': ['vaultman.scene.goto.files'],
	'open-queue': ['vaultman.queue.open'],
	'open-api-scene': ['vaultman.scene.goto.apiscene'],
	'vaultman.scene.goto.apiscene': ['vaultman.scene.goto.apiscene'],
	'vaultman.scene.goto.files': ['vaultman.scene.goto.files'],
	'vaultman.scene.goto.props': ['vaultman.scene.goto.props'],
	'vaultman.scene.goto.tags': ['vaultman.scene.goto.tags'],
	'vaultman.scene.goto.content': ['vaultman.scene.goto.content'],
	'vaultman.scene.goto.snippets': ['vaultman.scene.goto.snippets'],
	'vaultman.scene.goto.plugins': ['vaultman.scene.goto.plugins'],
	'change-engine-tree': ['vaultman.scene.engine.tree'],
	'change-engine-cards': ['vaultman.scene.engine.cards'],
	'change-engine-table': ['vaultman.scene.engine.table'],
};

const COMMAND_SCOPE_MAP: Record<string, string> = {
	'apply-queue': 'workspace:all',
	open: 'workspace:last_focused',
	'open-updates': 'workspace:all',
	'focus-content-search': 'workspace:last_focused',
	'focus-active-explorer-search': 'workspace:last_focused',
	'sasi.hover.left-sidebar.hover': 'surface:left-sidebar',
	'sasi.hover.left-sidebar.pin': 'surface:left-sidebar',
	'sasi.hover.left-sidebar.hide': 'surface:left-sidebar',
	'sasi.hover.right-sidebar.hover': 'surface:right-sidebar',
	'sasi.hover.right-sidebar.pin': 'surface:right-sidebar',
	'sasi.hover.right-sidebar.hide': 'surface:right-sidebar',
	'sasi.hover.main.hover': 'surface:main',
	'sasi.hover.main.pin': 'surface:main',
	'sasi.hover.main.hide': 'surface:main',
	'sasi.hover.lock': 'workspace:all',
	'sasi.hover.nested-ribbon': 'workspace:all',
	'open-settings': 'workspace:all',
	'reveal-active-file': 'scene:depth_scope',
	'toggle-expansion': 'scene:depth_scope',
	searchbox: 'scene:depth_scope',
	'cycle-category': 'workspace:last_focused',
	'create-target': 'workspace:last_focused',
	check_plugin_updates: 'workspace:all',
	update_all_plugins: 'workspace:all',
	browse_community_plugins: 'workspace:all',
	open_restricted_mode: 'workspace:all',
	go_to_setting_scene: 'workspace:last_focused',
	'props.add_property': 'workspace:last_focused',
	'open-filter-scene': 'workspace:last_focused',
	'open-queue': 'workspace:all',
	'open-api-scene': 'workspace:all',
	'vaultman.scene.goto.apiscene': 'workspace:last_focused',
	'vaultman.scene.goto.files': 'workspace:last_focused',
	'vaultman.scene.goto.props': 'workspace:last_focused',
	'vaultman.scene.goto.tags': 'workspace:last_focused',
	'vaultman.scene.goto.content': 'workspace:last_focused',
	'vaultman.scene.goto.snippets': 'workspace:last_focused',
	'vaultman.scene.goto.plugins': 'workspace:last_focused',
	'change-engine-tree': 'last_focused-scene, +, last_focused-instance',
	'change-engine-cards': 'last_focused-scene, +, last_focused-instance',
	'change-engine-table': 'last_focused-scene, +, last_focused-instance',
};

function resolveScopeForCommand(
	id: string,
	customScopes?: Record<string, string>,
): string {
	if (customScopes && customScopes[id]) return customScopes[id];
	if (COMMAND_SCOPE_MAP[id]) return COMMAND_SCOPE_MAP[id];
	if (id.startsWith('sasi.hover.')) {
		const parts = id.split('.');
		return parts[2] ? 'surface:' + parts[2] : 'workspace:all';
	}
	if (id.startsWith('change-engine-')) {
		return 'last_focused-scene, +, last_focused-instance';
	}
	if (id.startsWith('vaultman.scene.goto.')) {
		return 'workspace:last_focused';
	}
	return 'workspace:last_focused';
}

function appendCompoundCommandNode(
	context: CommandNodeContext,
	spec: CommandNodeSpec,
): void {
	const cmdScope = resolveScopeForCommand(spec.id, context.customScopes);
	const actionIds =
		spec.composes && spec.composes.length > 0
			? spec.composes
			: COMMAND_ACTIONS_MAP[spec.id] ?? [spec.id];

	const actionChildren: TreeNode<ApiSceneNodeMeta>[] = actionIds.map(
		(actionId) => ({
			id: `sasi:command:${spec.id}:action:${actionId}`,
			label: actionId,
			icon: 'lucide-zap',
			typeText: 'action',
			depth: 2,
			meta: {
				identityKind: API_SCENE_IDENTITY_KIND,
				urn: apiSceneUrnFor(`command:${spec.id}:action:${actionId}`, actionId),
				group: 'action',
				sasiId: actionId,
				labelKey: actionId,
				sasiKind: 'action',
				supports: [],
				composes: [],
				mutatesVault: false,
				publishable: false,
				published: false,
				commandId: spec.id,
			},
		}),
	);

	const actionsGroupNode: TreeNode<ApiSceneNodeMeta> = {
		id: `sasi:command:${spec.id}:group:actions`,
		label: 'sasi.apiscene.command.actions_group',
		icon: 'lucide-folder',
		typeText: 'node_group',
		depth: 1,
		showCaret: actionChildren.length > 0,
		children: actionChildren,
		meta: {
			identityKind: API_SCENE_IDENTITY_KIND,
			urn: apiSceneUrnFor(`command:${spec.id}:group:actions`, 'actions'),
			group: 'action',
			sasiId: `${spec.id}:actions`,
			labelKey: 'sasi.apiscene.command.actions_group',
			sasiKind: null,
			supports: [],
			composes: actionIds,
			mutatesVault: false,
			publishable: false,
			published: false,
			commandId: spec.id,
		},
	};

	const scopeChildNode: TreeNode<ApiSceneNodeMeta> = {
		id: `sasi:command:${spec.id}:scope:${cmdScope}`,
		label: `scope: ${cmdScope}`,
		icon: 'lucide-crosshair',
		typeText: 'scope',
		depth: 2,
		meta: {
			identityKind: API_SCENE_IDENTITY_KIND,
			urn: apiSceneUrnFor(`command:${spec.id}:scope:${cmdScope}`, cmdScope),
			group: 'scope',
			sasiId: cmdScope,
			labelKey: cmdScope,
			sasiKind: null,
			supports: [],
			composes: [],
			mutatesVault: false,
			publishable: false,
			published: false,
			commandId: spec.id,
		},
	};

	const scopeGroupNode: TreeNode<ApiSceneNodeMeta> = {
		id: `sasi:command:${spec.id}:group:scope`,
		label: 'sasi.apiscene.command.scope_group',
		icon: 'lucide-folder',
		typeText: 'node_group',
		depth: 1,
		showCaret: true,
		children: [scopeChildNode],
		meta: {
			identityKind: API_SCENE_IDENTITY_KIND,
			urn: apiSceneUrnFor(`command:${spec.id}:group:scope`, 'scope'),
			group: 'scope',
			sasiId: `${spec.id}:scope`,
			labelKey: 'sasi.apiscene.command.scope_group',
			sasiKind: null,
			supports: [],
			composes: [],
			mutatesVault: false,
			publishable: false,
			published: false,
			commandId: spec.id,
		},
	};

	const displayName =
		context.customNames?.[spec.id] ?? spec.label;

	const node = toApiSceneNode({
		spec: {
			group: 'command',
			rowId: `sasi:command:${spec.id}`,
			canonicalId: `command:${spec.id}`,
			sasiId: spec.id,
			label: displayName,
			labelKey: spec.label,
			...(spec.icon ? { icon: spec.icon } : {}),
			sasiKind: 'command',
			supports: spec.supports,
			composes: spec.composes,
			mutatesVault: false,
		},
		publisher: context.publisher,
		snapshotIds: context.snapshotIds,
		isCommand: true,
	});

	node.children = [actionsGroupNode, scopeGroupNode];
	node.showCaret = true;
	node.meta.commandId = spec.id;
	node.meta.subgroup = spec.groupKind;
	context.out.push(node);
}

function appendProvidedCommandNode(
	context: CommandNodeContext,
	cmd: { id: string; name: string; icon?: string },
): void {
	const displayName = context.customNames?.[cmd.id] ?? cmd.name;
	const node = toApiSceneNode({
		spec: {
			group: 'command',
			rowId: `sasi:command:provided:${cmd.id}`,
			canonicalId: `command:${cmd.id}`,
			sasiId: cmd.id,
			label: displayName,
			labelKey: displayName,
			icon: cmd.icon ?? 'lucide-terminal',
			sasiKind: 'command',
			supports: [],
			composes: [],
			mutatesVault: false,
		},
		publisher: context.publisher,
		snapshotIds: context.snapshotIds,
		isCommand: true,
	});

	node.showCaret = false;
	node.children = undefined;
	node.meta.commandId = cmd.id;
	node.meta.subgroup = 'command.provided';
	context.out.push(node);
}

export interface ApiSceneCommandRowsInput {
	out: TreeNode<ApiSceneNodeMeta>[];
	registryCommands: readonly SasiDef[];
	publisherEntries: readonly ApiScenePublisherEntry[];
	publisher: ApiScenePublisherView | undefined;
	snapshotIds: ReadonlySet<string>;
	customCommands?: Record<
		string,
		{ id: string; name: string; composes: readonly string[]; scope?: string }
	>;
	customScopes?: Record<string, string>;
	customNames?: Record<string, string>;
	providedCommands?: readonly { id: string; name: string; icon?: string }[];
}

export function appendApiSceneCommandNodes({
	out,
	registryCommands,
	publisherEntries,
	publisher,
	snapshotIds,
	customCommands = {},
	customScopes = {},
	customNames = {},
	providedCommands = [],
}: ApiSceneCommandRowsInput): void {
	const descriptors = new Map(
		publisherEntries.map((entry) => [entry.id, entry] as const),
	);
	const projectedIds = new Set<string>();
	const context: CommandNodeContext = {
		out,
		publisher,
		snapshotIds,
		customScopes,
		customNames,
	};

	// 1. Vaultman Default Commands
	for (const def of registryCommands) {
		if (customCommands[def.id]) continue;
		const descriptor = descriptors.get(def.id);
		projectedIds.add(def.id);
		appendCompoundCommandNode(context, {
			id: def.id,
			label: descriptor?.descriptor?.name ?? def.labelKey,
			groupKind: 'command.default',
			supports: def.supports.map((support) => support.surface),
			composes: def.composes ?? [],
			...(def.icon ? { icon: def.icon } : {}),
		});
	}

	for (const entry of publisherEntries) {
		if (projectedIds.has(entry.id) || customCommands[entry.id]) continue;
		// Skip per-surface legacy engine commands
		if (entry.id.startsWith('sasi.scene.engine.')) continue;
		projectedIds.add(entry.id);
		appendCompoundCommandNode(context, {
			id: entry.id,
			label: entry.descriptor?.name ?? entry.id,
			groupKind: 'command.default',
			supports: [],
			composes:
				(entry.descriptor as { composes?: readonly string[] } | undefined)
					?.composes ?? [],
		});
	}

	// 2. Custom Commands
	for (const customCmd of Object.values(customCommands)) {
		projectedIds.add(customCmd.id);
		appendCompoundCommandNode(context, {
			id: customCmd.id,
			label: customCmd.name,
			groupKind: 'command.custom',
			supports: [],
			composes: customCmd.composes ?? [],
			icon: 'lucide-sparkles',
		});
	}

	// 3. Provided Commands (Obsidian palette commands excluding vaultman/custom)
	for (const prov of providedCommands) {
		if (projectedIds.has(prov.id)) continue;
		projectedIds.add(prov.id);
		appendProvidedCommandNode(context, prov);
	}
}
